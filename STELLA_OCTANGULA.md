# Stella Octangula

The **stella octangula** (Latin for "eight-pointed star") is a beautiful compound polyhedron formed by two interpenetrating tetrahedra in dual position.

## Properties

- **Vertices:** 8 (4 from each tetrahedron)
- **Edges:** 12 (6 from each tetrahedron)
- **Faces:** 8 triangular faces (4 from each tetrahedron)
- **Symmetry:** Octahedral (Oh)
- **Also known as:** Compound of two tetrahedra, stella octangula

## Mathematical Description

The stella octangula is formed by:
1. A regular tetrahedron
2. Its dual tetrahedron (rotated 180°)
3. Both centered at the origin

The vertices of the two tetrahedra are positioned at:
- **Tetrahedron 1:** (1,1,1), (1,-1,-1), (-1,1,-1), (-1,-1,1)
- **Tetrahedron 2:** (-1,-1,-1), (-1,1,1), (1,-1,1), (1,1,-1)

When combined, they form an 8-pointed star with perfect octahedral symmetry.

## Generation

```bash
# Generate base stella octangula
python3 polyhedra_generator.py --type stella_octangula

# Generate subdivided version (geodesic star)
python3 polyhedra_generator.py --type stella_octangula --frequency 3

# Custom size
python3 polyhedra_generator.py --type stella_octangula --radius 5.0
```

## Python API

```python
from polyhedra_generator import PolyhedraGenerator

# Basic stella octangula
stella = PolyhedraGenerator('stella_octangula', frequency=1, radius=1.0)
stella.generate()
stella.to_obj('stella_octangula.obj')

# Subdivided geodesic star
stella = PolyhedraGenerator('stella_octangula', frequency=4, radius=3.0)
stella.generate()
stella.to_obj('geodesic_star.obj')
```

## Use Cases

### Sacred Geometry
- Merkaba meditation symbol
- 3D Star of David
- Spiritual and esoteric art

### Architecture
- Decorative elements
- Structural nodes
- Lighting fixtures

### 3D Printing
- Geometric sculptures
- Jewelry (pendants, earrings)
- Mathematical models
- Christmas ornaments

### Science & Education
- Crystal structure models
- Symmetry demonstrations
- Geometry teaching aids

### Art & Design
- Logo design (3D star)
- Geometric patterns
- Decorative objects
- Game assets

## Subdivision Effects

| Frequency | Vertices | Faces | Description |
|-----------|----------|-------|-------------|
| 1V | 8 | 8 | Sharp 8-pointed star |
| 2V | 18 | 32 | Slightly rounded star |
| 3V | 32 | 72 | Smooth geodesic star |
| 4V | 50 | 128 | Very smooth star |

Higher frequencies create smoother, more spherical versions while maintaining the 8-pointed star structure.

## Relationship to Other Polyhedra

### Dual Relationship
- The stella octangula is the **first stellation** of the octahedron
- It's also the **compound** of a tetrahedron and its dual

### Convex Hull
- The convex hull of a stella octangula is a **cube**
- The 8 vertices lie at alternating corners of a cube

### Symmetry
- Same symmetry group as the **cube** and **octahedron** (octahedral symmetry)
- 48 symmetry operations

## Historical Note

The stella octangula was studied by:
- **Johannes Kepler** (1619) - First described in "Harmonices Mundi"
- Named from Latin: "stella" (star) + "octangula" (eight-cornered)
- One of the earliest known polyhedral compounds

## Visualization Tips

### In Blender
1. Import the .obj file
2. For wireframe view: Material → Blend Mode → Alpha Blend, Alpha = 0.3
3. Add Wireframe modifier to see internal structure
4. Enable "Shade Smooth" for subdivided versions

### Rendering
- Use transparent materials to show both tetrahedra
- Backface culling OFF to see internal faces
- Different colors for each tetrahedron (requires manual separation)

## Advanced Examples

### Merkaba Symbol
```python
# Large stella octangula for meditation/spiritual use
merkaba = PolyhedraGenerator('stella_octangula', frequency=1, radius=10.0)
merkaba.generate()
merkaba.to_obj('merkaba.obj')
```

### Jewelry Pendant
```python
# Small, high-detail stella for 3D printing
pendant = PolyhedraGenerator('stella_octangula', frequency=4, radius=0.015)  # 15mm
pendant.generate()
pendant.to_obj('stella_pendant.obj')
```

### Architectural Node
```python
# Large structural element
node = PolyhedraGenerator('stella_octangula', frequency=2, radius=2.0)
node.generate()
node.to_obj('structural_node.obj')
```

## Comparison with Similar Shapes

| Shape | Vertices | Faces | Points | Symmetry |
|-------|----------|-------|--------|----------|
| Stella Octangula | 8 | 8 | 8 | Octahedral |
| Octahedron | 6 | 8 | 6 | Octahedral |
| Cube | 8 | 6 | 8 | Octahedral |
| Tetrahedron | 4 | 4 | 4 | Tetrahedral |

## Mathematical Properties

### Volume
For a stella octangula with edge length *a*:
- Volume = (√2/3) × a³

### Surface Area
- Surface area = 2√3 × a² (both tetrahedra combined)

### Inscribed/Circumscribed
- Inscribed sphere radius: a/(2√6)
- Circumscribed sphere radius: a√(3/2)

## References

- **Kepler, J.** (1619). "Harmonices Mundi" - First description
- **Wenninger, M.** (1971). "Polyhedron Models" - Construction methods
- **Wikipedia:** https://en.wikipedia.org/wiki/Stella_octangula
- **MathWorld:** https://mathworld.wolfram.com/StellaOctangula.html

## See Also

- Platonic Solids (POLYHEDRA.md)
- Geodesic Domes (README.md)
- Advanced Geodesics (ADVANCED_GEODESICS.md)
