# Polyhedra Generator

Generate all Platonic solids and subdivided variants for 3D modeling.

## Quick Start

```bash
# Generate all 5 Platonic solids
python3 polyhedra_generator.py --type all

# Generate specific polyhedron
python3 polyhedra_generator.py --type icosahedron

# Generate with subdivision (geodesic sphere)
python3 polyhedra_generator.py --type icosahedron --frequency 3
```

## The Five Platonic Solids

### Tetrahedron
- **Faces:** 4 triangular faces
- **Vertices:** 4
- **Edges:** 6
- **Use cases:** Simplest 3D shape, molecular geometry, dice (d4)

```bash
python3 polyhedra_generator.py --type tetrahedron
```

### Cube (Hexahedron)
- **Faces:** 6 square faces (exported as 12 triangles)
- **Vertices:** 8
- **Edges:** 12
- **Use cases:** Building blocks, voxels, dice (d6)

```bash
python3 polyhedra_generator.py --type cube
```

### Octahedron
- **Faces:** 8 triangular faces
- **Vertices:** 6
- **Edges:** 12
- **Use cases:** Crystal structures, dice (d8), dual of cube

```bash
python3 polyhedra_generator.py --type octahedron
```

### Dodecahedron
- **Faces:** 12 pentagonal faces (exported as 38 triangles)
- **Vertices:** 20
- **Edges:** 30
- **Use cases:** Dice (d12), molecular cages, decorative objects

```bash
python3 polyhedra_generator.py --type dodecahedron
```

### Icosahedron
- **Faces:** 20 triangular faces
- **Vertices:** 12
- **Edges:** 30
- **Use cases:** Geodesic domes, dice (d20), viral capsids

```bash
python3 polyhedra_generator.py --type icosahedron
```

## Subdivision (Geodesic Variants)

Add `--frequency` to subdivide any polyhedron into a smoother sphere:

```bash
# Subdivided icosahedron (geodesic sphere)
python3 polyhedra_generator.py --type icosahedron --frequency 3

# Subdivided octahedron
python3 polyhedra_generator.py --type octahedron --frequency 2

# Subdivided tetrahedron
python3 polyhedra_generator.py --type tetrahedron --frequency 4
```

**Frequency levels:**
- `1` - Base polyhedron (no subdivision)
- `2` - 4x triangles per face
- `3` - 9x triangles per face
- `4` - 16x triangles per face
- `5+` - Higher detail

## Python API

```python
from polyhedra_generator import PolyhedraGenerator

# Generate base icosahedron
poly = PolyhedraGenerator('icosahedron', frequency=1, radius=1.0)
poly.generate()
poly.to_obj('icosahedron.obj')

# Generate subdivided dodecahedron
poly = PolyhedraGenerator('dodecahedron', frequency=3, radius=5.0)
poly.generate()
poly.to_obj('geodesic_dodecahedron.obj')
```

## Command Line Options

```bash
python3 polyhedra_generator.py [OPTIONS]

Options:
  -t, --type          Polyhedron type (tetrahedron|cube|octahedron|dodecahedron|icosahedron|all)
  -f, --frequency     Subdivision frequency (1 = base, 2-6 = subdivided)
  -r, --radius        Radius in meters (default: 1.0)
  -o, --output-dir    Output directory (default: polyhedra_output)
```

## Examples

### Dice Set (RPG/Gaming)

```bash
# Generate all standard RPG dice
python3 polyhedra_generator.py --type tetrahedron -o dice  # d4
python3 polyhedra_generator.py --type cube -o dice         # d6
python3 polyhedra_generator.py --type octahedron -o dice   # d8
python3 polyhedra_generator.py --type dodecahedron -o dice # d12
python3 polyhedra_generator.py --type icosahedron -o dice  # d20
```

### Geodesic Spheres

```bash
# Low-poly sphere (icosahedron base)
python3 polyhedra_generator.py --type icosahedron -f 1 -r 5

# Medium-poly sphere
python3 polyhedra_generator.py --type icosahedron -f 3 -r 5

# High-poly sphere
python3 polyhedra_generator.py --type icosahedron -f 5 -r 5
```

### Crystal Structures

```bash
# Octahedral crystal
python3 polyhedra_generator.py --type octahedron -r 2

# Cubic crystal
python3 polyhedra_generator.py --type cube -r 2

# Dodecahedral cage
python3 polyhedra_generator.py --type dodecahedron -r 3
```

## Comparison Table

| Polyhedron | Faces | Vertices | Edges | Symmetry | Common Uses |
|------------|-------|----------|-------|----------|-------------|
| Tetrahedron | 4 | 4 | 6 | Tetrahedral | Molecular geometry, d4 dice |
| Cube | 6 | 8 | 12 | Cubic | Voxels, d6 dice, buildings |
| Octahedron | 8 | 6 | 12 | Octahedral | Crystals, d8 dice |
| Dodecahedron | 12 | 20 | 30 | Icosahedral | d12 dice, decorative |
| Icosahedron | 20 | 12 | 30 | Icosahedral | Geodesic domes, d20 dice, viruses |

## Subdivision Statistics

### Icosahedron (most common for spheres)

| Frequency | Vertices | Faces | Use Case |
|-----------|----------|-------|----------|
| 1V | 12 | 20 | Low-poly sphere |
| 2V | 42 | 80 | Game asset |
| 3V | 92 | 180 | Standard sphere |
| 4V | 162 | 320 | Smooth sphere |
| 5V | 252 | 500 | High-detail sphere |

### Octahedron

| Frequency | Vertices | Faces | Use Case |
|-----------|----------|-------|----------|
| 1V | 6 | 8 | Diamond shape |
| 2V | 18 | 32 | Simple sphere |
| 3V | 38 | 72 | Medium sphere |

## Mathematical Properties

### Duality
- Cube ↔ Octahedron (dual pair)
- Dodecahedron ↔ Icosahedron (dual pair)
- Tetrahedron ↔ Tetrahedron (self-dual)

### Golden Ratio (φ)
Both dodecahedron and icosahedron vertices are based on the golden ratio:
- φ = (1 + √5) / 2 ≈ 1.618

### Euler's Formula
For all Platonic solids: V - E + F = 2
- V = vertices
- E = edges  
- F = faces

## Integration with Dome Generator

The polyhedra generator extends the geodesic dome generator:

```python
# Use dome generator for partial spheres
from dome_generator import GeodesicDome

dome = GeodesicDome(frequency=3, radius=5.0, base='icosahedron')
dome.generate()
dome.cut_to_partial(0.5)  # Hemisphere
dome.to_obj('hemisphere.obj')

# Use polyhedra generator for full shapes
from polyhedra_generator import PolyhedraGenerator

sphere = PolyhedraGenerator('icosahedron', frequency=3, radius=5.0)
sphere.generate()
sphere.to_obj('full_sphere.obj')
```

## Applications

### 3D Modeling
- Low-poly game assets
- Placeholder geometry
- UV sphere alternatives

### Architecture
- Geodesic structures
- Decorative elements
- Structural analysis

### Science
- Molecular models
- Crystal structures
- Viral capsid models

### Gaming
- Dice models (d4, d6, d8, d12, d20)
- Collectible objects
- Geometric puzzles

### Art & Design
- Geometric sculptures
- Jewelry design
- Decorative patterns

## Tips

1. **For smooth spheres:** Use icosahedron with frequency 3-5
2. **For low-poly aesthetic:** Use frequency 1-2
3. **For dice:** Use base polyhedra (frequency 1)
4. **For domes:** Use the dome_generator.py instead
5. **For crystals:** Use octahedron or cube

## Troubleshooting

**Polyhedron looks faceted, not smooth?**
Increase frequency: `-f 4` or `-f 5`

**Too many triangles?**
Decrease frequency or use base polyhedron: `-f 1`

**Want a hemisphere instead of full sphere?**
Use `dome_generator.py` with `cut_to_partial(0.5)`

**Faces look wrong in Blender?**
Enable "Shade Smooth" in Blender for subdivided polyhedra

## Future Extensions

Potential additions:
- Archimedean solids (13 types)
- Catalan solids (duals of Archimedean)
- Prisms and antiprisms
- Truncated variants
- Snub variants
- Johnson solids

## References

- **Platonic Solids:** https://en.wikipedia.org/wiki/Platonic_solid
- **Geodesic Polyhedra:** https://en.wikipedia.org/wiki/Geodesic_polyhedron
- **Buckminster Fuller:** Pioneer of geodesic structures
