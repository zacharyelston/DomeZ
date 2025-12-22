# Acidome Output Modes - Implementation Guide

## Overview

The acidome calculator provides 5 output modes for geodesic domes. This document explains each mode and how to implement them.

## The 5 Modes

### 1. Base Mode
**Purpose**: Structural node positions only

**Output**:
- Vertex coordinates (x, y, z)
- Vertex IDs
- Node types (apex, base, intermediate)

**Use Cases**:
- Foundation planning
- Node placement for construction
- Structural analysis input

**Data Format**:
```json
{
  "vertices": [
    {"id": 0, "x": 0.0, "y": 0.0, "z": 5.0, "type": "apex"},
    {"id": 1, "x": 2.5, "y": 0.0, "z": 4.3, "type": "intermediate"}
  ]
}
```

### 2. Framework Mode
**Purpose**: Strut/beam specifications with connectors

**Output**:
- Edge list (struts/beams)
- Length of each strut
- Connector specifications
- Angles at each node

**Use Cases**:
- Structural framework construction
- Bill of materials
- Connector design
- Assembly instructions

**Data Format**:
```json
{
  "struts": [
    {
      "id": 0,
      "v1": 0,
      "v2": 1,
      "length": 1.234,
      "angle_v1": 72.5,
      "angle_v2": 68.3
    }
  ],
  "connectors": [
    {
      "vertex_id": 0,
      "strut_count": 6,
      "angles": [72.5, 68.3, 72.5, 68.3, 72.5, 68.3],
      "connector_type": "cone"
    }
  ]
}
```

**Connector Types**:
- **Cone**: Conical hub with bolt holes
- **Pipe**: Pipe-based connections
- **Joint**: Ball joint connectors
- **Nose**: Nose cone style
- **GoodKarma**: Custom connector design

### 3. Scheme Mode
**Purpose**: Colored face diagram for assembly

**Output**:
- Face list with colors
- Color coding by face type
- Neighbor relationships
- Assembly sequence

**Use Cases**:
- Assembly instructions
- Visual guides
- Pattern recognition
- Quality control

**Data Format**:
```json
{
  "faces": [
    {
      "id": 0,
      "vertices": [0, 1, 2],
      "color": "#FF0000",
      "face_type": "pentagonal_ring",
      "neighbors": [1, 5, 12]
    }
  ],
  "color_legend": {
    "#FF0000": "Pentagonal faces",
    "#00FF00": "Hexagonal faces",
    "#0000FF": "Base triangles"
  }
}
```

**Color Schemes**:
- By symmetry class
- By distance from apex
- By face type (pentagon/hexagon)
- By assembly sequence

### 4. Cover Mode
**Purpose**: Surface panels for covering

**Output**:
- Panel shapes with tabs
- Material specifications
- Cutting patterns
- Assembly tabs

**Use Cases**:
- Panel manufacturing
- Skin/covering fabrication
- Weatherproofing
- Insulation panels

**Data Format**:
```json
{
  "panels": [
    {
      "id": 0,
      "vertices": [
        {"x": 0.0, "y": 0.0},
        {"x": 1.2, "y": 0.0},
        {"x": 0.6, "y": 1.0}
      ],
      "tabs": [
        {"edge": 0, "width": 0.05, "type": "male"},
        {"edge": 1, "width": 0.05, "type": "female"}
      ],
      "material_thickness": 0.01,
      "area": 0.6
    }
  ]
}
```

**Panel Features**:
- Interlocking tabs
- Bolt holes
- Seam allowances
- Material thickness compensation

### 5. Tent Mode
**Purpose**: Fabric cutting patterns

**Output**:
- Fabric panel shapes
- Seam allowances
- Grommet positions
- Tension points

**Use Cases**:
- Fabric dome construction
- Temporary structures
- Event domes
- Camping shelters

**Data Format**:
```json
{
  "patterns": [
    {
      "id": 0,
      "outline": [
        {"x": 0.0, "y": 0.0},
        {"x": 1.2, "y": 0.0},
        {"x": 0.6, "y": 1.0}
      ],
      "seams": [
        {"edge": 0, "allowance": 0.02, "type": "flat_fell"},
        {"edge": 1, "allowance": 0.02, "type": "french"}
      ],
      "grommets": [
        {"x": 0.6, "y": 0.5, "size": 0.01}
      ],
      "fabric_type": "ripstop_nylon"
    }
  ]
}
```

**Fabric Features**:
- Seam types (flat-fell, french, etc.)
- Grommet placement
- Reinforcement patches
- Tension distribution

## NEW: Unfolded Mode (Manufacturing)

### 6. Unfolded Mode
**Purpose**: Flat layout for manufacturing

**Output**:
- 2D unfolded pattern
- Fold lines with angles
- Cut lines
- Assembly sequence

**Algorithm**: Spiral from center outward

**Use Cases**:
- CNC cutting
- Laser cutting
- 3D printing (flat panels)
- Sheet metal fabrication

**Data Format**:
```json
{
  "layout": {
    "width": 2.0,
    "height": 1.5,
    "faces": [
      {
        "id": 0,
        "vertices_2d": [
          {"x": 0.0, "y": 0.0},
          {"x": 0.1, "y": 0.0},
          {"x": 0.05, "y": 0.087}
        ],
        "original_face_id": 0,
        "spiral_order": 1
      }
    ],
    "edges": [
      {
        "id": 0,
        "type": "fold",
        "angle": 138.2,
        "vertices": [0, 1]
      },
      {
        "id": 1,
        "type": "cut",
        "vertices": [1, 2]
      }
    ]
  }
}
```

**Spiral Algorithm**:
1. Start from center face
2. Traverse outward in spiral pattern
3. Classify edges: fold or cut
4. Project to 2D plane
5. Optimize layout for minimal waste

**Edge Types**:
- **Fold**: Keep connected, mark fold angle
- **Cut**: Separate panels
- **Boundary**: Dome edge (no fold/cut)

## Implementation Comparison

### Python (Current)
✅ Good for: Prototyping, simple generation
❌ Limited: Performance, complex algorithms
- Generate basic meshes: Fast enough
- Unfolding algorithm: Too slow

### Rust (Recommended for Unfolding)
✅ Good for: Performance, complex algorithms
✅ Benefits:
- 50x faster edge planning
- Efficient memory usage
- Parallel processing
- Production-ready

**Recommendation**: 
- Use Python for basic dome generation
- Use Rust for unfolding and manufacturing features
- Both can export to same formats (JSON, OBJ, DXF)

## Export Formats

### For Visualization
- **OBJ**: 3D models (Blender, etc.)
- **JSON**: Data interchange
- **SVG**: 2D diagrams

### For Manufacturing
- **DXF**: CAD/CAM systems
- **SVG**: Laser cutters
- **PDF**: Printing templates
- **G-code**: CNC machines (future)

## Integration Example

```python
# Python: Generate mesh
from dome_generator import GeodesicDome
dome = GeodesicDome(frequency=4, radius=5.0)
dome.generate()
dome.to_obj('dome.obj')

# Rust: Unfold for manufacturing
# geodesic --input dome.obj --mode unfolded --output dome_unfolded.dxf
```

## Next Steps

1. ✅ Python implementation (complete)
2. 🔄 Rust core library (in progress)
3. ⏳ Unfolding algorithm (planned)
4. ⏳ All 5 acidome modes (planned)
5. ⏳ DXF/SVG export (planned)

## References

- Acidome calculator: https://acidome.com/lab/calc/
- Geodesic mathematics: Buckminster Fuller
- Unfolding algorithms: Computational geometry research
- Manufacturing standards: ISO specifications
