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
- ✂️ **Partial Cuts** - Hemisphere, 3/4 sphere, or custom fractions

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

## Installation

No installation required! Just Python 3.6+

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
- Custom: Any value 0.0 to 1.0

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
  --partial, -p      Sphere fraction 0.0-1.0 (default: 0.5)
  --base, -b         Base polyhedron: icosahedron|octahedron (default: icosahedron)
  --output, -o       Output directory (default: dome_output)
  --name, -n         Output filename (default: auto-generated)
  --presets          Generate all preset domes
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
├── dome_generator.py      # Main generator script
├── examples.py            # Example usage scripts
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
