#!/usr/bin/env python3
"""
MoonPies Spacecraft Geodesification Example
Convert spacecraft models into geodesic triangle panels for manufacturing
"""

from advanced_geodesics import (
    EllipsoidalGeodesic, 
    TubularGeodesic, 
    SpacecraftGeodesifier,
    MeshGeodesifier
)
from pathlib import Path


def create_moonpies_fuselage():
    """Create MoonPies-style spacecraft fuselage"""
    print("Creating MoonPies Fuselage...")
    
    spacecraft = SpacecraftGeodesifier(frequency=4)
    
    # Main fuselage with aerodynamic profile
    vertices, faces = spacecraft.create_fuselage(
        length=18.0,        # 18m long spacecraft
        nose_radius=0.8,    # Rounded nose
        body_radius=2.5,    # 2.5m diameter body
        tail_radius=1.2     # Tapered tail
    )
    
    # Add solar panel arrays (port side)
    vertices, faces = spacecraft.add_solar_panel(
        vertices, faces,
        position=[-3.5, 0, 2.0],  # Left side, mid-body
        width=5.0,
        height=8.0,
        thickness=0.15
    )
    
    # Add solar panel arrays (starboard side)
    vertices, faces = spacecraft.add_solar_panel(
        vertices, faces,
        position=[3.5, 0, 2.0],   # Right side, mid-body
        width=5.0,
        height=8.0,
        thickness=0.15
    )
    
    # Save
    output_dir = Path('moonpies_output')
    output_dir.mkdir(exist_ok=True)
    
    lines = [
        "# MoonPies Spacecraft Fuselage",
        "# Geodesic panel construction",
        f"# Vertices: {len(vertices)}",
        f"# Faces: {len(faces)}",
        "# Ready for panel extraction and manufacturing",
        "",
    ]
    
    for v in vertices:
        lines.append(f"v {v.x:.6f} {v.y:.6f} {v.z:.6f}")
    
    lines.append("")
    
    for face in faces:
        lines.append(f"f {' '.join(map(str, face))}")
    
    output_file = output_dir / "moonpies_fuselage.obj"
    output_file.write_text('\n'.join(lines))
    print(f"✓ Saved: {output_file}")
    print(f"  Vertices: {len(vertices)}, Faces: {len(faces)}")
    print(f"  Each triangle can be extracted as a manufacturing panel")
    
    return output_file


def create_habitat_module():
    """Create ellipsoidal habitat module"""
    print("\nCreating Habitat Module...")
    
    # Ellipsoidal pressure vessel
    habitat = EllipsoidalGeodesic(
        frequency=5,      # High detail for manufacturing
        radius_x=3.0,     # 3m wide
        radius_y=3.0,     # 3m wide
        radius_z=4.5      # 4.5m tall (egg shape)
    )
    habitat.generate()
    
    output_dir = Path('moonpies_output')
    output_file = output_dir / "habitat_module.obj"
    habitat.to_obj(output_file)
    
    print(f"  Geodesic panels: {len(habitat.faces)}")
    print(f"  Suitable for pressurized habitat construction")
    
    return output_file


def create_docking_tube():
    """Create docking/connecting tube"""
    print("\nCreating Docking Tube...")
    
    # Cylindrical docking adapter
    tube = TubularGeodesic(
        frequency=3,
        radius=1.2,       # 1.2m diameter (standard docking port)
        length=4.0,       # 4m long
        caps=True         # Sealed ends
    )
    tube.generate()
    
    output_dir = Path('moonpies_output')
    output_file = output_dir / "docking_tube.obj"
    tube.to_obj(output_file)
    
    print(f"  Compatible with standard docking mechanisms")
    
    return output_file


def create_propellant_tank():
    """Create propellant tank (prolate ellipsoid)"""
    print("\nCreating Propellant Tank...")
    
    # Elongated ellipsoid for fuel storage
    tank = EllipsoidalGeodesic(
        frequency=4,
        radius_x=1.5,     # 1.5m diameter
        radius_y=1.5,     # 1.5m diameter
        radius_z=3.5      # 3.5m long
    )
    tank.generate()
    
    output_dir = Path('moonpies_output')
    output_file = output_dir / "propellant_tank.obj"
    tank.to_obj(output_file)
    
    print(f"  Optimized for structural efficiency")
    print(f"  Geodesic construction minimizes stress concentrations")
    
    return output_file


def geodesify_existing_model(input_file):
    """Convert existing spacecraft model to geodesic panels"""
    print(f"\nGeodesifying existing model: {input_file}")
    
    if not Path(input_file).exists():
        print(f"  ⚠️  File not found: {input_file}")
        print(f"  Skipping geodesification example")
        return None
    
    # Load existing model
    mesh = MeshGeodesifier(target_edge_length=0.5)
    mesh.load_obj(input_file)
    
    print(f"  Original: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces")
    
    # Remesh to uniform triangles
    mesh.remesh_uniform()
    print(f"  After 1st subdivision: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces")
    
    # Optional: Subdivide again for finer panels
    # mesh.remesh_uniform()
    # print(f"  After 2nd subdivision: {len(mesh.vertices)} vertices, {len(mesh.faces)} faces")
    
    # Save geodesified version
    output_dir = Path('moonpies_output')
    output_file = output_dir / f"geodesic_{Path(input_file).name}"
    mesh.to_obj(output_file)
    
    print(f"  Ready for panel extraction and manufacturing")
    
    return output_file


def create_assembly_guide():
    """Create assembly guide document"""
    guide = """
# MoonPies Spacecraft Assembly Guide

## Generated Components

1. **moonpies_fuselage.obj** - Main spacecraft body with solar panels
2. **habitat_module.obj** - Pressurized crew habitat
3. **docking_tube.obj** - Connecting/docking adapter
4. **propellant_tank.obj** - Fuel storage tank

## Panel Extraction (Blender Workflow)

### Step 1: Import Model
```
File → Import → Wavefront (.obj)
Select component file
```

### Step 2: Separate Triangles
```
1. Select object
2. Tab (Edit Mode)
3. A (Select All)
4. P → Separate → By Loose Parts
```

### Step 3: Add Thickness
```
1. Select all separated panels (A in Object Mode)
2. Add Modifier → Solidify
3. Set thickness: 0.05m (50mm) for structural panels
4. Apply modifier
```

### Step 4: Export for Manufacturing
```
1. Select panel
2. File → Export → STL (for 3D printing)
   OR
   File → Export → DXF (for CNC cutting)
```

## Manufacturing Specifications

### Panel Thickness
- Fuselage: 50mm (structural)
- Habitat: 75mm (pressure vessel)
- Docking Tube: 40mm (structural)
- Propellant Tank: 60mm (pressure vessel)

### Materials
- Aluminum alloy (6061-T6) for structural panels
- Titanium alloy (Ti-6Al-4V) for high-stress areas
- Composite (carbon fiber) for solar panel backing

### Connection Methods
1. **Welded Joints** - For pressure vessels
2. **Bolted Flanges** - For removable panels
3. **Adhesive Bonding** - For composite panels

## Assembly Sequence

1. Assemble fuselage panels (nose to tail)
2. Attach propellant tanks to fuselage
3. Install habitat module
4. Connect docking tube
5. Mount solar panel arrays
6. Seal and pressure test

## Quality Control

- Each panel: Dimensional tolerance ±0.5mm
- Weld inspection: X-ray or ultrasonic
- Pressure test: 1.5x operating pressure
- Leak test: Helium mass spectrometer

## Notes

- All geodesic panels are triangular for optimal stress distribution
- Panel sizes vary based on frequency setting (higher = smaller panels)
- Use frequency 4-5 for manufacturing-ready models
- Each triangle becomes a discrete manufacturable component
"""
    
    output_dir = Path('moonpies_output')
    guide_file = output_dir / "ASSEMBLY_GUIDE.md"
    guide_file.write_text(guide)
    print(f"\n✓ Created assembly guide: {guide_file}")


def main():
    """Generate complete MoonPies spacecraft component set"""
    print("=" * 60)
    print("MoonPies Spacecraft Geodesification")
    print("=" * 60)
    
    # Create output directory
    output_dir = Path('moonpies_output')
    output_dir.mkdir(exist_ok=True)
    
    # Generate components
    fuselage = create_moonpies_fuselage()
    habitat = create_habitat_module()
    docking = create_docking_tube()
    tank = create_propellant_tank()
    
    # Try to geodesify existing model if available
    # geodesify_existing_model('path/to/moonpies_model.obj')
    
    # Create assembly guide
    create_assembly_guide()
    
    print("\n" + "=" * 60)
    print("MoonPies Components Generated!")
    print("=" * 60)
    print(f"\nOutput directory: {output_dir}/")
    print("\nNext Steps:")
    print("1. Import .obj files into Blender")
    print("2. Separate triangles into individual panels")
    print("3. Add thickness with Solidify modifier")
    print("4. Export panels for manufacturing")
    print("\nSee ASSEMBLY_GUIDE.md for detailed instructions")
    print("=" * 60)


if __name__ == '__main__':
    main()
