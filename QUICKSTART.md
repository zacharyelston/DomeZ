# Quick Start Guide

Get started with geodesic dome generation in 60 seconds.

## Installation

No installation needed! Just Python 3.6+

```bash
git clone https://github.com/yourusername/geodesic-dome-generator.git
cd geodesic-dome-generator
```

## Generate Your First Dome

```bash
python3 dome_generator.py --presets
```

This creates 6 preset domes in `dome_output/`:
- `hemisphere_2v.obj` - Low detail hemisphere
- `hemisphere_3v.obj` - Standard hemisphere
- `hemisphere_4v.obj` - High detail hemisphere
- `three_quarter_3v.obj` - 3/4 sphere dome
- `full_sphere_3v.obj` - Complete geodesic sphere
- `greenhouse_3v.obj` - Greenhouse dome (7/12 sphere)

## Import into Blender

1. Open Blender
2. File → Import → Wavefront (.obj)
3. Navigate to `dome_output/`
4. Select a dome file
5. Click "Import OBJ"

Done! Your dome is now in Blender.

## Customize

Generate a custom dome:

```bash
# 4V hemisphere with 10m radius
python3 dome_generator.py -f 4 -r 10 -p 0.5

# Greenhouse dome (7/12 sphere, 3.5m radius)
python3 dome_generator.py -f 3 -r 3.5 -p 0.583

# Full sphere planetarium (8m radius)
python3 dome_generator.py -f 4 -r 8 -p 1.0
```

## Python API

```python
from dome_generator import GeodesicDome

# Create dome
dome = GeodesicDome(frequency=3, radius=5.0)
dome.generate()
dome.cut_to_partial(0.5)  # Hemisphere
dome.to_obj('my_dome.obj')
```

## Parameters Quick Reference

| Parameter | Values | Description |
|-----------|--------|-------------|
| `-f` frequency | 2-6 | Detail level (3 recommended) |
| `-r` radius | Any float | Dome radius in meters |
| `-p` partial | 0.0-1.0 | Sphere fraction (0.5 = hemisphere) |
| `-b` base | icosahedron/octahedron | Base shape |

## Common Dome Types

```bash
# Small shelter (2m radius)
python3 dome_generator.py -f 2 -r 2 -p 0.5

# Standard dome (5m radius)
python3 dome_generator.py -f 3 -r 5 -p 0.5

# Large event dome (10m radius, high detail)
python3 dome_generator.py -f 5 -r 10 -p 0.5

# Greenhouse (3.5m radius, 7/12 sphere)
python3 dome_generator.py -f 3 -r 3.5 -p 0.583
```

## Next Steps

- See `README.md` for full documentation
- Run `python3 examples.py` for more examples
- Check `dome_output/` for generated files

## Troubleshooting

**Dome too small in Blender?**
Scale it: Select dome → S → 10 → Enter (scales 10x)

**Want more/fewer triangles?**
Adjust frequency: `-f 2` (fewer) to `-f 6` (more)

**Need help?**
See full README.md or open an issue on GitHub
