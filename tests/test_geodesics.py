#!/usr/bin/env python3
"""
Tests for the dome generators: Acidome subdivision methods, egg shapes and the flat method

The Acidome vectors come from live acidome.com on a unit sphere. The flat-method
hashes in tests/data/ were taken from the generator before the Acidome methods were
added, so the default output must stay byte-identical.

Run with:  python3 tests/test_geodesics.py   (or pytest tests/)
"""

import contextlib
import hashlib
import io
import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT))

from domez.dome import GeodesicDome, edges_of, parse_partial, acidome_partials  # noqa: E402
from domez.shapes import EllipsoidalGeodesic, EggGeodesic  # noqa: E402

BASELINE = json.loads((HERE / 'data' / 'flat_method_sha256.json').read_text())


# ----------------------------------------------------------------------------- helpers

def mesh_stats(shape):
    """Hubs, struts, panels, strut types [(length, count)], and the hubs on the open edge."""
    pts = [v.to_tuple() for v in shape.vertices]
    tris = [[i - 1 for i in f] for f in shape.faces]
    edges = edges_of(tris)
    uses = {}
    for t in tris:
        for k in range(3):
            e = tuple(sorted((t[k], t[(k + 1) % 3])))
            uses[e] = uses.get(e, 0) + 1
    rim = sorted({i for e, n in uses.items() if n == 1 for i in e})
    lengths = sorted(math.dist(pts[a], pts[b]) for a, b in edges)
    groups = []  # a new type starts when a length exceeds its group's shortest by more than 1e-6
    for l in lengths:
        if not groups or l - groups[-1][0] > 1e-6:
            groups.append([l, 0, 0.0])
        groups[-1][1] += 1
        groups[-1][2] += l
    types = [(total / count, count) for _, count, total in groups]
    return {'hubs': len(pts), 'struts': len(edges), 'panels': len(tris), 'types': types,
            'rim_z': [pts[i][2] for i in rim], 'min_z': min(p[2] for p in pts)}


def unit_dome(frequency, method, partial=1.0, **kw):
    return GeodesicDome(frequency=frequency, radius=1.0, method=method, **kw).generate().cut_to_partial(partial)


def check_counts(stats, hubs, struts, panels):
    got = (stats['hubs'], stats['struts'], stats['panels'])
    assert got == (hubs, struts, panels), f"hubs/struts/panels {got}, expected {(hubs, struts, panels)}"


def check_lengths(stats, expected):
    got = stats['types']
    assert len(got) == len(expected), f"{len(got)} strut types, expected {len(expected)}: {got}"
    for (length, count), (want_len, want_count) in zip(got, expected):
        assert count == want_count and abs(length - want_len) <= 5e-7 + 1e-9, \
            f"strut {length:.6f}x{count}, expected {want_len:.6f}x{want_count}"


def check_flat_base(stats, height):
    assert abs(stats['min_z'] - height) <= 5e-7 + 1e-9, f"base at {stats['min_z']:.6f}, expected {height}"
    spread = max(stats['rim_z']) - min(stats['rim_z'])
    assert spread < 1e-9, f"open-edge hubs span {spread:.3g} in height, expected one level"


def obj_bytes(shape):
    path = Path(tempfile.mkdtemp()) / 'shape.obj'
    with contextlib.redirect_stdout(io.StringIO()):
        shape.to_obj(path)
    return path.read_bytes()


def sha256(data):
    return hashlib.sha256(data).hexdigest()


# ----------------------------------------------------------------------------- acidome.com vectors

def test_acidome_3v_chords_full():
    s = mesh_stats(unit_dome(3, 'chords'))
    check_counts(s, 92, 270, 180)
    check_lengths(s, [(0.348615, 60), (0.403548, 90), (0.412411, 120)])


def test_acidome_3v_kruschke_7_12_pentad():
    s = mesh_stats(unit_dome(3, 'kruschke', 7/12, symmetry='pentad'))
    check_counts(s, 61, 165, 105)
    check_lengths(s, [(0.329706, 30), (0.382290, 35), (0.421489, 80), (0.441056, 20)])


def test_acidome_4v_mexican_full():
    s = mesh_stats(unit_dome(4, 'mexican'))
    check_counts(s, 162, 480, 320)
    check_lengths(s, [(0.275910, 120), (0.298308, 180), (0.313232, 120), (0.321251, 60)])


def test_acidome_4v_chords_5_8_flattened():
    s = mesh_stats(unit_dome(4, 'chords', 5/8, flat_base=True))
    check_counts(s, 111, 310, 200)
    assert len(s['types']) == 10, f"{len(s['types'])} strut types, expected 10"
    check_flat_base(s, -0.251148)


def test_acidome_octahedron_4v_chords_1_2():
    s = mesh_stats(unit_dome(4, 'chords', 1/2, base='octahedron'))
    check_counts(s, 41, 104, 64)


def test_acidome_5v_arcs_3_4_flattened():
    s = mesh_stats(unit_dome(5, 'arcs', 3/4, flat_base=True))
    check_counts(s, 201, 575, 375)
    assert len(s['types']) == 14, f"{len(s['types'])} strut types, expected 14"
    check_flat_base(s, -0.447214)


# ----------------------------------------------------------------------------- flat method unchanged

def test_flat_method_byte_identical():
    """GeodesicDome and EllipsoidalGeodesic defaults write exactly what they wrote before."""
    changed = []
    for key, want in BASELINE['api'].items():
        kind, base, f, *rest = key.split()
        if kind == 'dome':
            r, part = float(rest[0]), float(rest[1])
            shape = GeodesicDome(frequency=int(f), radius=r, base=base)
            shape.generate()
            shape.cut_to_partial(part)
        else:
            rx, ry, rz = map(float, rest)
            shape = EllipsoidalGeodesic(int(f), rx, ry, rz, base=base)
            shape.generate()
        if sha256(obj_bytes(shape)) != want:
            changed.append(key)
    assert not changed, f"{len(changed)} flat-method outputs changed, e.g. {changed[:3]}"


def test_flat_method_cli_byte_identical():
    """The command line writes the same files, under the same names, as before."""
    for args, want in BASELINE['cli'].items():
        out = Path(tempfile.mkdtemp())
        subprocess.run([sys.executable, '-m', 'domez', 'dome', *args.split(), '--output-dir', str(out)],
                       check=True, capture_output=True, cwd=ROOT)
        got = {p.name: sha256(p.read_bytes()) for p in sorted(out.glob('*.obj'))}
        assert got == want, f"domez dome {args}: wrote {sorted(got)}, expected {sorted(want)} (or contents differ)"


def test_flat_native_symmetry_is_the_default():
    for base, native in (('icosahedron', 'cross'), ('octahedron', 'pentad')):
        a = GeodesicDome(4, 2.0, base).generate().cut_to_partial(0.5)
        b = GeodesicDome(4, 2.0, base, symmetry=native).generate().cut_to_partial(0.5)
        assert obj_bytes(a) == obj_bytes(b), f"explicit {native} differs from the default for {base}"


# ----------------------------------------------------------------------------- options

def test_turned_flat_grid():
    """Pentad puts a 5-way hub on top; Triad puts a face on top."""
    d = GeodesicDome(3, 1.0, symmetry='pentad').generate()
    top = max(range(len(d.vertices)), key=lambda i: d.vertices[i].z)
    assert abs(d.vertices[top].z - 1) < 1e-12
    assert sum(1 for f in d.faces if top + 1 in f) == 5
    d = GeodesicDome(1, 1.0, symmetry='triad').generate()
    zs = sorted((v.z for v in d.vertices), reverse=True)
    assert abs(zs[0] - zs[2]) < 1e-12 and zs[2] - zs[3] > 0.1, "expected three hubs level on top"


def test_partial_snaps_to_acidome_rows():
    assert unit_dome(3, 'chords', 0.6).partial == 7/12
    assert unit_dome(4, 'chords', 0.45, base='octahedron').partial == 1/2
    assert unit_dome(3, 'arcs', 1.0).partial == 1.0
    assert GeodesicDome(3, 1.0).generate().cut_to_partial(0.6).partial == 0.6  # flat takes any value
    assert [str(f) for f in acidome_partials('icosahedron', 4)] == ['1/4', '3/8', '1/2', '5/8', '3/4', '1']


def test_kruschke_falls_back_to_chords():
    for f, base in ((5, 'icosahedron'), (3, 'octahedron')):
        k = GeodesicDome(f, 1.0, base, method='kruschke').generate()
        c = GeodesicDome(f, 1.0, base, method='chords').generate()
        assert k.effective_method == 'chords'
        assert [v.to_tuple() for v in k.vertices] == [v.to_tuple() for v in c.vertices]


def test_faces_point_outward():
    for method in ('chords', 'arcs', 'mexican', 'kruschke'):
        for sym in ('pentad', 'cross', 'triad'):
            d = unit_dome(3, method, 0.75, symmetry=sym)
            P = [v.to_tuple() for v in d.vertices]
            for a, b, c in d.faces:
                A, B, C = P[a - 1], P[b - 1], P[c - 1]
                n = [(B[1] - A[1]) * (C[2] - A[2]) - (B[2] - A[2]) * (C[1] - A[1]),
                     (B[2] - A[2]) * (C[0] - A[0]) - (B[0] - A[0]) * (C[2] - A[2]),
                     (B[0] - A[0]) * (C[1] - A[1]) - (B[1] - A[1]) * (C[0] - A[0])]
                assert sum(n[k] * (A[k] + B[k] + C[k]) for k in range(3)) > 0, f"{method} {sym}: inward face"


def test_parse_partial():
    assert parse_partial('7/12') == 7/12
    assert parse_partial('0.583') == 0.583
    assert parse_partial('1') == 1.0


# ----------------------------------------------------------------------------- shapes

def test_egg_follows_hugelschaffer_profile():
    L, B, a = 6.0, 4.4, 0.08
    w = a * L
    egg = EggGeodesic(4, L, B, a, method='chords').generate()
    zs = [v.z for v in egg.vertices]
    assert abs(max(zs) - L / 2) < 1e-12 and abs(min(zs) + L / 2) < 1e-12
    for v in egg.vertices:
        t = v.z  # squared radii, as the square root is ill-conditioned at the poles
        r2 = (B / 2) ** 2 * (L * L - 4 * t * t) / (L * L + 8 * w * t + 4 * w * w)
        assert abs(v.x * v.x + v.y * v.y - r2) < 1e-9, f"hub at t={t:.3f} is off the egg"
    # Pointed end up: narrower at +L/4 than at -L/4
    def width(t):
        return (B / 2) * math.sqrt((L * L - 4 * t * t) / (L * L + 8 * w * t + 4 * w * w))
    assert width(L / 4) < width(-L / 4)


def test_egg_asymmetry_sign_flips_the_point():
    up = EggGeodesic(3, 6.0, 4.4, 0.1).generate()
    down = EggGeodesic(3, 6.0, 4.4, -0.1).generate()
    key = lambda p: tuple(round(c, 9) + 0.0 for c in p)
    mirrored = sorted(key((v.x, v.y, -v.z)) for v in up.vertices)
    assert mirrored == sorted(key(v.to_tuple()) for v in down.vertices)


def test_egg_without_asymmetry_is_an_ellipsoid():
    egg = EggGeodesic(3, 6.0, 4.4, 0.0).generate()
    ell = EllipsoidalGeodesic(3, 2.2, 2.2, 3.0).generate()
    assert egg.faces == ell.faces
    for p, q in zip(egg.vertices, ell.vertices):
        assert max(abs(a - b) for a, b in zip(p.to_tuple(), q.to_tuple())) < 1e-12


def test_egg_partial_method_and_flat_base():
    s = mesh_stats(EggGeodesic(3, 6.0, 4.4, 0.08, partial=7/12, method='kruschke').generate())
    check_counts(s, 61, 165, 105)
    s = mesh_stats(EggGeodesic(4, 6.0, 4.4, 0.08, partial=5/8, method='chords', flat_base=True).generate())
    check_counts(s, 111, 310, 200)
    assert max(s['rim_z']) - min(s['rim_z']) < 1e-9, "egg dome base is not level"
    egg = EggGeodesic(3, 6.0, 4.4, 0.08, partial=0.5).generate()  # flat cut: hubs below it are dropped
    assert len(egg.vertices) == len({i for f in egg.faces for i in f})


def test_ellipsoid_partial_and_method():
    s = mesh_stats(EllipsoidalGeodesic(3, 3.0, 3.0, 4.5, partial=7/12, method='kruschke').generate())
    check_counts(s, 61, 165, 105)


def test_cli_acidome_options():
    out = Path(tempfile.mkdtemp())
    subprocess.run([sys.executable, '-m', 'domez', 'dome', '-f', '4', '-r', '1', '-p', '5/8',
                    '-m', 'chords', '--flat-base', '-o', 'dome.obj', '--output-dir', str(out)],
                   check=True, capture_output=True, cwd=ROOT)
    text = (out / 'dome.obj').read_text()
    assert text.count('\nv ') == 111 and text.count('\nf ') == 200
    assert '# Method: Chords (Acidome), symmetry: pentad' in text and '# Partial: 5/8, flattened base' in text


# ----------------------------------------------------------------------------- runner

def run_all_tests():
    tests = [(name, fn) for name, fn in globals().items() if name.startswith('test_') and callable(fn)]
    print("=" * 60)
    print("GEODESIC GENERATOR TEST SUITE")
    print("=" * 60)
    failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"  ✓ PASS {name}")
        except AssertionError as e:
            failed += 1
            print(f"  ✗ FAIL {name}: {e}")
    print("=" * 60)
    print(f"OVERALL: {len(tests) - failed}/{len(tests)} tests passed")
    print("=" * 60)
    return failed == 0


if __name__ == '__main__':
    sys.exit(0 if run_all_tests() else 1)
