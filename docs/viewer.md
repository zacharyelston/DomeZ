# Web viewer

`web/index.html` is a single-page 3D viewer for designing a dome, ellipsoid or egg and exporting it.

- **Hosted:** [zacharyelston.github.io/DomeZ](https://zacharyelston.github.io/DomeZ/), published from `web/` by `.github/workflows/pages.yml` on every push to `main` that changes the viewer.
- **Local:** open the file in any modern browser; there's no server or build step. It loads Three.js 0.160 from the jsDelivr CDN, so the first load needs a network connection.

```bash
open web/index.html          # macOS; or double-click the file
```

Every setting lives in the URL hash, so a copied link reopens the exact model.

## Controls

### Shape

- **Sphere**: radius in metres.
- **Ellipsoid**: independent X, Y and Z radii.
- **Egg**: a Hügelschäffer egg. It has a length (vertical), a breadth, an asymmetry (0–24% of the length; 0 gives an ellipsoid) and the pointed end up or down. The asymmetry moves the widest point toward the blunt end.

Every shape is built on a unit sphere and then stretched, so the cut and the hub pattern carry over from the sphere.

### Geodesic

- **Base**: icosahedron or octahedron.
- **Frequency**: 1–12V.
- **Method**: Chords, Arcs, Mexican or Kruschke (ported from Acidome, see [acidome.md](acidome.md)), or the flat grid of the original Python generator. Kruschke only exists for 3V and 4V icosahedra; elsewhere it falls back to Chords, as Acidome does.
- **Symmetry**: what points up. Pentad = a vertex, Cross = an edge, Triad = a face.

### Cut

- **Sphere part**: the fraction of the full sphere to keep. The Acidome methods only offer the fractions that end on complete rows of faces (the chips, which depend on the base and frequency), and the slider snaps to them. The flat grid takes any value.
- **Flatten base ring**: moves the hubs on the cut edge along their meridians to the edge height closest to the equator, so the dome stands on one plane (Acidome's rule).

### Display

Panels (off, glass or solid), struts, hubs, strut colours by type, and auto-rotate. Hovering a strut shows its type and length and highlights every strut of that type; clicking a row in the strut table pins the highlight.

### Struts

- **Group within**: struts whose lengths differ by less than this many millimetres count as one type.
- The table lists each type's length, its chord factor (length ÷ radius; for ellipsoids and eggs, the spread within the type) and its count.
- The hub line counts hubs by how many struts meet there.

### Build

Connector type and beam size. These are currently passed through to the Acidome link; the lumber cut drawings are on the [roadmap](roadmap.md).

### Export

- **Download OBJ**: vertices and faces in metres, Z up (as the Python tools write) or Y up. Optionally adds struts as `l` lines. The header records every setting and a link back to the viewer.
- **Cut list CSV**: per strut type the mean, minimum and maximum length and the count, then hub counts by valence.
- **Copy link**: the viewer URL with the current settings.

### Acidome and Python boxes

- **Acidome**: the same dome as an Acidome URL hash, with buttons for acidome.com and for a local offline copy (see [acidome.md](acidome.md#offline-copy)). The offline button only appears when the copy is present, so the hosted viewer shows acidome.com only. Acidome only builds spheres, so ellipsoids and eggs open as the nearest sphere; the box notes any other difference.
- **Python**: the `python3 -m domez dome …` command, or `from domez import …` snippet, that builds the same mesh. See [python.md](python.md).

## URL parameters

Only values that differ from the defaults are written to the hash.

| Key | Default | Meaning |
|---|---|---|
| `shape` | `sphere` | `sphere`, `ellipsoid` or `egg` |
| `r` | `2.2` | sphere radius (m) |
| `rx`, `ry`, `rz` | `3`, `3`, `4.5` | ellipsoid radii (m) |
| `eggL`, `eggB` | `6`, `4.4` | egg length and breadth (m) |
| `eggW` | `0.08` | egg asymmetry as a fraction of the length |
| `eggTip` | `up` | pointed end `up` or `down` |
| `base` | `icosahedron` | or `octahedron` |
| `freq` | `3` | frequency, 1–12 |
| `method` | `kruschke` | `chords`, `arcs`, `mexican`, `kruschke` or `flat` |
| `sym` | `pentad` | `pentad`, `cross` or `triad` |
| `partial` | `7/12` | a fraction (`3/4`) or decimal |
| `flat` | `0` | `1` flattens the base ring |
| `tol` | `1` | strut grouping tolerance (mm) |
| `conn` | `GoodKarma` | Acidome connector token, e.g. `Joint`, `Piped_D108` |
| `beamW`, `beamT` | `120`, `40` | beam width and thickness (mm) |
| `panels` | `glass` | `off`, `glass` or `solid` |
| `showStruts`, `showHubs`, `colorTypes`, `spin` | `1`, `1`, `1`, `0` | display toggles |
| `upAxis` | `z` | OBJ up axis, `z` or `y` |
| `objLines` | `0` | `1` adds struts as OBJ lines |

The defaults match Acidome's own default dome (3V Kruschke, 7/12, radius 2.2 m).

Example: `web/index.html#shape=egg&freq=5&method=mexican&partial=3%2F4&flat=1`

## For scripting

The page exposes `window.DomeZ` (`buildModel`, `buildUnitGeodesic`, `acidomeHash`, `effectivePartial`, `set` and the current `state`) for checks from the browser console.
