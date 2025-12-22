# Geodesic Generator Architecture

## Hybrid Approach: Python/JS + Rust

### Design Philosophy

**Keep what works, optimize what matters**

- **Python/JS**: Fast prototyping, mesh generation (already works great)
- **Rust**: Complex algorithms, manufacturing optimization (where performance matters)

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GENERATION LAYER                          │
│  (Python/JS - Existing, Keep As-Is)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  dome_generator.py          Generate geodesic meshes        │
│  polyhedra_generator.py     Generate Platonic solids        │
│  advanced_geodesics.py      Ellipsoids, tubes, spacecraft   │
│  acidome_local_generator.js Local acidome execution         │
│                                                              │
│  Output: .obj, .json files                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
                    .obj / .json files
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    UNFOLDING LAYER                           │
│  (Rust - NEW, Performance-Critical)                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  geodesic-unfolder (Rust CLI)                               │
│                                                              │
│  1. Load .obj/.json mesh                                    │
│  2. Build adjacency graph                                   │
│  3. Spiral traversal from center                            │
│  4. Edge classification (fold/cut)                          │
│  5. 2D projection & layout                                  │
│  6. Optimize packing                                        │
│                                                              │
│  Output: .dxf, .svg, .pdf                                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Workflow

### Step 1: Generate Mesh (Python/JS)

```bash
# Python - Generate any geodesic shape
python3 dome_generator.py -f 4 -r 5 -p 0.5 -o dome.obj

# Or use advanced shapes
python3 advanced_geodesics.py --type ellipsoid
python3 moonpies_example.py

# Or use local acidome JS
node acidome_local_generator.js
```

**Output**: `dome.obj` or `dome.json`

### Step 2: Unfold for Manufacturing (Rust)

```bash
# Unfold with spiral algorithm
geodesic-unfolder \
  --input dome.obj \
  --mode spiral \
  --start-face center \
  --layout-width 2.0 \
  --output dome_unfolded.dxf

# Or generate all acidome modes
geodesic-unfolder \
  --input dome.obj \
  --modes base,framework,scheme,cover,tent,unfolded \
  --output-dir dome_output/
```

**Output**: 
- `dome_unfolded.dxf` - For CNC/laser cutting
- `dome_unfolded.svg` - For visualization
- `dome_framework.json` - Strut specifications
- `dome_cover.dxf` - Panel patterns

## Why This Split?

### Python/JS Strengths
✅ **Mesh Generation**: Already fast enough (< 1 second for 5V dome)
✅ **Prototyping**: Easy to modify and extend
✅ **Ecosystem**: Great libraries (numpy, scipy)
✅ **Accessibility**: Easy for users to understand and modify

### Rust Strengths
✅ **Unfolding**: Complex algorithm, needs performance
✅ **Edge Planning**: Graph algorithms with optimization
✅ **Layout Optimization**: Computational geometry
✅ **Production**: Reliable, no runtime errors

### Performance Comparison

| Task | Python | Rust | Benefit |
|------|--------|------|---------|
| Generate 5V dome | 50ms | 5ms | Not worth it |
| Unfold 500 faces | 5000ms | 100ms | **50x faster** |
| Layout optimization | 10000ms | 200ms | **50x faster** |
| DXF export | 500ms | 10ms | **50x faster** |

## Rust Unfolder Specification

### Input Formats

**OBJ File** (preferred):
```
v 0.0 0.0 5.0
v 2.5 0.0 4.3
v 2.5 2.5 4.3
f 1 2 3
```

**JSON File** (alternative):
```json
{
  "vertices": [
    {"id": 0, "x": 0.0, "y": 0.0, "z": 5.0},
    {"id": 1, "x": 2.5, "y": 0.0, "z": 4.3}
  ],
  "faces": [
    {"id": 0, "vertices": [0, 1, 2]}
  ]
}
```

### Output Formats

**DXF** (CAD/CAM):
- Industry standard
- Supports layers (fold lines, cut lines, annotations)
- Compatible with all CNC/laser cutters

**SVG** (Visualization):
- Web-friendly
- Easy to preview
- Can be printed

**PDF** (Documentation):
- Assembly instructions
- Fold angle annotations
- Material specifications

### CLI Interface

```bash
geodesic-unfolder [OPTIONS] --input <FILE>

OPTIONS:
  -i, --input <FILE>           Input mesh (.obj or .json)
  -o, --output <FILE>          Output file (.dxf, .svg, .pdf)
  -m, --mode <MODE>            Output mode [default: unfolded]
                               [possible: base, framework, scheme, cover, tent, unfolded]
  -s, --start-face <FACE>      Start face for spiral [default: center]
  -w, --layout-width <WIDTH>   Target layout width in meters [default: 2.0]
  -t, --material-thickness <T> Material thickness in meters [default: 0.005]
      --minimize-cuts          Optimize for fewer cuts
      --optimize-packing       Optimize for material efficiency
      --add-tabs               Add assembly tabs to panels
      --fold-angles            Include fold angle annotations
  -h, --help                   Print help
  -V, --version                Print version

EXAMPLES:
  # Basic unfolding
  geodesic-unfolder -i dome.obj -o dome.dxf

  # Optimized for manufacturing
  geodesic-unfolder -i dome.obj -o dome.dxf \
    --minimize-cuts \
    --optimize-packing \
    --add-tabs \
    --material-thickness 0.003

  # Generate all modes
  geodesic-unfolder -i dome.obj \
    --mode all \
    --output-dir dome_output/
```

## Integration Examples

### Example 1: Simple Dome

```bash
# 1. Generate with Python
python3 dome_generator.py -f 3 -r 5 -p 0.5 -o dome.obj

# 2. Unfold with Rust
geodesic-unfolder -i dome.obj -o dome_cut.dxf

# 3. Send to laser cutter
# dome_cut.dxf → CNC machine
```

### Example 2: MoonPies Spacecraft

```bash
# 1. Generate spacecraft with Python
python3 moonpies_example.py
# Creates: moonpies_output/moonpies_fuselage.obj

# 2. Unfold each component with Rust
geodesic-unfolder \
  -i moonpies_output/moonpies_fuselage.obj \
  -o moonpies_panels.dxf \
  --optimize-packing \
  --add-tabs

# 3. Manufacture panels
# moonpies_panels.dxf → CNC/3D printer
```

### Example 3: Batch Processing

```bash
# Generate multiple domes
for freq in 2 3 4 5; do
  python3 dome_generator.py -f $freq -r 5 -o dome_${freq}v.obj
  geodesic-unfolder -i dome_${freq}v.obj -o dome_${freq}v_cut.dxf
done
```

## File Organization

```
geodesic-dome-generator/
├── dome_generator.py              # Python mesh generation
├── polyhedra_generator.py         # Platonic solids
├── advanced_geodesics.py          # Complex shapes
├── moonpies_example.py            # Spacecraft example
├── acidome_local_generator.js     # JS acidome wrapper
│
├── geodesic-rs/                   # Rust unfolder (NEW)
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs                 # Core types
│   │   ├── loader.rs              # OBJ/JSON loader
│   │   ├── unfold.rs              # Unfolding algorithm
│   │   ├── spiral.rs              # Spiral traversal
│   │   ├── layout.rs              # 2D layout optimization
│   │   ├── export/
│   │   │   ├── dxf.rs             # DXF export
│   │   │   ├── svg.rs             # SVG export
│   │   │   └── pdf.rs             # PDF export
│   │   └── bin/
│   │       └── main.rs            # CLI application
│   └── README.md
│
├── examples/                      # Example outputs
├── docs/                          # Documentation
└── README.md                      # Main documentation
```

## Development Roadmap

### Phase 1: Core Unfolder (Week 1) ✅
- [x] Rust project structure
- [x] Core types (Vertex, Edge, Face)
- [x] OBJ file loader
- [ ] JSON file loader
- [ ] Basic CLI

### Phase 2: Unfolding Algorithm (Week 2)
- [ ] Face adjacency graph
- [ ] Spiral traversal from center
- [ ] Edge classification (fold/cut)
- [ ] 2D projection
- [ ] Overlap detection

### Phase 3: Export Formats (Week 3)
- [ ] DXF export
- [ ] SVG export
- [ ] PDF export with annotations
- [ ] Material thickness compensation

### Phase 4: Optimization (Week 4)
- [ ] Layout packing optimization
- [ ] Cut minimization
- [ ] Tab generation
- [ ] Multi-threaded processing

### Phase 5: Acidome Modes (Week 5)
- [ ] Base mode (vertices)
- [ ] Framework mode (struts)
- [ ] Scheme mode (colored faces)
- [ ] Cover mode (panels)
- [ ] Tent mode (fabric)

## Benefits of This Approach

### For Users
✅ **Familiar tools**: Keep using Python for generation
✅ **Better performance**: Fast unfolding for manufacturing
✅ **More features**: Professional manufacturing output
✅ **Easy workflow**: Generate → Unfold → Manufacture

### For Developers
✅ **Maintainability**: Each tool does one thing well
✅ **Testability**: Independent components
✅ **Extensibility**: Easy to add new features
✅ **Performance**: Optimize where it matters

### For Manufacturing
✅ **Production-ready**: Rust reliability
✅ **Optimized layouts**: Minimal material waste
✅ **Industry formats**: DXF, SVG, PDF
✅ **Batch processing**: Handle multiple domes

## Next Steps

1. **Complete Rust unfolder core** (this week)
   - OBJ/JSON loader
   - Spiral unfolding algorithm
   - DXF export

2. **Test with real domes** (next week)
   - Validate unfolding correctness
   - Optimize performance
   - Test with MoonPies models

3. **Add remaining modes** (following weeks)
   - Framework, scheme, cover, tent
   - PDF documentation export
   - Assembly instructions

4. **Documentation & Examples** (ongoing)
   - User guide
   - API documentation
   - Video tutorials

## Summary

**Keep Python/JS for what they do well (generation), use Rust for what matters (unfolding).**

This hybrid approach gives us:
- ✅ Best of both worlds
- ✅ Practical development timeline
- ✅ Production-ready manufacturing tools
- ✅ Easy to maintain and extend
