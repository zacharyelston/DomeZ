# Advanced Geodesic Transformations

Transform geodesic meshes into ellipsoids, tubes, spacecraft, and custom shapes.

Perfect for converting complex 3D models (like spacecraft) into geodesic triangle panels for manufacturing, 3D printing, or structural analysis.

## Overview

The advanced geodesics system provides three main capabilities:

1. **Ellipsoidal Geodesics** - Stretch spheres into ellipsoids with independent axis scaling
2. **Tubular Geodesics** - Create cylindrical/tubular structures with geodesic triangulation
3. **Mesh Geodesification** - Convert arbitrary 3D models into uniform geodesic triangle meshes

## Quick Start

```bash
# Generate all advanced shapes
python3 advanced_geodesics.py --type all

# Generate specific type
python3 advanced_geodesics.py --type ellipsoid
python3 advanced_geodesics.py --type tube
python3 advanced_geodesics.py --type spacecraft
```

## Ellipsoidal Geodesics

Transform spherical geodesics into ellipsoids by scaling each axis independently.

### Use Cases
- Spacecraft fuselages
- Pressure vessels
- Egg-shaped structures
- Planetary bodies (oblate planets)
- Aerodynamic shapes

### Python API

```python
from advanced_geodesics import EllipsoidalGeodesic

# Oblate ellipsoid (flattened sphere - like Saturn)
ellipsoid = EllipsoidalGeodesic(
    frequency=3,
    radius_x=3.0,  # Wide
    radius_y=3.0,  # Wide
    radius_z=1.5   # Flattened
)
ellipsoid.generate()
ellipsoid.to_obj('oblate_ellipsoid.obj')

# Prolate ellipsoid (elongated - like football/rugby ball)
ellipsoid = EllipsoidalGeodesic(
    frequency=4,
    radius_x=1.5,  # Narrow
    radius_y=1.5,  # Narrow
    radius_z=4.0   # Elongated
)
ellipsoid.generate()
ellipsoid.to_obj('prolate_ellipsoid.obj')

# Tri-axial ellipsoid (all different)
ellipsoid = EllipsoidalGeodesic(
    frequency=3,
    radius_x=2.0,
    radius_y=3.0,
    radius_z=4.0
)
ellipsoid.generate()
ellipsoid.to_obj('triaxial_ellipsoid.obj')
```

### Command Line

```bash
# Generate via Python script
python3 -c "
from advanced_geodesics import EllipsoidalGeodesic
e = EllipsoidalGeodesic(3, 2.0, 3.0, 4.0)
e.generate().to_obj('my_ellipsoid.obj')
"
```

## Tubular Geodesics

Create cylindrical and tubular structures with geodesic triangulation.

### Use Cases
- Spacecraft modules
- Pressure tubes
- Structural beams
- Pipes and conduits
- Cylindrical habitats

### Python API

```python
from advanced_geodesics import TubularGeodesic

# Short cylinder with caps
tube = TubularGeodesic(
    frequency=3,
    radius=1.0,
    length=3.0,
    caps=True  # Add end caps
)
tube.generate()
tube.to_obj('cylinder.obj')

# Long tube/pipe without caps
tube = TubularGeodesic(
    frequency=2,
    radius=0.5,
    length=10.0,
    caps=False  # Open-ended pipe
)
tube.generate()
tube.to_obj('pipe.obj')

# Thick structural beam
tube = TubularGeodesic(
    frequency=4,
    radius=2.0,
    length=8.0,
    caps=True
)
tube.generate()
tube.to_obj('beam.obj')
```

### Parameters

- `frequency` - Triangle density (2-6 recommended)
- `radius` - Tube radius in meters
- `length` - Tube length in meters
- `caps` - Add end caps (True/False)

## Spacecraft Geodesification

Specialized tools for converting spacecraft and complex shapes into geodesic panels.

### Use Cases
- MoonPies spacecraft models
- Rocket fuselages
- Space station modules
- Aircraft bodies
- Submarine hulls

### Python API

```python
from advanced_geodesics import SpacecraftGeodesifier

# Create spacecraft fuselage
spacecraft = SpacecraftGeodesifier(frequency=3)

vertices, faces = spacecraft.create_fuselage(
    length=15.0,        # Total length
    nose_radius=0.5,    # Nose cone radius
    body_radius=2.0,    # Main body radius
    tail_radius=1.0     # Tail radius
)

# Add solar panels
vertices, faces = spacecraft.add_solar_panel(
    vertices, faces,
    position=[0, 2.5, 0],  # [x, y, z]
    width=4.0,
    height=6.0,
    thickness=0.1
)

# Save to file
# (See full example in advanced_geodesics.py)
```

### Fuselage Profile

The `create_fuselage` method creates a varying-radius body:

```
Nose (20%) → Body (60%) → Tail (20%)
  ↓            ↓            ↓
nose_radius  body_radius  tail_radius
```

Perfect for aerodynamic or spacecraft shapes.

## Mesh Geodesification

Convert any existing 3D model into a geodesic triangle mesh.

### Use Cases
- Converting CAD models to geodesic panels
- Remeshing for 3D printing
- Creating uniform triangle meshes
- Structural analysis preparation

### Python API

```python
from advanced_geodesics import MeshGeodesifier

# Load existing .obj file
mesh = MeshGeodesifier(target_edge_length=0.5)
mesh.load_obj('moonpies_spacecraft.obj')

# Remesh to uniform triangles
mesh.remesh_uniform()

# Optional: Project to custom surface
def custom_surface(vertex):
    # Example: Inflate mesh slightly
    return vertex * 1.1

mesh.project_to_surface(custom_surface)

# Save geodesified mesh
mesh.to_obj('moonpies_geodesic.obj')
```

### Workflow for MoonPies Models

```python
# 1. Load MoonPies spacecraft model
mesh = MeshGeodesifier()
mesh.load_obj('moonpies_original.obj')

# 2. Subdivide to create more triangles
mesh.remesh_uniform()  # Creates 4x triangles

# 3. Optional: Subdivide again for finer mesh
mesh.remesh_uniform()  # Creates 16x triangles total

# 4. Save geodesic version
mesh.to_obj('moonpies_geodesic_panels.obj')
```

## Manufacturing Applications

### 3D Printing Panels

```python
from advanced_geodesics import EllipsoidalGeodesic

# Create spacecraft hull
hull = EllipsoidalGeodesic(
    frequency=4,  # Higher frequency = more panels
    radius_x=2.0,
    radius_y=2.0,
    radius_z=3.5
)
hull.generate()
hull.to_obj('hull_for_printing.obj')

# Each triangle becomes a printable panel
# Use Blender to:
# 1. Import .obj
# 2. Separate by loose parts (P → Separate → By Loose Parts)
# 3. Add thickness (Solidify modifier)
# 4. Export individual panels for printing
```

### Panel Extraction Workflow

1. Generate geodesic mesh
2. Import into Blender
3. Enter Edit Mode (Tab)
4. Select all faces
5. Mesh → Separate → By Loose Parts
6. Each triangle is now a separate object
7. Add Solidify modifier for thickness
8. Export for manufacturing

## Advanced Examples

### Egg-Shaped Habitat

```python
# Oblate ellipsoid with larger base
egg = EllipsoidalGeodesic(
    frequency=4,
    radius_x=3.0,
    radius_y=3.0,
    radius_z=4.5
)
egg.generate()
egg.to_obj('habitat_egg.obj')
```

### Modular Space Station

```python
# Central hub (sphere)
hub = EllipsoidalGeodesic(3, 3.0, 3.0, 3.0)
hub.generate()
hub.to_obj('station_hub.obj')

# Connecting tubes
tube1 = TubularGeodesic(2, 1.0, 8.0, caps=False)
tube1.generate()
tube1.to_obj('station_tube1.obj')

# Living modules (ellipsoids)
module = EllipsoidalGeodesic(3, 2.0, 2.0, 4.0)
module.generate()
module.to_obj('station_module.obj')
```

### Rocket Fuselage

```python
spacecraft = SpacecraftGeodesifier(frequency=4)

# Create streamlined fuselage
vertices, faces = spacecraft.create_fuselage(
    length=20.0,
    nose_radius=0.3,   # Sharp nose
    body_radius=1.5,   # Narrow body
    tail_radius=0.8    # Tapered tail
)

# Save
# (See spacecraft example in advanced_geodesics.py)
```

## Integration with Other Tools

### With Dome Generator

```python
from dome_generator import GeodesicDome
from advanced_geodesics import EllipsoidalGeodesic

# Create hemisphere base
dome = GeodesicDome(frequency=3, radius=5.0)
dome.generate()
dome.cut_to_partial(0.5)
dome.to_obj('base_hemisphere.obj')

# Create ellipsoidal top
top = EllipsoidalGeodesic(3, 5.0, 5.0, 3.0)
top.generate()
top.to_obj('top_ellipsoid.obj')

# Combine in Blender for complete structure
```

### With Polyhedra Generator

```python
from polyhedra_generator import PolyhedraGenerator
from advanced_geodesics import TubularGeodesic

# Create icosahedron nodes
node = PolyhedraGenerator('icosahedron', frequency=2, radius=1.0)
node.generate()
node.to_obj('node.obj')

# Create connecting tubes
tube = TubularGeodesic(2, 0.3, 5.0, caps=False)
tube.generate()
tube.to_obj('connector.obj')

# Assemble space frame in Blender
```

## Performance Considerations

### Triangle Count

| Frequency | Ellipsoid Faces | Tube Faces (5m) | Spacecraft Faces |
|-----------|----------------|-----------------|------------------|
| 2V | 80 | ~1,000 | ~1,500 |
| 3V | 180 | ~2,700 | ~4,300 |
| 4V | 320 | ~5,000 | ~8,000 |
| 5V | 500 | ~8,000 | ~12,000 |

### Recommendations

- **3D Printing**: Use frequency 3-4 for good detail
- **Visualization**: Use frequency 2-3 for performance
- **Manufacturing**: Use frequency 4-5 for precise panels
- **Structural Analysis**: Use frequency 3-4 for FEA

## Troubleshooting

### Mesh looks faceted

Increase frequency or enable smooth shading in Blender:
- Select object → Right-click → Shade Smooth

### Too many triangles

Decrease frequency or use simpler base shape

### Ellipsoid looks wrong

Check axis values - ensure they're in correct order (X, Y, Z)

### Tube has gaps

Increase frequency for smoother circumference

### Spacecraft panels don't align

Ensure all components use same frequency for consistent triangle size

## Future Enhancements

Planned features:
- Automatic panel thickness generation
- Connection point detection
- Stress analysis integration
- Direct CAM export
- Multi-material support
- Curved panel generation

## References

- **Geodesic Math**: Based on spherical subdivision
- **Ellipsoid Geometry**: https://en.wikipedia.org/wiki/Ellipsoid
- **Spacecraft Design**: Buckminster Fuller's principles
- **Manufacturing**: Geodesic panel construction techniques
