#!/usr/bin/env python3
"""
The web viewer and the Python package build the same meshes, vertex for vertex and face for face.

The viewer's geometry (web/js/*.js) is run with Node; the test is skipped when Node isn't installed.

Run with:  python3 tests/test_viewer_parity.py   (or pytest tests/)
"""

import json
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT))

from domez.dome import GeodesicDome  # noqa: E402
from domez.shapes import EllipsoidalGeodesic, EggGeodesic  # noqa: E402

NODE = shutil.which('node')

# (viewer settings, the same design in Python)
CASES = [
    ({'method': 'flat', 'freq': 3, 'partial': '0.6', 'r': 2, 'sym': 'cross'},
     lambda: GeodesicDome(frequency=3, radius=2, method='flat').generate().cut_to_partial('0.6')),
    ({'method': 'flat', 'freq': 4, 'partial': '0.6', 'r': 2, 'sym': 'pentad', 'base': 'octahedron'},
     lambda: GeodesicDome(frequency=4, radius=2, method='flat', base='octahedron').generate().cut_to_partial('0.6')),
    ({'method': 'flat', 'freq': 4, 'partial': '0.7', 'r': 1, 'sym': 'cross', 'flat': True},
     lambda: GeodesicDome(frequency=4, radius=1, method='flat', flat_base=True).generate().cut_to_partial('0.7')),
    ({'method': 'chords', 'freq': 3, 'partial': '3/4', 'r': 3},
     lambda: GeodesicDome(frequency=3, radius=3, method='chords').generate().cut_to_partial('3/4')),
    ({'method': 'kruschke', 'freq': 3, 'partial': '7/12', 'r': 2.2},
     lambda: GeodesicDome(frequency=3, radius=2.2, method='kruschke').generate().cut_to_partial('7/12')),
    ({'method': 'arcs', 'freq': 5, 'partial': '3/4', 'r': 5, 'flat': True},
     lambda: GeodesicDome(frequency=5, radius=5, method='arcs', flat_base=True).generate().cut_to_partial('3/4')),
    ({'method': 'mexican', 'freq': 4, 'partial': '5/8', 'r': 4, 'sym': 'cross'},
     lambda: GeodesicDome(frequency=4, radius=4, method='mexican', symmetry='cross').generate().cut_to_partial('5/8')),
    ({'shape': 'ellipsoid', 'rx': 3, 'ry': 2.5, 'rz': 4.5, 'method': 'arcs', 'freq': 3, 'partial': '5/8'},
     lambda: EllipsoidalGeodesic(3, 3, 2.5, 4.5, partial='5/8', method='arcs').generate()),
    ({'shape': 'egg', 'eggL': 6, 'eggB': 4.4, 'eggW': 0.08, 'eggTip': 'up', 'method': 'chords', 'freq': 4, 'partial': '3/4'},
     lambda: EggGeodesic(4, length=6, breadth=4.4, asymmetry=0.08, partial='3/4', method='chords').generate()),
    ({'shape': 'egg', 'eggL': 7.8, 'eggB': 6, 'eggW': 0.12, 'eggTip': 'down', 'method': 'chords', 'freq': 3, 'partial': '3/4', 'flat': True},
     lambda: EggGeodesic(3, length=7.8, breadth=6, asymmetry=-0.12, partial='3/4', method='chords', flat_base=True).generate()),
]


def python_mesh(shape):
    """Vertices and faces as the viewer keeps them: only vertices some face uses, in their order."""
    pts = [v.to_tuple() for v in shape.vertices]
    tris = [[i - 1 for i in f] for f in shape.faces]
    used = sorted({i for t in tris for i in t})
    remap = {old: new for new, old in enumerate(used)}
    return [pts[i] for i in used], [[remap[i] for i in t] for t in tris]


def viewer_meshes(specs):
    out = subprocess.run([NODE, str(HERE / 'js' / 'dump_meshes.mjs'), json.dumps(specs)],
                         capture_output=True, text=True, check=True, cwd=ROOT)
    return json.loads(out.stdout)


def test_viewer_matches_python():
    if not NODE:
        print('  (skipped: node is not installed)')
        return
    meshes = viewer_meshes([spec for spec, _ in CASES])
    for (spec, build), js in zip(CASES, meshes):
        pts, tris = python_mesh(build())
        assert len(pts) == len(js['pts']) and len(tris) == len(js['tris']), \
            f"{spec}: Python {len(pts)} hubs / {len(tris)} faces, viewer {len(js['pts'])} / {len(js['tris'])}"
        worst = max(max(abs(a - b) for a, b in zip(p, q)) for p, q in zip(pts, js['pts']))
        assert worst < 1e-9, f"{spec}: hubs differ by up to {worst:.3g} m"
        assert tris == js['tris'], f"{spec}: faces differ"


if __name__ == '__main__':
    tests = [test_viewer_matches_python]
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
