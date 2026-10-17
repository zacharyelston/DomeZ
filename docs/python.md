# Python package and command line

The `domez` package generates the same meshes as the web viewer: spheres, ellipsoids and eggs, with the original flat-grid subdivision or Acidome's Chords, Arcs, Mexican and Kruschke methods. It writes Wavefront OBJ files.

## Install

The only dependency is numpy (matplotlib too if you want `unfold-plot`).

```bash
pip install -e .            # installs the package and a `domez` command
```

Or run straight from the repository root without installing:

```bash
pip install numpy
python3 -m domez --help
```

## Commands

```
python3 -m domez <command> [options]       # or: domez <command> [options] after pip install
```

| Command | What it does |
|---|---|
| `dome` | Geodesic spheres and domes: flat grid or Acidome methods, cuts, flat base |
| `shapes` | Ellipsoids, eggs, tubes and a spacecraft example |
| `polyhedra` | Platonic solids and the stella octangula |
| `unfold` | Steepest-edge unfolding of the OBJ files in `polyhedra_output/` |
| `smart-unfold` | Unfolding with topology detection and strategy selection |
| `spec-sheets` | SVG spec sheets (3D view, unfolded net, statistics) |
| `unfold-svg` | SVG drawings of unfolded nets |
| `unfold-plot` | Matplotlib drawings of unfolded nets (needs matplotlib) |

The unfolding commands read `polyhedra_output/`, so run `python3 -m domez polyhedra` first.

### `dome`

```
python3 -m domez dome [options]

  -f, --frequency     Subdivision frequency (default 3)
  -r, --radius        Radius in metres (default 5.0)
  -p, --partial       Sphere fraction: 0.0–1.0 or a fraction like 7/12 (default 0.5)
  -b, --base          icosahedron | octahedron (default icosahedron)
  -m, --method        flat | chords | arcs | mexican | kruschke (default flat)
  -s, --symmetry      pentad | cross | triad: a vertex, an edge or a face points up
                      (default: cross for the flat icosahedron, pentad otherwise)
  --flat-base         Move the hubs on the cut edge to one height so the dome stands flat
  -o, --output        Output file name (default: generated from the settings)
  --output-dir        Output folder (default dome_output)
  --presets           Generate the preset domes listed below
```

```bash
python3 -m domez dome -f 3 -r 3 -p 3/4 -m chords                # Acidome Equal Chords, 3/4 sphere
python3 -m domez dome -f 3 -r 3.5 -p 7/12 -m kruschke           # Acidome's default Kruschke dome
python3 -m domez dome -f 4 -r 5 -p 5/8 -m chords --flat-base    # 5/8 dome standing on a flat ring
python3 -m domez dome -f 4 -r 5 -p 1/2 -m mexican -s cross      # Mexican hemisphere, edge up
python3 -m domez dome -f 4 -r 10 -p 0.5                          # classic flat-grid hemisphere
```

The web viewer's **Python** box prints the matching command or snippet for whatever you have set up there.

Presets (`--presets`):

| Name | Frequency | Radius | Partial | Use |
|---|---|---|---|---|
| `hemisphere_2v` | 2V | 5 m | 1/2 | small shelter |
| `hemisphere_3v` | 3V | 5 m | 1/2 | standard dome |
| `hemisphere_4v` | 4V | 5 m | 1/2 | smooth dome |
| `three_quarter_3v` | 3V | 5 m | 3/4 | tall dome |
| `full_sphere_3v` | 3V | 5 m | 1/1 | geodesic ball |
| `greenhouse_3v` | 3V | 3.5 m | 7/12 | greenhouse |

### `shapes` and `polyhedra`

```bash
python3 -m domez shapes --type egg -f 4        # ellipsoid | egg | tube | spacecraft | all
python3 -m domez polyhedra --type all -f 3     # tetrahedron … icosahedron, stella_octangula
```

## Python API

```python
from domez import GeodesicDome, EllipsoidalGeodesic, EggGeodesic

# Spheres and domes
dome = GeodesicDome(frequency=3, radius=3.0, method='chords')
dome.generate().cut_to_partial('3/4')
dome.to_obj('chords_3v_3-4.obj')

# Ellipsoid with independent radii
EllipsoidalGeodesic(3, 3.0, 3.0, 4.5, partial=7/12, method='kruschke').generate().to_obj('ellipsoid.obj')

# Hügelschäffer egg: 6 m long (vertical), 4.4 m wide, pointed end up, standing on a flat ring
egg = EggGeodesic(4, length=6.0, breadth=4.4, asymmetry=0.08, partial=5/8, method='chords', flat_base=True)
egg.generate().to_obj('egg_dome.obj')
```

### Options shared by all three classes

| Option | Values |
|---|---|
| `method` | `'flat'` (default), `'chords'`, `'arcs'`, `'mexican'`, `'kruschke'` (see below) |
| `symmetry` | `'pentad'` (vertex up), `'cross'` (edge up), `'triad'` (face up). Default: the flat grid's native orientation (Cross for the icosahedron, Pentad for the octahedron), Pentad for the Acidome methods, as on acidome.com |
| `base` | `'icosahedron'` (default) or `'octahedron'` |
| `partial` / `cut_to_partial()` | A float or a fraction string such as `'7/12'`. The Acidome methods cut along whole rows of faces, so they snap to the nearest fraction Acidome offers (3V: 1/4, 5/12, 7/12, 3/4; 4V: 1/4, 3/8, 1/2, 5/8, 3/4). `.partial` holds the fraction actually built |
| `flat_base` | `True` moves the hubs on the cut edge along their meridians to one height (Acidome's rule; no effect on a full sphere) |

| `method` | What it does |
|---|---|
| `flat` | Equal divisions of each flat base triangle, pushed out to the sphere. The original generator |
| `chords` | Acidome "Equal Chords": each row point is the normalised midpoint of two points already on the sphere |
| `arcs` | Acidome "Equal Arcs": base edges split into equal arcs; inner hubs are spherical incentres |
| `mexican` | Arcs, then struts on each grid line nudged to equal length (fewer strut types) |
| `kruschke` | Chords, then the spokes around each pentagon hub pulled to Kruschke's length. 3V and 4V icosahedra only; otherwise Chords, as in Acidome |

### Egg shape

`EggGeodesic` maps a unit-sphere point (x, y, z) to (x·s, y·s, t), with t = z·L/2 and s = (B/2)·L / √(L² + 8wt + 4w²), where L is the length, B the breadth and w = asymmetry·L. Positive asymmetry puts the pointed end up, negative puts it down, and 0 gives an ellipsoid. Keep |asymmetry| below 0.5. Shapes are cut on the unit sphere before they are stretched, exactly as the viewer does.

### Other classes and functions

- `PolyhedraGenerator(kind, frequency=1, radius=1.0)` builds Platonic solids and the stella octangula.
- `TubularGeodesic`, `MeshGeodesifier` and `SpacecraftGeodesifier` cover tubes, remeshing an OBJ, and the spacecraft example (see `examples/moonpies/`).
- `steepest_edge_unfold(vertices, faces)`, `load_obj(path)` and `build_adjacency(vertices, faces)` unfold a mesh into a flat net. See the [unfolding primer](unfolding-primer.md).

### Unused vertices

For the flat method, `GeodesicDome` keeps the vertices below the cut in its OBJ files, as it always has; call `drop_unused_vertices()` to remove them. The Acidome methods, `EllipsoidalGeodesic` and `EggGeodesic` drop them, as the viewer does.

## Output format

Wavefront OBJ in metres, Z up, with a comment header:

```
# Geodesic Dome
# Frequency: 3V
# Radius: 5.0m
# Vertices: 92
# Faces: 84

v 0.000000 0.000000 5.000000
...
f 1 2 3
...
```

Blender, Rhino, SketchUp, FreeCAD and most CAD tools import OBJ directly (File → Import → Wavefront). Blender assumes Y up by default, so set "Up" to Z in the import options, or export Y-up from the web viewer.

## Tests

```bash
python3 tests/test_geodesics.py   # Acidome vectors from acidome.com, eggs, options; flat output unchanged
python3 tests/test_unfolding.py   # unfolding of freshly generated Platonic solids and 3V domes
pytest                            # runs both, if pytest is installed
```

`tests/test_geodesics.py` checks the Acidome methods against values taken from acidome.com. It also checks that the default flat method still writes byte-identical OBJ files, using hashes in `tests/data/`.
