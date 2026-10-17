# DomeZ documentation

| Document | What's in it |
|---|---|
| [viewer.md](viewer.md) | The web viewer: controls, exports, Acidome and Python boxes, URL parameters |
| [python.md](python.md) | The `domez` Python package: install, commands, API, output format, tests |
| [acidome.md](acidome.md) | What DomeZ takes from Acidome, how it was verified, quirks, the offline copy |
| [roadmap.md](roadmap.md) | Goals (snow-shedding forms, one engine for every build system) and what's next |
| [unfolding-primer.md](unfolding-primer.md) | Polyhedron unfolding: research synthesis, algorithms, implementation and tests |

## Archive

`archive/` keeps earlier notes for reference. Some of them describe plans or APIs that have since changed.

| File | Notes |
|---|---|
| [POLYFORGE_VISION.md](archive/POLYFORGE_VISION.md) | The original PolyForge pitch: geodesic-supported composite structures and offset meshes |
| [ACIDOME_MODES.md](archive/ACIDOME_MODES.md) | Early guesses at Acidome's output modes; superseded by [acidome.md](acidome.md) |
| [ADVANCED_GEODESICS.md](archive/ADVANCED_GEODESICS.md) | Ellipsoids, tubes and spacecraft (old `advanced_geodesics.py` API) |
| [ARCHITECTURE.md](archive/ARCHITECTURE.md) | Early system architecture notes |
| [POLYHEDRA.md](archive/POLYHEDRA.md) | Platonic solids reference |
| [QUICKSTART.md](archive/QUICKSTART.md) | Original quick start (old script names) |
| [RUST_GEODESIC_PLAN.md](archive/RUST_GEODESIC_PLAN.md) | Plan for the Rust implementation in `geodesic-rs/` |
| [STELLA_OCTANGULA.md](archive/STELLA_OCTANGULA.md) | The stella octangula compound |
| [UNFOLDING_ALGORITHMS.md](archive/UNFOLDING_ALGORITHMS.md) | Early unfolding literature review |
| [UNFOLDING_RESEARCH_FINDINGS.md](archive/UNFOLDING_RESEARCH_FINDINGS.md) | Research on edge sharing in unfolding |

Script names in archived notes predate the `domez` package. In current terms, `dome_generator.py` is `domez/dome.py` (`python3 -m domez dome`) and `advanced_geodesics.py` is `domez/shapes.py`.
