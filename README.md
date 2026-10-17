# PolyForge

**A comprehensive toolkit for polyhedra generation, unfolding, and manufacturing**

Generate geodesic domes, Platonic solids, and complex polyhedra with manufacturing-ready 2D nets. From 3D geometry to flat patterns for laser cutting, CNC, and fabrication.

Pure Python implementation with validated unfolding algorithms - generate .obj files and SVG spec sheets ready for Blender, CAD software, or direct manufacturing.

## Features

### Generation
- 🎯 **Pure Python** - No external dependencies, no web scraping
- 🚀 **Fast** - Generate geometry in milliseconds
- 🏗️ **Multiple Base Shapes** - All 5 Platonic solids + stella octangula
- 🎲 **Geodesic Subdivision** - Any frequency (1V, 2V, 3V, etc.)
- 🧮 **Acidome Methods** - Chords, Arcs, Mexican and Kruschke, matching acidome.com strut for strut
- ✂️ **Partial Cuts** - Hemisphere, 3/4 sphere, or custom fractions, with optional flat base
- 🥚 **Shapes** - Spheres, ellipsoids and Hügelschäffer eggs

### Unfolding & Manufacturing
- � **Steepest Edge Unfolding** - Validated algorithm with 100% success for convex polyhedra
- ✅ **Edge-Sharing Verification** - Faces share complete edges, not just vertices
- 📊 **Spec Sheets** - 3D view + 2D unfolded layout with statistics
- 🏭 **Manufacturing-Ready** - SVG output for laser cutting, CNC
- 🧪 **Comprehensive Tests** - Automated validation suite prevents regressions

### Research & Documentation
- 📚 **Unfolding Primer** - Synthesis of 15+ research papers (1997-2025)
- 🔬 **Algorithm Comparison** - Performance metrics and selection guide
- � **Implementation Details** - Complete mathematical foundations

## Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/geodesic-dome-generator.git
cd geodesic-dome-generator

# Generate geodesic domes
python3 dome_generator.py --presets

# Generate Platonic solids
python3 polyhedra_generator.py --type all

# Output: dome_output/*.obj and polyhedra_output/*.obj files ready to import
```

## Web Viewer

`web/index.html` is a single-page 3D viewer for setting dome parameters interactively. Open it directly in a browser (no server or build step). It loads Three.js from a CDN, so the first load needs a network connection.

```bash
open web/index.html
```

- **Shapes**: sphere, ellipsoid (independent X/Y/Z radii) and a true asymmetric egg (Hügelschäffer curve: length, breadth, asymmetry, pointed end up or down)
- **Geodesic**: icosahedron or octahedron base, frequency 1–12V, and orientation (Pentad = vertex up, Cross = edge up, Triad = face up)
- **Methods**: Chords, Arcs, Mexican and Kruschke ported from the [Acidome](https://acidome.com/lab/calc/) calculator, plus the flat grid used by `dome_generator.py`
- **Cut**: Acidome's whole-row fractions (7/12, 5/8, 3/4, …) for the Acidome methods, or any fraction for the flat grid, with optional base flattening so the bottom ring sits on one plane
- **Struts**: types grouped within a tolerance you set, with chord factors, counts and hub valences; hover a strut or table row to highlight its type
- **Export**: OBJ (Z-up like the Python tools, or Y-up, optionally with struts as `l` lines) and a cut-list CSV
- **Sharing**: every setting lives in the URL hash, so "Copy link" reproduces the exact model
- **Acidome link**: shows the matching Acidome URL and opens it online or in a local offline copy (Acidome only builds spheres, so eggs and ellipsoids open as the nearest sphere)

The Acidome methods reproduce acidome.com's own geometry: hub, strut and panel counts, every strut length (to 6 decimals) and the dome height match across Chords, Arcs, Mexican and Kruschke, both bases, all three orientations, and flattened and unflattened cuts. That includes one Acidome quirk: its Mexican method never pushes hubs back onto the sphere, so they sit up to about 0.01% outside it. The Python generators implement the same geometry: every method, base, orientation, cut and flat base, and the ellipsoid and egg shapes, give the same mesh face for face in `dome_generator.py`, `EllipsoidalGeodesic` and `EggGeodesic`. The viewer's Python box shows the command or snippet for the current settings. The one difference: for the flat grid, `GeodesicDome` keeps the unused below-the-cut vertices in its OBJ files, as it always has (call `drop_unused_vertices()` to remove them). The Acidome methods, `EllipsoidalGeodesic` and `EggGeodesic` drop them, as the viewer does.

To use the offline Acidome button, download the calculator from acidome.com ("Acidome offline ⤓") and save it as `vendor/acidome/acidome-offline.html`. `vendor/` is git-ignored because Acidome's code isn't under a standard open-source license.

## Installation

No installation required! Just Python 3.8+

Optional: Install numpy for better performance (falls back to pure Python if not available)

```bash
pip install numpy  # Optional
```

## Usage

### Command Line

Generate preset domes:

```bash
python3 dome_generator.py
```

Generate custom dome:

```bash
python3 dome_generator.py --frequency 4 --radius 10 --partial 0.5
```

Use an Acidome subdivision method, orientation and flat base:

```bash
python3 dome_generator.py -f 3 -r 3.5 -p 7/12 -m kruschke
python3 dome_generator.py -f 4 -r 5 -p 5/8 -m chords --flat-base
python3 dome_generator.py -f 4 -r 5 -p 1/2 -m mexican -s cross
```

### Python API

```python
from dome_generator import GeodesicDome

# Create a 3V hemisphere with 5m radius
dome = GeodesicDome(frequency=3, radius=5.0, base='icosahedron')
dome.generate()
dome.cut_to_partial(0.5)  # 0.5 = hemisphere
dome.to_obj('my_dome.obj')

print(f"Generated {len(dome.vertices)} vertices, {len(dome.faces)} faces")
```

### Subdivision Methods

`GeodesicDome` takes a `method`, a `symmetry` and a `flat_base` option:

| `method` | What it does |
|----------|--------------|
| `'flat'` (default) | Equal divisions of each flat base triangle pushed out to the sphere |
| `'chords'` | Acidome "Equal Chords": each row point is the normalised midpoint of two points already on the sphere |
| `'arcs'` | Acidome "Equal Arcs": base edges split into equal arcs; inner hubs are spherical incentres |
| `'mexican'` | Arcs, then struts on each grid line nudged to equal length (fewer strut types) |
| `'kruschke'` | Chords, then the spokes around each pentagon hub pulled to Kruschke's length (3V and 4V icosahedra only, otherwise Chords) |

- `symmetry` picks what points up: `'pentad'` (a vertex), `'cross'` (an edge) or `'triad'` (a face). The default is the flat grid's native orientation (Cross for the icosahedron, Pentad for the octahedron) and Pentad for the Acidome methods, as on acidome.com.
- `flat_base=True` moves the hubs on the cut edge along their meridians to one height, so the dome stands on a flat ring (Acidome's rule; no effect on a full sphere).
- The Acidome methods cut along whole rows of faces, so `cut_to_partial()` snaps to the nearest fraction Acidome offers (for 3V: 1/4, 5/12, 7/12, 3/4; for 4V: 1/4, 3/8, 1/2, 5/8, 3/4). `dome.partial` holds the fraction actually built.

```python
from dome_generator import GeodesicDome

dome = GeodesicDome(frequency=4, radius=3.0, method='chords', flat_base=True)
dome.generate().cut_to_partial(5/8)
dome.to_obj('chords_5_8.obj')
```

The Acidome methods are ported from the [Acidome calculator](https://acidome.com/lab/calc/) (acidome.ru/lab/calc, by popitch) via `web/index.html`. Their meshes match acidome.com's hub, strut and panel counts and strut lengths to 6 decimals, including Acidome's Mexican quirk of leaving hubs slightly outside the sphere.

### Ellipsoids and Eggs

```python
from advanced_geodesics import EllipsoidalGeodesic, EggGeodesic

# Ellipsoid with independent radii
EllipsoidalGeodesic(3, 3.0, 3.0, 4.5, partial=7/12, method='kruschke').generate().to_obj('ellipsoid.obj')

# Hügelschäffer egg: 6 m long (Z), 4.4 m wide, pointed end up
egg = EggGeodesic(4, length=6.0, breadth=4.4, asymmetry=0.08, partial=5/8, method='chords', flat_base=True)
egg.generate().to_obj('egg_dome.obj')
```

`EggGeodesic` maps a unit-sphere point (x, y, z) to (x·s, y·s, t), with t = z·L/2 and s = (B/2)·L / √(L² + 8wt + 4w²), where w = asymmetry·L. Positive asymmetry puts the pointed end up, negative puts it down, and 0 gives an ellipsoid; keep |asymmetry| below 0.5. Both classes take `partial`, `method`, `symmetry` and `flat_base` like `GeodesicDome`, and cut on the unit sphere before shaping, as the viewer does.

## Parameters

### Frequency (Detail Level)

Controls the number of subdivisions. Higher = more triangles, smoother surface.

- `2V` - Low detail (~40 vertices)
- `3V` - Medium detail (~90 vertices) **← Recommended**
- `4V` - High detail (~160 vertices)
- `5V` - Very high detail (~250 vertices)
- `6V` - Ultra detail (~360 vertices)

### Radius

Dome radius in meters (or your preferred unit). The .obj file uses these units directly.

```python
dome = GeodesicDome(frequency=3, radius=5.0)  # 5 meter radius
```

### Partial (Sphere Fraction)

Cut the dome to a fraction of a full sphere:

- `1.0` - Full sphere (geodesic ball)
- `0.75` - Three-quarter sphere
- `0.5` - Hemisphere **← Most common**
- `0.25` - Quarter sphere
- Custom: Any value 0.0 to 1.0 (the Acidome methods snap to their nearest whole-row fraction)

```python
dome.cut_to_partial(0.5)   # Hemisphere
dome.cut_to_partial(7/12)  # 7/12 sphere (good for greenhouses)
```

### Base Polyhedron

Starting shape before subdivision:

- `icosahedron` - 20 triangular faces **← Recommended for domes**
- `octahedron` - 8 triangular faces (simpler, fewer triangles)

```python
dome = GeodesicDome(frequency=3, radius=5.0, base='icosahedron')
```

## Examples

### Small Greenhouse Dome

```python
from dome_generator import GeodesicDome

dome = GeodesicDome(frequency=3, radius=3.5, base='icosahedron')
dome.generate()
dome.cut_to_partial(7/12)  # 7/12 sphere for good headroom
dome.to_obj('greenhouse.obj')
```

### Large Event Dome

```python
dome = GeodesicDome(frequency=5, radius=10.0, base='icosahedron')
dome.generate()
dome.cut_to_partial(0.5)  # Hemisphere
dome.to_obj('event_dome.obj')
```

### Planetarium (Full Sphere)

```python
dome = GeodesicDome(frequency=4, radius=8.0, base='icosahedron')
dome.generate()  # No cut = full sphere
dome.to_obj('planetarium.obj')
```

### Tiny Shelter

```python
dome = GeodesicDome(frequency=2, radius=2.0, base='icosahedron')
dome.generate()
dome.cut_to_partial(0.5)
dome.to_obj('shelter.obj')
```

## Importing into 3D Software

### Blender

**Method 1: File Menu**
1. File → Import → Wavefront (.obj)
2. Select your .obj file
3. Click "Import OBJ"

**Method 2: Python Script**
```python
import bpy
bpy.ops.import_scene.obj(filepath="dome_output/hemisphere_3v.obj")
```

### Unity

1. Drag .obj file into Assets folder
2. Add to scene as GameObject

### Unreal Engine

1. Import → Import to /Game/
2. Select .obj file
3. Configure import settings

### AutoCAD / Rhino / SketchUp

Most CAD software supports .obj import directly through File → Import menu.

## Output Format

Generated .obj files follow the Wavefront format:

```
# Geodesic Dome
# Frequency: 3V
# Radius: 5.0m
# Vertices: 92
# Faces: 84

v 0.000000 0.000000 5.000000
v 0.000000 4.472136 2.236068
...

f 1 2 3
f 2 4 3
...
```

## Command Line Options

```bash
python3 dome_generator.py [OPTIONS]

Options:
  --frequency, -f    Subdivision frequency (2-6, default: 3)
  --radius, -r       Dome radius in meters (default: 5.0)
  --partial, -p      Sphere fraction 0.0-1.0 or a fraction like 7/12 (default: 0.5)
  --base, -b         Base polyhedron: icosahedron|octahedron (default: icosahedron)
  --method, -m       flat|chords|arcs|mexican|kruschke (default: flat)
  --symmetry, -s     pentad|cross|triad: vertex, edge or face up
                     (default: cross for the flat icosahedron, pentad otherwise)
  --flat-base        Level the hubs on the cut edge so the dome stands flat
  --output, -o       Output filename (default: auto-generated)
  --output-dir       Output directory (default: dome_output)
  --presets          Generate all preset domes (with the method options above)
  --help, -h         Show this help message
```

### Examples

```bash
# High-detail hemisphere
python3 dome_generator.py -f 5 -r 10 -p 0.5

# Greenhouse dome
python3 dome_generator.py -f 3 -r 3.5 -p 0.583  # 7/12 = 0.583

# Full sphere
python3 dome_generator.py -f 4 -r 8 -p 1.0

# Acidome Kruschke greenhouse, and a Mexican hemisphere standing edge up
python3 dome_generator.py -f 3 -r 3.5 -p 7/12 -m kruschke
python3 dome_generator.py -f 4 -r 5 -p 1/2 -m mexican -s cross

# Generate all presets
python3 dome_generator.py --presets
```

## Presets

Run with `--presets` to generate common configurations:

| Name | Frequency | Radius | Partial | Use Case |
|------|-----------|--------|---------|----------|
| `hemisphere_2v` | 2V | 5m | 0.5 | Small shelter |
| `hemisphere_3v` | 3V | 5m | 0.5 | Standard dome |
| `hemisphere_4v` | 4V | 5m | 0.5 | Smooth dome |
| `three_quarter_3v` | 3V | 5m | 0.75 | Tall dome |
| `full_sphere_3v` | 3V | 5m | 1.0 | Geodesic ball |
| `greenhouse_3v` | 3V | 3.5m | 0.583 | Greenhouse |

## Advanced Usage

### Batch Generation

```python
from dome_generator import GeodesicDome

configs = [
    (2, 5.0, 0.5, "small"),
    (3, 5.0, 0.5, "medium"),
    (4, 5.0, 0.5, "large"),
]

for freq, radius, partial, name in configs:
    dome = GeodesicDome(frequency=freq, radius=radius)
    dome.generate().cut_to_partial(partial)
    dome.to_obj(f"dome_{name}.obj")
```

### Custom Vertex Processing

```python
dome = GeodesicDome(frequency=3, radius=5.0)
dome.generate()

# Access vertices directly
for vertex in dome.vertices:
    print(f"Vertex: ({vertex.x}, {vertex.y}, {vertex.z})")
    # Apply custom transformations
    vertex.z *= 1.2  # Stretch vertically

dome.to_obj('custom_dome.obj')
```

### Statistics

```python
dome = GeodesicDome(frequency=3, radius=5.0)
dome.generate()

print(f"Vertices: {len(dome.vertices)}")
print(f"Faces: {len(dome.faces)}")
print(f"Edges: ~{len(dome.faces) * 3 // 2}")  # Approximate
```

## Tests

```bash
python3 test_geodesics.py   # generators: acidome.com vectors, eggs, flat output unchanged
python3 test_unfolding.py   # unfolding (run polyhedra_generator.py first for polyhedra_output/)
```

`test_geodesics.py` checks the Acidome methods against values taken from acidome.com, and checks that the default flat method still writes byte-identical OBJ files (hashes in `test_data/`).

## Mathematical Background

Geodesic domes are based on subdividing regular polyhedra (icosahedron or octahedron) and projecting vertices onto a sphere.

### Subdivision Process

1. Start with base polyhedron (20 or 8 triangular faces)
2. Subdivide each triangle into smaller triangles (frequency determines count)
3. Project all vertices to sphere surface (radius)
4. Cut at specified height for partial domes

### Frequency Calculation

For frequency `n`, each original triangle is divided into `n²` smaller triangles.

- 2V: 4 triangles per face
- 3V: 9 triangles per face
- 4V: 16 triangles per face

## Troubleshooting

### Dome appears too small/large in 3D software

The .obj file uses the radius you specified directly. Scale in your 3D software:

**Blender:**
```python
bpy.ops.transform.resize(value=(0.1, 0.1, 0.1))  # Scale down 10x
```

### Dome has holes or missing faces

Check the partial parameter - values < 0.5 will cut away more than half the sphere.

### Too many/few triangles

Adjust the frequency parameter (2-6). Start with 3V and adjust as needed.

### Import fails

Ensure the .obj file exists and path is correct. Check file permissions.

## Performance

| Frequency | Vertices | Faces | Generation Time |
|-----------|----------|-------|-----------------|
| 2V | ~40 | ~36 | < 1ms |
| 3V | ~90 | ~84 | < 5ms |
| 4V | ~160 | ~152 | < 10ms |
| 5V | ~250 | ~240 | < 20ms |
| 6V | ~360 | ~352 | < 30ms |

*Times approximate on modern hardware*

## File Structure

```
geodesic-dome-generator/
├── README.md              # This file
├── dome_generator.py      # Main generator script (flat grid + Acidome methods)
├── advanced_geodesics.py  # Ellipsoids, eggs, tubes and other shapes
├── examples.py            # Example usage scripts
├── test_geodesics.py      # Generator tests
├── test_data/             # Flat-method OBJ hashes for the tests
├── web/index.html         # 3D dome viewer
├── dome_output/           # Generated .obj files
│   ├── hemisphere_2v.obj
│   ├── hemisphere_3v.obj
│   └── ...
└── tests/                 # Unit tests (optional)
```

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Submit a pull request

## License

MIT License - see LICENSE file for details

## Related Projects

- **Acidome Calculator** - Web-based dome calculator with construction details: https://acidome.com/lab/calc/
- **Blender** - Open source 3D creation suite: https://www.blender.org/
- **Three.js** - JavaScript 3D library: https://threejs.org/

## Acknowledgments

- Geodesic dome mathematics based on Buckminster Fuller's work
- Subdivision algorithms inspired by the acidome.com calculator
- Pure Python implementation for maximum portability

## Support

- **Issues**: https://github.com/yourusername/geodesic-dome-generator/issues
- **Discussions**: https://github.com/yourusername/geodesic-dome-generator/discussions

## Changelog

### v1.0.0 (2025-01-21)
- Initial release
- Pure Python geodesic dome generation
- Support for icosahedron and octahedron bases
- Configurable frequency (2V-6V)
- Partial dome cutting
- Wavefront .obj export
