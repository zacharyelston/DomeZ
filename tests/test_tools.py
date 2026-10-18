#!/usr/bin/env python3
"""
Tests for the command line and the smaller tools: polyhedra, the topology analyser, coplanar
merging, spec sheets and the SVG and PNG nets.

Run with:  python3 tests/test_tools.py   (or pytest tests/)
"""

import contextlib
import importlib.util
import io
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT))

from domez.polyhedra import PolyhedraGenerator  # noqa: E402
from domez.unfold import load_obj  # noqa: E402
from domez.smart_unfold import MeshAnalyzer, smart_unfold, is_strictly_convex  # noqa: E402
from domez.coplanar import merge_coplanar_triangles  # noqa: E402
from domez.spec_sheet import calculate_stats, create_spec_sheet  # noqa: E402
from domez import unfold_svg  # noqa: E402
from domez.__main__ import COMMANDS  # noqa: E402

HAVE_MATPLOTLIB = importlib.util.find_spec('matplotlib') is not None


def quiet(fn, *args, **kw):
    with contextlib.redirect_stdout(io.StringIO()):
        return fn(*args, **kw)


def solid(kind, frequency=1):
    """A polyhedron written to a temporary OBJ file, loaded back"""
    path = Path(tempfile.mkdtemp()) / f'{kind}.obj'
    quiet(PolyhedraGenerator(kind, frequency=frequency, radius=1.0).generate().to_obj, path)
    return path, *load_obj(path)


def run(*args, cwd=None):
    env = {**os.environ, 'PYTHONPATH': str(ROOT)}
    return subprocess.run([sys.executable, '-m', 'domez', *args], capture_output=True, text=True, cwd=cwd or tempfile.mkdtemp(), env=env)


# ----------------------------------------------------------------------------- command line

def test_cli_lists_every_command():
    out = run()
    assert out.returncode == 0
    for name in COMMANDS:
        assert name in out.stdout, f"{name} missing from usage"


def test_cli_rejects_unknown_commands():
    out = run('nope')
    assert out.returncode == 2 and "unknown command 'nope'" in out.stderr


def test_every_command_has_help():
    for name in COMMANDS:
        if name == 'unfold-plot' and not HAVE_MATPLOTLIB:
            continue
        where = tempfile.mkdtemp()
        out = run(name, '--help', cwd=where)
        assert out.returncode == 0, f"{name} --help failed: {out.stderr[-300:]}"
        assert 'usage' in out.stdout.lower(), f"{name} --help printed no usage"
        assert not os.listdir(where), f"{name} --help wrote files: {os.listdir(where)}"


def test_cli_pipeline_from_polyhedra_to_drawings():
    where = Path(tempfile.mkdtemp())
    assert run('polyhedra', '-t', 'all', '-o', 'solids', cwd=where).returncode == 0
    objs = sorted((where / 'solids').glob('*.obj'))
    assert len(objs) == 6
    assert run('spec-sheets', '-i', 'solids', '-o', 'sheets', cwd=where).returncode == 0
    assert len(list((where / 'sheets').glob('*.svg'))) == len(objs)
    assert run('unfold-svg', '-i', 'solids', '-o', 'nets', cwd=where).returncode == 0
    assert len(list((where / 'nets').glob('*.svg'))) == len(objs)
    for command in ('unfold', 'smart-unfold'):
        out = run(command, '-i', 'solids', cwd=where)
        assert out.returncode == 0 and 'cube' in out.stdout, f"{command}: {out.stderr[-300:]}"


# ----------------------------------------------------------------------------- polyhedra

def test_polyhedra_counts_and_euler():
    expected = {  # vertices, edges, faces (triangulated), Euler characteristic
        'tetrahedron': (4, 6, 4, 2), 'cube': (8, 18, 12, 2), 'octahedron': (6, 12, 8, 2),
        'dodecahedron': (20, 54, 36, 2), 'icosahedron': (12, 30, 20, 2),
        'stella_octangula': (8, 12, 8, 4),          # two separate tetrahedra
    }
    for kind, want in expected.items():
        _, vertices, faces = solid(kind)
        s = calculate_stats(vertices, faces)
        assert (s['vertices'], s['edges'], s['faces'], s['euler']) == want, f"{kind}: {s}"
        assert np.allclose(np.linalg.norm(vertices, axis=1), 1.0), f"{kind} vertices are not on the unit sphere"


def test_subdivided_icosahedron():
    _, vertices, faces = solid('icosahedron', 3)
    assert (len(vertices), len(faces)) == (92, 180)


# ----------------------------------------------------------------------------- topology and merging

def test_topology_analysis():
    for kind, topology in [('icosahedron', 'pure_triangular'), ('cube', 'triangulated_quads'), ('tetrahedron', 'pure_triangular')]:
        _, vertices, faces = solid(kind)
        analysis = MeshAnalyzer(vertices, faces).analyze()
        assert analysis['topology_type'] == topology, f"{kind}: {analysis['topology_type']}"
    _, vertices, faces = solid('cube')
    assert len(MeshAnalyzer(vertices, faces).analyze()['coplanar_pairs']) == 6


def test_coplanar_merge_makes_convex_quads_and_maps_every_face():
    _, vertices, faces = solid('cube')
    new_faces, mapping = quiet(merge_coplanar_triangles, vertices, faces)
    assert len(new_faces) == 6 and all(len(f) == 4 for f in new_faces)
    assert all(is_strictly_convex(vertices[f]) for f in new_faces)
    assert sorted(mapping) == list(range(len(faces)))
    assert sorted(mapping.values()) == sorted([k for k in range(6)] * 2)
    # nothing to merge on an icosahedron
    _, vertices, faces = solid('icosahedron')
    new_faces, mapping = quiet(merge_coplanar_triangles, vertices, faces)
    assert new_faces == [list(f) for f in faces] and mapping == {i: i for i in range(len(faces))}


def test_convexity_check():
    square = np.array([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]], float)
    dart = np.array([[0, 0, 0], [2, 0, 0], [0.5, 0.5, 0], [0, 2, 0]], float)
    assert is_strictly_convex(square)
    assert not is_strictly_convex(dart)


def test_smart_unfold_places_every_face():
    for kind in ['cube', 'icosahedron', 'octahedron']:
        path, _, _ = solid(kind)
        unfolded, analysis = quiet(smart_unfold, path, verbose=False)
        assert len(unfolded) == analysis['unfolded_face_count'], f"{kind}: {len(unfolded)} of {analysis['unfolded_face_count']} placed"


# ----------------------------------------------------------------------------- drawings

def test_spec_sheet_svg():
    path, vertices, faces = solid('icosahedron')
    out = path.with_suffix('.svg')
    quiet(create_spec_sheet, path, out)
    svg = out.read_text()
    assert svg.startswith('<svg') and svg.rstrip().endswith('</svg>')
    assert svg.count('<polygon') >= len(faces)


def test_unfold_svg_draws_every_face():
    path, vertices, faces = solid('cube')
    out = path.with_name('net.svg')
    quiet(unfold_svg.visualize_unfold, path, out)
    svg = out.read_text()
    assert svg.startswith('<svg') and svg.count('<polygon') == len(faces)


def test_unfold_plot_png():
    if not HAVE_MATPLOTLIB:
        print('  (skipped: matplotlib is not installed)')
        return
    from domez import unfold_plot
    path, _, _ = solid('octahedron')
    out = path.with_name('net.png')
    quiet(unfold_plot.visualize_unfold, path, out)
    assert out.read_bytes()[:8] == b'\x89PNG\r\n\x1a\n'


if __name__ == '__main__':
    tests = [v for k, v in list(globals().items()) if k.startswith('test_') and callable(v)]
    passed = 0
    for t in tests:
        try:
            t()
            print(f"  ✓ PASS {t.__name__}")
            passed += 1
        except AssertionError as e:
            print(f"  ✗ FAIL {t.__name__}: {e}")
    print(f"OVERALL: {passed}/{len(tests)} tests passed")
    sys.exit(0 if passed == len(tests) else 1)
