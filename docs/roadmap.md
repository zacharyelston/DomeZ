# Roadmap

## Goal

Anyone should be able to design an optimal shelter themselves (dome, ellipsoid or egg) and come away with plans to build it. Every part (frame, skins, panels) is derived from one geometry engine, so the parts fit each other.

Two things drive the work:

1. **Snow.** Geodesic domes perform well in cold climates, but their shallow crowns hold snow, and snow load governs the structure. Egg and ellipsoid forms with steeper pitches shed snow, which makes geodesic shelters practical where they would otherwise be over-built.
2. **One engine, many build systems.** Acidome turns a sphere into beams, hubs, covers and tents. DomeZ extends that to non-spherical forms and to other build systems, such as double skins and cast MgO (Sorel) foam panels or blocks in bags, all computed from the same mesh.

## Done

- Acidome's Chords, Arcs, Mexican and Kruschke subdivision, row cuts and flat base, matching acidome.com exactly ([acidome.md](acidome.md)).
- Ellipsoid and Hügelschäffer egg shapes, in the [web viewer](viewer.md) and the [Python package](python.md), kept face-for-face identical by tests.
- Strut and hub tables, a printable cut sheet (struts, hubs and panel triangles, with CSV) and OBJ export.
- Steepest-edge unfolding into flat nets, with tests on the Platonic solids and 3V domes ([unfolding primer](unfolding-primer.md)).

## Next: build outputs (Acidome's tabs, generalised)

Acidome has five views: Base, Framework, Scheme, Cover and Tent. DomeZ provides them for spheres first, checked against acidome.com, and then for ellipsoids and eggs.

1. **Framework: lumber cut drawings.** Done for Acidome's **Joint** (a hubless pinwheel of boards). The viewer shows the boards in 3D, types them as Acidome does and prints a cut drawing per board type with saw settings, matching acidome.com on spheres and Acidome Height+ on ellipsoids and eggs. Next: Acidome's other connections (GoodKarma, Piped, Cone, Semicone).
2. **Scheme: assembly map.** Every board labelled with its type letter and every hub and face with its number, printable.
3. **Base: foundation layout.** Base ring lengths, centre-to-hub distances and anchor positions.
4. **Cover: panels.** Panel types with their real dimensions inside the frame. A panel calculator for cast panels (core thickness, skins, volume, weight, batch count) aimed at MgO (Sorel) foam panels.
5. **Tent: nets and bags.** Flat patterns from the unfolder, including triangular foam-in-bag envelopes.
6. **Snow.** A pitch map that colours panels by slope and reports the near-flat crown area, plus a simple per-panel snow-load estimate from a ground snow load, to compare forms.
7. **Double skins.** Inner and outer offset meshes with a set cavity and the struts that connect them.
8. **Imperial units.** Nominal lumber sizes (2×4, 2×6, …) and fractional-inch output.

### Boards on ellipsoids and eggs

On a sphere every board's wide face points at the centre, so boards never twist and every hub has one shared axis. Off the sphere there are two options, measured here on real meshes:

| Form (Chords) | One shared centre: board axis vs. surface normal | Following the surface: board twist |
|---|---|---|
| Sphere R3, 4V, 5/8 | 0° | 0° |
| Ellipsoid 1.2 : 1, 4V, 5/8 | 5.7° average, 8.5° worst | 1.3° average, 2.6° worst |
| Ellipsoid 1.5 : 1, 4V, 5/8 | 12.7° average, 19.1° worst | 2.7° average, 5.0° worst |
| Oblate 4 × 4 × 2.5 m, 4V, 5/8 | 14.0° average, 20.5° worst | 3.9° average, 10.3° worst |
| Egg 6 × 4.4 m, 8%, 5V, 3/4 | 13.9° average, 20.4° worst | 2.2° average, 4.7° worst |

- **One shared centre** keeps Acidome's maths unchanged and the boards untwisted, but tilts the boards relative to the skin.
- **Following the surface** keeps boards flush with the skin, which matters for panel cladding. Aiming each board along the average of its two hubs' normals halves that twist at each end, and the remainder is absorbed at the joint.

Joint works with either. The plan is to follow the surface by default and report each board's twist.

## Engine

Today the geometry exists twice: in JavaScript (`web/index.html`) and in Python (`domez/`). Tests keep the two face-for-face identical. To make "one engine" literal, the options are:

- a shared JavaScript module used by both the viewer and a command line
- a Rust core (see the `geodesic-rs/` prototype) compiled to WebAssembly for the viewer, with Python bindings

This decision is still open.

## Earlier material

The original PolyForge vision for composite structures (offset meshes, multi-layer skins) is kept in [archive/POLYFORGE_VISION.md](archive/POLYFORGE_VISION.md); its offset-mesh idea feeds the double-skin item above.
