# PolyForge Documentation

This directory contains documentation for the PolyForge toolkit.

## Core Documentation

- **[UNFOLDING_PRIMER.md](../UNFOLDING_PRIMER.md)** - Comprehensive primer on polyhedron unfolding algorithms
  - Synthesis of 15+ research papers (1997-2025)
  - Algorithm comparison and selection guide
  - Implementation details and mathematical foundations
  - Applications and future directions

## Archived Documentation

The `archive/` directory contains historical documentation and development notes:

- **ADVANCED_GEODESICS.md** - Advanced geodesic dome concepts
- **ACIDOME_MODES.md** - Acidome calculator modes reference
- **ARCHITECTURE.md** - System architecture notes
- **POLYHEDRA.md** - Polyhedra reference
- **QUICKSTART.md** - Original quickstart guide
- **RUST_GEODESIC_PLAN.md** - Rust implementation planning
- **STELLA_OCTANGULA.md** - Stella octangula documentation
- **UNFOLDING_ALGORITHMS.md** - Early unfolding algorithm notes
- **UNFOLDING_RESEARCH_FINDINGS.md** - Initial research findings

## Test Documentation

See `test_unfolding.py` for the comprehensive test suite that validates:
- Edge-sharing (faces share complete edges)
- Edge length preservation
- Overlap detection
- Completeness metrics

## Examples

Generated outputs can be found in:
- `polyhedra_output/` - OBJ files for 3D models
- `spec_sheets/` - SVG spec sheets with 3D view and unfolded layouts
