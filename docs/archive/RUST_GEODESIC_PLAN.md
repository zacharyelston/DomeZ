# Rust Geodesic Toolkit - Implementation Plan

## Overview

High-performance Rust implementation of geodesic dome generator with acidome output modes and manufacturing-ready unfolding algorithm.

## Architecture

```
geodesic-rs/
├── src/
│   ├── lib.rs              # Core types and traits
│   ├── geometry.rs         # Vector math, subdivision
│   ├── polyhedra.rs        # Base polyhedra generation
│   ├── output/
│   │   ├── mod.rs          # Output mode trait
│   │   ├── base.rs         # Vertices only
│   │   ├── framework.rs    # Edges/struts with connectors
│   │   ├── scheme.rs       # Colored face diagram
│   │   ├── cover.rs        # Surface panels
│   │   └── tent.rs         # Fabric cutting pattern
│   ├── unfold/
│   │   ├── mod.rs          # Unfolding algorithm
│   │   ├── spiral.rs       # Spiral pattern from center
│   │   ├── edge_plan.rs    # Edge planning & optimization
│   │   └── layout.rs       # 2D layout generation
│   └── bin/
│       └── main.rs         # CLI application
├── Cargo.toml
└── README.md
```

## Features

### 1. Acidome Output Modes

#### Base Mode
- **Output**: Vertices only (nodes)
- **Format**: JSON with coordinates
- **Use**: Structural node positions
- **Data**: `{id, x, y, z, type}`

#### Framework Mode
- **Output**: Edges/struts with connection details
- **Format**: JSON with edge list + connector specs
- **Use**: Structural framework construction
- **Data**: 
  - Edge: `{id, v1, v2, length, angle1, angle2}`
  - Connector: `{vertex_id, edges[], angles[]}`

#### Scheme Mode
- **Output**: Colored face diagram
- **Format**: SVG or JSON with face colors
- **Use**: Assembly instructions, visualization
- **Data**: `{face_id, vertices[], color, neighbors[]}`
- **Colors**: Based on face type/symmetry

#### Cover Mode
- **Output**: Surface panels with tabs
- **Format**: DXF/SVG for cutting
- **Use**: Panel manufacturing
- **Data**: `{panel_id, vertices[], tabs[], material_thickness}`

#### Tent Mode
- **Output**: Fabric cutting patterns
- **Format**: DXF/SVG with seam allowances
- **Use**: Fabric dome construction
- **Data**: `{pattern_id, outline[], seams[], grommets[]}`

### 2. Unfolding Algorithm (NEW)

#### Spiral Unfolding
```rust
// Unfold geodesic from center, spiraling outward
// Optimizes for:
// 1. Minimal cuts
// 2. Continuous spiral path
// 3. Manufacturing efficiency
// 4. Flat layout without overlaps

pub struct UnfoldConfig {
    start_face: FaceId,        // Center face to start spiral
    spiral_direction: Rotation, // CW or CCW
    cut_strategy: CutStrategy,  // Minimize cuts vs. optimize shape
    layout_width: f64,          // Target layout width
}
```

#### Algorithm Steps

1. **Face Selection**
   - Start from center face (or user-specified)
   - Build adjacency graph
   - Identify spiral path using BFS/DFS

2. **Edge Planning**
   - Classify edges: `Keep` (fold) or `Cut` (separate)
   - Minimize cuts while maintaining flat layout
   - Track dihedral angles for folding

3. **Spiral Traversal**
   ```
   Center → Ring 1 → Ring 2 → ... → Outer Ring
   ```
   - Visit faces in spiral order
   - Maintain connectivity
   - Avoid overlaps in 2D projection

4. **2D Layout**
   - Project 3D faces to 2D plane
   - Rotate faces to align edges
   - Optimize packing density
   - Add fold lines and cut lines

5. **Output Generation**
   - DXF: For CNC cutting
   - SVG: For visualization
   - JSON: For programmatic use
   - PDF: For printing

#### Edge Classification

```rust
pub enum EdgeType {
    Fold(f64),      // Keep edge, fold at angle (radians)
    Cut,            // Cut this edge
    Boundary,       // Dome boundary (base)
}
```

#### Optimization Goals

1. **Minimize Cuts**: Fewer cuts = stronger structure
2. **Maximize Continuity**: Long continuous strips
3. **Optimize Layout**: Minimize material waste
4. **Maintain Geometry**: Preserve angles and dimensions

## Performance Considerations

### Why Rust?

1. **Speed**: 10-100x faster than Python for complex algorithms
2. **Memory**: Efficient handling of large meshes (10k+ faces)
3. **Parallelism**: Multi-threaded edge planning
4. **Safety**: No runtime errors in production

### Benchmarks (Estimated)

| Operation | Python | Rust | Speedup |
|-----------|--------|------|---------|
| Generate 5V icosahedron | 50ms | 2ms | 25x |
| Subdivide to 10k faces | 500ms | 15ms | 33x |
| Edge planning (1k edges) | 2000ms | 50ms | 40x |
| Unfolding algorithm | 5000ms | 100ms | 50x |

### Memory Usage

- Python: ~500MB for 5V dome
- Rust: ~50MB for 5V dome (10x reduction)

## Implementation Priority

### Phase 1: Core (Week 1)
- [x] Project structure
- [ ] Core types (Vertex, Edge, Face, Mesh)
- [ ] Polyhedra generators (5 Platonic solids)
- [ ] Subdivision algorithm
- [ ] Basic OBJ export

### Phase 2: Output Modes (Week 2)
- [ ] Base mode (vertices JSON)
- [ ] Framework mode (edges + connectors)
- [ ] Scheme mode (colored faces SVG)
- [ ] Cover mode (panels DXF)
- [ ] Tent mode (fabric patterns)

### Phase 3: Unfolding (Week 3)
- [ ] Face adjacency graph
- [ ] Spiral traversal algorithm
- [ ] Edge classification
- [ ] 2D projection & layout
- [ ] Overlap detection & resolution

### Phase 4: Optimization (Week 4)
- [ ] Multi-threaded processing
- [ ] Layout optimization
- [ ] Material waste minimization
- [ ] CLI with all options

## Usage Examples

### Generate Framework
```bash
geodesic --type icosahedron --frequency 3 --mode framework --output dome.json
```

### Generate Unfolded Pattern
```bash
geodesic --type icosahedron --frequency 4 \
  --mode unfolded \
  --spiral-start center \
  --layout-width 2.0 \
  --output dome_unfolded.dxf
```

### Generate All Modes
```bash
geodesic --type icosahedron --frequency 3 --mode all --output-dir dome_output/
```

## Python Integration

Keep Python version for:
- Rapid prototyping
- Simple use cases
- Educational purposes

Use Rust version for:
- Production manufacturing
- Large-scale generation
- Performance-critical applications
- Complex unfolding

## API Design

```rust
use geodesic_rs::*;

// Generate mesh
let mesh = Icosahedron::new()
    .frequency(4)
    .radius(5.0)
    .generate();

// Export framework
let framework = output::Framework::new(&mesh)
    .with_connector_type(ConnectorType::Cone)
    .with_pipe_diameter(0.108)
    .export_json("framework.json")?;

// Unfold for manufacturing
let unfolded = unfold::Spiral::new(&mesh)
    .start_from_center()
    .minimize_cuts()
    .layout_width(2.0)
    .export_dxf("unfolded.dxf")?;
```

## Integration with Existing Tools

### With Python Generator
- Rust generates optimized meshes
- Python handles visualization
- Share via JSON/OBJ format

### With Blender MCP
- Rust exports to OBJ
- Blender imports and renders
- MCP automates workflow

### With MoonPies
- Generate spacecraft panels
- Unfold for manufacturing
- Export cutting patterns

## Testing Strategy

### Unit Tests
- Each polyhedron type
- Subdivision correctness
- Edge planning logic
- Layout overlap detection

### Integration Tests
- Full pipeline (generate → unfold → export)
- All output modes
- Various frequencies (1V-6V)

### Performance Tests
- Benchmark against Python
- Memory usage profiling
- Large mesh handling (10k+ faces)

## Documentation

- [ ] API documentation (rustdoc)
- [ ] User guide
- [ ] Algorithm explanation
- [ ] Manufacturing guide
- [ ] Examples gallery

## Deployment

### As Library
```toml
[dependencies]
geodesic-rs = "0.1"
```

### As CLI Tool
```bash
cargo install geodesic-rs
geodesic --help
```

### As WASM (Future)
- Run in browser
- Interactive unfolding
- Real-time preview

## Comparison: Rust vs JavaScript

| Feature | Rust | JavaScript |
|---------|------|------------|
| Speed | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Memory | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Type Safety | ⭐⭐⭐⭐⭐ | ⭐⭐ |
| Ecosystem | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Learning Curve | ⭐⭐ | ⭐⭐⭐⭐ |
| Browser Support | ⭐⭐⭐ (WASM) | ⭐⭐⭐⭐⭐ |

**Recommendation**: Use Rust for the unfolding algorithm and complex edge planning. The performance gains are substantial for manufacturing applications.

## Next Steps

1. Complete core Rust implementation
2. Implement unfolding algorithm
3. Add all 5 output modes
4. Create comprehensive tests
5. Write documentation
6. Publish to crates.io

## Questions to Resolve

1. **Spiral Direction**: Always start from center, or allow custom start?
2. **Cut Strategy**: Minimize cuts vs. optimize shape?
3. **Material Thickness**: Account for in unfolding?
4. **Tab Design**: Automatic tab generation for assembly?
5. **Fold Angles**: Export fold angle data for bending?

## References

- Acidome calculator: https://acidome.com/lab/calc/
- Geodesic math: Buckminster Fuller's principles
- Unfolding algorithms: Computational origami research
- DXF format: AutoCAD specification
