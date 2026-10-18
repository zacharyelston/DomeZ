# DomeZ

**Acidome with Height+**: design geodesic domes, ellipsoids and eggs, and get what you need to build them.

**Try it: [zacharyelston.github.io/DomeZ](https://zacharyelston.github.io/DomeZ/)**

DomeZ re-implements the geometry of the [Acidome](https://acidome.com/lab/calc/) dome calculator, matching it exactly, and extends it beyond the sphere. The aim is that anyone can design an optimal shelter themselves and come away with plans to build it.

## Why

- **Snow.** Geodesic domes work well in cold climates, but their shallow crowns hold snow, and snow load governs the structure. Egg and ellipsoid forms with steeper pitches shed snow, which makes geodesic shelters practical where they would otherwise be over-built.
- **One engine, many build systems.** Acidome turns a sphere into beams, hubs, covers and tents. DomeZ extends that approach to other forms and build systems, such as timber frames, double skins and cast MgO (Sorel) panels or blocks in bags. Everything is derived from one mesh, so every part fits.

## What's here

| | |
|---|---|
| **Acidome Height+** (`tools/acidome_height.py`) | Builds a local copy of the Acidome calculator with **Height ×**, **Egg point** and **Panel gap** controls: Acidome's own tabs, Joint and other beam cut drawings and typing on taller, flatter or egg-shaped domes, plus each triangle's opening as panel form sizes ([details](docs/acidome.md#acidome-height)) |
| **Web viewer** (`web/index.html`) | Interactive 3D design: sphere, ellipsoid or egg; Acidome's Chords, Arcs, Mexican and Kruschke methods; row cuts and flat base; Acidome's Joint timber frame with board types and cut drawings; a printable cut sheet (boards with saw settings, hubs, panel openings, plus CSV); a jig sheet for cutting every board end on a miter-only saw; OBJ and board exports; shareable links |
| **Python package** (`domez/`) | The same geometry as a library and command line, kept face-for-face identical to the viewer by tests |
| **Unfolding** | Steepest-edge unfolding of meshes into flat nets, with SVG spec sheets |
| **Rust prototype** (`geodesic-rs/`) | An early unfolder CLI; a candidate core for a shared engine |

## Quick start

**Viewer.** Use the [hosted viewer](https://zacharyelston.github.io/DomeZ/), or open the file locally; there's no install or server.

```bash
open web/index.html
```

Pick a shape, frequency, method and cut, then print the cut sheet or download the OBJ. For example, a [5V Mexican egg cut at 3/4 and standing flat](https://zacharyelston.github.io/DomeZ/#shape=egg&freq=5&method=mexican&partial=3%2F4&flat=1).

**Acidome Height+.** Download "Acidome offline" from [acidome.com](https://acidome.com/lab/calc/) into `vendor/acidome/acidome-offline.html`, then:

```bash
python3 tools/acidome_height.py     # writes vendor/acidome/acidome-height.html
```

Open the result in a browser and set **Height ×**, **Egg point, %** and **Panel gap, mm** under Product options. Everything else is Acidome, including the Framework tab's beam cut drawings; each face type also lists its triangle's opening for panel forms.

**Python.** Python 3.8+ with numpy.

```bash
pip install -e .                                          # or just: pip install numpy
python3 -m domez dome -f 3 -r 3 -p 3/4 -m chords          # Acidome Equal Chords, 3/4 sphere
python3 -m domez --help
```

```python
from domez import GeodesicDome, EggGeodesic

GeodesicDome(frequency=3, radius=3.0, method='chords').generate().cut_to_partial('3/4').to_obj('dome.obj')
EggGeodesic(5, length=6.0, breadth=4.4, asymmetry=0.08, partial='3/4', method='mexican', flat_base=True).generate().to_obj('egg.obj')
```

The viewer's **Python** box prints the command or snippet for whatever you've designed.

## Status

| Feature | Status |
|---|---|
| Acidome Chords, Arcs, Mexican and Kruschke; Pentad/Cross/Triad; row cuts; flat base | ✓ Matches acidome.com in 13 checked configurations ([details](docs/acidome.md)) |
| Ellipsoids and Hügelschäffer eggs | ✓ Viewer and Python |
| Strut, hub and panel types; printable cut sheet and CSV; OBJ | ✓ |
| Flat nets by steepest-edge unfolding | ✓ Platonic solids and 3V domes |
| Acidome's tabs and lumber cut drawings on stretched and egg domes, with panel form sizes | ✓ Acidome Height+ (local patch of your Acidome copy) |
| Joint timber frame in the viewer: board types, Acidome-style cut drawings, saw settings, panel openings | ✓ Same as acidome.com on spheres and Acidome Height+ on ellipsoids and eggs |
| Scheme, Base, Cover and Tent views; panel calculator; snow pitch map; double skins | Planned ([roadmap](docs/roadmap.md)) |

## Repository layout

```
web/index.html        3D viewer (single file; Three.js from a CDN)
domez/                Python package
  dome.py               spheres and domes: flat grid and Acidome methods     python3 -m domez dome
  shapes.py             ellipsoids, eggs, tubes                              python3 -m domez shapes
  polyhedra.py          Platonic solids, stella octangula                    python3 -m domez polyhedra
  unfold.py             steepest-edge unfolding                              python3 -m domez unfold
  smart_unfold.py, coplanar.py, spec_sheet.py, unfold_svg.py, unfold_plot.py
tests/                test_geodesics.py, test_unfolding.py, data/
examples/             domes.py, moonpies/ (spacecraft example), gallery/ (SVG nets and spec sheets)
docs/                 documentation (start at docs/README.md)
geodesic-rs/          Rust prototype
tools/acidome_height.py  builds Acidome Height+ from your offline Acidome copy (vendor/, git-ignored)
pyproject.toml        package metadata (pip install -e .)
.github/workflows/    pages.yml publishes web/ to GitHub Pages on every push to main
```

## Documentation

- [Web viewer](docs/viewer.md): controls, exports, URL parameters
- [Python package](docs/python.md): commands, API, output format
- [Acidome compatibility](docs/acidome.md): what's ported, verification, quirks, offline copy
- [Roadmap](docs/roadmap.md): goals and what's next
- [Unfolding primer](docs/unfolding-primer.md): algorithms and research

## Tests

```bash
python3 tests/test_geodesics.py    # Acidome vectors, eggs, options; flat-grid output unchanged
python3 tests/test_unfolding.py    # unfolding of freshly generated polyhedra
python3 tests/test_acidome_height.py  # the Acidome Height+ patch (skipped without your Acidome copy)
pytest                             # both, if pytest is installed
```

## Credits and license

DomeZ is MIT-licensed (see [LICENSE](LICENSE)).

The subdivision methods, cut rules and flat base re-implement the [Acidome](https://acidome.com/lab/calc/) calculator by popitch (acidome.ru). DomeZ is independent, is not affiliated with Acidome, and doesn't include Acidome's code. See [docs/acidome.md](docs/acidome.md) for how to use a local offline copy. The viewer uses [Three.js](https://threejs.org/).
