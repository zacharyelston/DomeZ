
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
