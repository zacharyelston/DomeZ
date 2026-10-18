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

### Frame

- **Connection**: **Joint boards** (the default), clockwise or anticlockwise, or **Struts only** for hub-to-hub struts.

  Joint is Acidome's hubless timber frame. Every board is a straight piece of lumber, width along the radius and thickness across, and the boards lock around each hub as a pinwheel. Each end is cut flat against the side of the next board clockwise (or anticlockwise), seen from outside. The construction is ported from Acidome and reproduces its boards, typing and cut drawings exactly on spheres. On ellipsoids and eggs every board still aims at the dome's centre, and the results match Acidome Height+.
- **Boards (mm)**: width × thickness, e.g. 120 × 40, or 89 × 38 for a 2×4 on edge.
- **Panel gap (mm)**: the gap a cast panel leaves to the boards around it, for the panel sizes on the cut sheet.

### Display

Panels (off, glass or solid), the frame, hubs (struts only), colours by type, and auto-rotate. Hovering a board or strut shows its type and length and highlights every piece of that type; clicking a row in the sidebar table pins the highlight.

### Boards and struts

With Joint boards, the sidebar lists the board types as Acidome types them: the same overall length to the millimetre and the same end cuts to 0.1°, with A the most numerous. Each row gives the overall length and the hub types at the board's ends, and the hub line gives the hub types. With struts only:

- **Group within**: struts whose lengths differ by less than this many millimetres count as one type.
- The table lists each type's length, its chord factor (length ÷ radius; for ellipsoids and eggs, the spread within the type) and its count.
- The hub line counts hubs by how many struts meet there.

### Export

- **Download OBJ**: vertices and faces in metres, Z up (as the Python tools write) or Y up. Optionally adds struts as `l` lines. The header records every setting and a link back to the viewer.
- **Boards OBJ** (Joint): every board as a closed solid, grouped by board type, like Acidome's "Framework .obj".
- **Cut sheet**: a printable page for the build.
  - **With Joint boards:**
    - **Boards table:** each board type's quantity, its overall length (corner to corner, in mm and inches), its shortest edge and the hub types at its ends, plus saw settings for each end with the outer face on the table (miter and blade bevel).
    - **Cut drawings:** one per board type, drawn as in Acidome. They show the outer face seen from outside, with mm marks along both edges where the cut crosses the outer face and the hidden inner face (dashed). Blue ∟ is the angle between the outer face and the cut, red the miter, circles the hub types (one spoke per board), and black ∟ the angle between each neighbouring panel and the board's side. Each end is drawn to scale as far in as its cut reaches, and a long board's middle is shortened between the ends. Every number matches Acidome's drawing of the same board, drawn the same way round.
    - **Hubs table:** Acidome's hub types, with the board types around each hub.
    - **Panels table:** Acidome's face types with the board along each side. For each it gives the triangle between the boards' centre planes, the **opening** between the boards' facing sides at their outer face (the panel form size), the opening at their inner face, and, with a panel gap set, the panel size.
  - **With struts only:**
    - **Struts table:** each type's letter, quantity, hub-to-hub length in mm and inches, any spread within the type, and which hub types it joins.
    - **Hubs table:** each type's quantity, and the strut types around it, anticlockwise as seen from outside (marked if it sits on the cut edge).
    - **Panels table:** each triangle type's quantity, side types, side lengths, corner angles and area. Mirror-image panels are one type.

  **Print** prints just the sheet. **Download CSV** saves the same tables (and, for boards, every drawing's marks) as a sectioned spreadsheet file.
- **Jig sheet** (Joint): how to cut every board end on a plain miter saw that only miters (0° bevel, up to 45° either way).
  - **The jig:** the board stands on its outer face in a **V-cradle** against the fence. A seat under the outer face rises toward the fence by the cradle's **lean**, and a back at 90° holds one wide face. Leaning the board turns each compound end cut into a plain vertical cut, so the saw only miters. A board can't lie flat for this, because a cradle only tilts a board about its length.
  - **Cradles:** with up to 8 different leans, the sheet draws a cross-section of each fixed cradle to build, grouped to 0.5°. With more (eggs need dozens), it shows one adjustable cradle, hinged at the V and set with an angle gauge, plus the list of lean settings.
  - **Cutting steps:** two passes. Pass 1 cuts one end of every board from its rough length; pass 2 cuts the other end to length against a stop. Each pass is in order of lean, then miter. Each step names the cradle, which wide face goes on the back (as on the cut drawing), which side of the blade the end lands on, the miter and the side of its long point. Where a miter would pass 45°, a fence wedge (in 5° steps) covers the rest.
  - **No-jig column:** the miter and blade bevel for the same end with the board flat on a wide face, for saws that tilt.
  - The sheet gives the tallest cut and how far from the fence the board reaches, so you can check them against your saw.
- **Copy link**: the viewer URL with the current settings.

### Python box

The `python3 -m domez dome …` command, or `from domez import …` snippet, that builds the same mesh. See [python.md](python.md).

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
| `frame` | `joint` | `joint`, `joint-ccw` (anticlockwise) or `struts` |
| `beamW`, `beamT` | `120`, `40` | board width (along the radius) and thickness (mm) |
| `gap` | `0` | panel gap to the boards (mm), for panel sizes |
| `panels` | `glass` | `off`, `glass` or `solid` |
| `showStruts`, `showHubs`, `colorTypes`, `spin` | `1`, `1`, `1`, `0` | display toggles |
| `upAxis` | `z` | OBJ up axis, `z` or `y` |
| `objLines` | `0` | `1` adds struts as OBJ lines |

The defaults match Acidome's own default dome (3V Kruschke, 7/12, radius 2.2 m).

Example: `web/index.html#shape=egg&freq=5&method=mexican&partial=3%2F4&flat=1`

## For scripting

The page exposes `window.DomeZ` (`buildModel`, `buildUnitGeodesic`, `acidomeHash`, `effectivePartial`, `set` and the current `state`) for checks from the browser console.
