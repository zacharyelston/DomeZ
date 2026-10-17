# Acidome compatibility

[Acidome](https://acidome.com/lab/calc/) (acidome.ru/lab/calc, by popitch) is a browser-based geodesic dome calculator. It turns a dome into buildable parts: beams with cut drawings, connector types, cover panels and tent patterns. DomeZ re-implements Acidome's geometry from scratch and extends it beyond spheres ("Acidome with Height+").

DomeZ is an independent project, not affiliated with Acidome, and contains none of Acidome's code.

## What is ported

| Acidome feature | DomeZ | Notes |
|---|---|---|
| Icosahedron and octahedron bases | ✓ | Acidome's own vertex coordinates and face order |
| Pentad, Cross, Triad orientation | ✓ | On the octahedron, "Pentad" means a vertex points up (4-fold), as in Acidome |
| Equal Chords | ✓ `chords` | Rows built from each face's lowest-numbered corner; each point is the normalised midpoint of two points already on the sphere |
| Equal Arcs | ✓ `arcs` | Equal-arc edge points; each inner hub is the spherical incentre of three great circles |
| Mexican | ✓ `mexican` | Arcs plus an iterative length equaliser per grid-line family (up to 300 passes) |
| Kruschke | ✓ `kruschke` | Chords, then the spokes around each base hub pulled to Kruschke's length. 3V and 4V icosahedra only |
| Partial cut | ✓ | Pentad: whole waves of edge-adjacent faces from the top hub until the fraction of all faces is reached. Cross and Triad: faces whose centroid is above y = 1 − 2f |
| Offered fractions | ✓ | Icosahedron: p/(4V) for p = V, V+2, … 3V, then 1/1. Octahedron: its own row list. Other fractions snap to the nearest offered one |
| Flat base (`Flat_`, `ground_`, `Align_`) | ✓ | Boundary hubs move along their meridians to the boundary height closest to the equator |
| URL hash | ✓ | The viewer writes Acidome's hash for the current dome |
| Class II and III subdivision, fullerenes | — | Not ported |
| Products: beams, connectors, cut drawings | — | Next on the [roadmap](roadmap.md) |
| Base, Scheme, Cover and Tent views | — | On the [roadmap](roadmap.md) |

The viewer's **Acidome** box shows the hash for the current dome, for example `3/4_Joint_3V_R3_beams_120x40`. Tokens must appear in Acidome's order: `[Octohedron_][Flat_]<partial>_[Method_][Symmetry_]<connector>_<V>V_R<radius>_beams_<W>x<T>`. Chords and Pentad are the defaults and are left out. Acidome only recognises the octahedron when it's spelled `Octohedron`.

## Verification

The viewer's output was compared with live acidome.com, using the hubs, struts and faces that Acidome's page builds. These 13 configurations match exactly: hub, strut and panel counts, every strut length (to 6 decimals on a unit sphere) and the dome's height range.

- Full spheres: 3V Chords, 3V Kruschke, 4V Arcs, 4V Mexican, 6V Mexican
- Cuts: 7/12 Kruschke 3V, 5/8 Mexican 4V, 1/2 Cross Chords 4V, 7/12 Triad Chords 3V, 2/3 Triad Mexican 6V
- Octahedron: 1/2 Chords 4V, 17/25 Cross Arcs 5V
- Flattened: 5/8 Chords 4V, 23/32 octahedron Chords 4V, 3/4 Arcs 5V

`tests/test_geodesics.py` keeps six of these as regression vectors for the Python package.

## Acidome quirks reproduced on purpose

- **Mexican hubs drift outward.** Acidome means to push every hub back onto the sphere after each equaliser pass, but it collects the hubs with underscore.js 1.8's `flatten()` on an object, which returns an empty list. Hubs therefore end up slightly outside the sphere (about 0.003% at 4V, 0.008% at 6V). DomeZ skips the renormalisation too, so lengths match what Acidome really outputs.
- **Kruschke falls back to Chords** outside 3V and 4V icosahedra.
- **Fractions snap** to the nearest row fraction Acidome offers for the base and frequency (for example 5/9 at 4V becomes 1/2).
- **Height mode** (a decimal partial such as `0.6`) is missing from the offline build, so DomeZ always sends Acidome a fraction.

## Offline copy

Acidome offers a free offline version of the calculator for use without internet ("Acidome offline ⤓" on acidome.com). It's a single HTML file. To use the viewer's **Offline copy** button, save it as:

```
vendor/acidome/acidome-offline.html
```

`vendor/` is git-ignored and the file is not distributed with DomeZ. Its code carries only a non-standard "Legalize Cannabis License" line, and the OBJ files it exports are marked CC-BY-SA. Even offline, the file still loads Google Analytics and a donation iframe when opened.
