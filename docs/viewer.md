# Web viewer

`web/index.html` is a 3D viewer for designing a dome, ellipsoid or egg and exporting it. Its geometry, lumber, jig and sheet code lives in `web/js/`, loaded as plain scripts.

- **Hosted:** [zacharyelston.github.io/DomeZ](https://zacharyelston.github.io/DomeZ/), published from `web/` by `.github/workflows/pages.yml` on every push to `main` that changes the viewer.
- **Local:** open the file in any modern browser; there's no server or build step, and it works straight from the folder (`file://`). It loads Three.js 0.160 from the jsDelivr CDN, so the first load needs a network connection.

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

- **Connection**: **Joint boards** (the default), clockwise or anticlockwise, **Struts only** for hub-to-hub struts, or **Gridshell** (a prototype, below).

  Joint is Acidome's hubless timber frame. Every board is a straight piece of lumber, width along the radius and thickness across, and the boards lock around each hub as a pinwheel. Each end is cut flat against the side of the next board clockwise (or anticlockwise), seen from outside. The construction is ported from Acidome and reproduces its boards, typing and cut drawings exactly on spheres. On ellipsoids and eggs every board still aims at the dome's centre, and the results match Acidome Height+.
- **Boards (mm)**: width × thickness, e.g. 120 × 40, or 89 × 38 for a 2×4 on edge.
- **Panel gap (mm)**: the gap a cast panel leaves to the boards around it, for the panel sizes on the cut sheet.

#### Gridshell (prototype)

A timber gridshell is a lattice of long, thin laths bent elastically into shape and bolted where they cross, like Frei Otto's Mannheim Multihalle or the Downland Gridshell. Here each lath lies flat on the skin and follows a geodesic line, the straightest path on the surface. Along a geodesic a flat lath only bends the easy way, about its thin side, never edgewise.

- **Layout:** how the laths run.
  - **Crown ring** (round plans: a sphere, an egg, or an ellipsoid with equal X and Y radii). Laths leave N evenly spaced points on the base ring and climb to a crown ring, where they run level. On a surface of revolution every lath that leaves the base at the same angle has the same shape (Clairaut's rule: distance from the axis × sine of the angle to the vertical stays constant), so every lath is the same. The ring's radius is the base radius × sine of the lath angle, so steeper laths leave a smaller opening at the top.
  - **Over the top** (any shape, and the only layout for a long plan). The ridge is the line over the top along the plan's long axis, from base to base. Laths cross it at even spacing, at the lath angle from the fall line there, and run down both sides to the base, like the Downland Gridshell's diagonal grid. Near the ends the shell curves more tightly and laths of one family converge. Where two would cross, the one that has run further from the ridge stops on the other and is bolted to it, so no lath ever crosses its own family. No two laths are quite alike: laths with the same length and the same crossing marks, to the millimetre and read from either end, share a type and a drilling template. A lath, the lath opposite it (turned 180°) and their two mirror images make one type.
  - Either way, family A turns one way and family B mirrors it. A laths lie in the outer layer and B laths in the inner layer, and they are bolted at every crossing.
  - The laths are traced on the surface itself, x²/a² + y²/b² = g(z), by integrating the geodesic equation; on round shapes this agrees with the Clairaut solution to a fraction of a micrometre.
- **Laths:** the number per family, and their angle from the fall line: at the base ring (crown) or where they cross the ridge (over the top).
- **Lath (mm):** width × ply thickness × plies. Plies are stacked and bolted, not glued, so each bends on its own thickness.
- **Timber:** bending stiffness E (GPa) and the allowable bending stress (MPa). The bend check compares E × ply thickness ÷ (2 × tightest bend radius) with that limit, and gives the thickest safe ply.
- **Stock:** the length of the stock laths (2438 mm is 8 ft, 1829 mm is 6 ft) and the price of one. Each ply is laid end to end from stock. Ply 1 starts with a whole length and each further ply with a shorter piece, so the joints in neighbouring plies are staggered and each is bridged by the other plies; a single ply needs a splice plate at each joint. A joint that would land within 100 mm (or twice the lath width) of a crossing bolt moves back until it is clear, and no end piece is shorter than a quarter length (at most 600 mm). The cut pieces are packed into stock lengths, largest first, with a 3 mm kerf, to count the lengths to buy and their cost.

The 3D view shows the laths as ribbons on their two layers, a bolt at each crossing, a pale band at each joint, and the base outline with the crown ring or the ridge. Hovering a lath names it, with its type, length, crossings and joints, and highlights its type. The cut sheet becomes a gridshell sheet:

- **Crown:** every lath is the same, so it gives one table of crossings (distance along the lath, height, the angle between the laths, and the bend radius there) and one table of joints for each ply. One drilling template serves every lath, turned over for family B.
- **Over the top:** a crossing table and a joints table for each lath type, then a setting-out table: for each lath, its type, where it crosses the ridge, and its two ends, either on the base (X and Y from the centre) or on the lath of its own family it stops on.

Not yet covered: covering the opening above the crown ring, twist and buckling checks, loads, and laths that start at different angles.

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
  - **Boards in the jig:** a card per board type, like the cut sheet's: the board's cut drawing, then each end seen from above on the saw table. The top view shows the fence, the board in its cradle, the blade at its miter from square, the long point and the offcut, with that end's cradle, face, side of the blade, miter, length and no-jig settings beside it.
  - **Cutting order:** two passes. Pass 1 cuts one end of every board from its rough length; pass 2 cuts the other end to length against a stop. Each pass is in order of lean, then miter. Each step names the cradle, which wide face goes on the back (as on the cut drawing), which side of the blade the end lands on, the miter and the side of its long point. Where a miter would pass 45°, a fence wedge (in 5° steps) covers the rest.
  - **No-jig column:** the miter and blade bevel for the same end with the board flat on a wide face, for saws that tilt.
  - The sheet gives the tallest cut and how far from the fence the board reaches, so you can check them against your saw.
- **Lath jig sheet** (Gridshell): the same button gives a cradle for each kind of lath crossing, to strap or bolt an A lath (outer layer) to the B lath (inner layer) it crosses while both sit as they do in the shell.
  - **The jig:** a block whose top is a copy of the skin round the crossing, with lath B in a groove one lath deep along its line and lath A over it between two fences along its line. The pair is clamped in it to drill the bolt hole along the skin's normal, or to pass a strap through the block's slot, under B and over A. In the jig's frame z is the skin's normal and x the bisector of the two laths; the skin round the crossing is fitted as a quadric, which carries each lath's bend radius and twist (its geodesic torsion) from the lath spec.
  - **Jigs:** crossings whose turn (the angle from lath B's line to lath A's line, seen from outside) is within 1° and whose sag over the block is within 0.5 mm share a jig. On the crown layout that is one jig per ring of crossings (or fewer); over the top, every distinct turn and curvature is a jig, and a jig's mirror image is another jig. The block's size grows with the laths' overlap, from 200 to 360 mm square.
  - **Cards:** one per jig: the plan seen from outside (A on top, the bolt at the crossing, the strap line dashed), a section along each lath with the skin's sag over the block, and the block, groove, radii, twists, overlap and strap length. Then a table of every jig and, for each lath, the jig at each of its crossings in order from its start.
  - **Download OpenSCAD** saves every jig as a printable solid: a table of the jigs (turn, quadric, block size) and the modules that build one, with the lath size, clearance, fences, bolt and strap as settings at the top of the file. Render one jig with `which`, or all in a row with `show_all`. **Download CSV** saves the tables.
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
| `frame` | `joint` | `joint`, `joint-ccw` (anticlockwise), `struts` or `gridshell` |
| `beamW`, `beamT` | `120`, `40` | board width (along the radius) and thickness (mm) |
| `gap` | `0` | panel gap to the boards (mm), for panel sizes |
| `panels` | `glass` | `off`, `glass` or `solid` |
| `showStruts`, `showHubs`, `colorTypes`, `spin` | `1`, `1`, `1`, `0` | display toggles |
| `upAxis` | `z` | OBJ up axis, `z` or `y` |
| `objLines` | `0` | `1` adds struts as OBJ lines |
| `lathLayout` | `crown` | gridshell: `crown` (round plans) or `over` (over the top; other plans always use it) |
| `lathN` | `20` | gridshell: laths per family (3–120) |
| `lathAngle` | `30` | gridshell: lath angle from the fall line at the base ring or the ridge, degrees (2–80) |
| `lathW`, `lathT`, `lathPlies` | `50`, `12`, `2` | gridshell: lath width and ply thickness (mm), plies per lath |
| `lathE`, `lathFb` | `10`, `20` | gridshell: E (GPa) and allowable bending stress (MPa) |
| `lathStock`, `lathPrice` | `2438`, `2.5` | gridshell: stock lath length (mm) and price of one length |

The defaults match Acidome's own default dome (3V Kruschke, 7/12, radius 2.2 m).

Example: `web/index.html#shape=egg&freq=5&method=mexican&partial=3%2F4&flat=1`

## Code layout

The page (`web/index.html`) holds the controls, the Three.js scene and the sheet dialog. Everything that computes something is in `web/js/`, one file per part. Each is a plain script that adds its functions to `window.DomeZ.<name>`, using only the parts loaded before it:

| File | What it does |
|---|---|
| `vec.js` | 3-vector helpers |
| `mesh.js` | edges, face neighbours, compaction, Acidome's line order |
| `geodesic.js` | base solids; the flat grid and Acidome's Chords, Arcs, Mexican and Kruschke |
| `cut.js` | partial fractions, Acidome's cut rules, the flat grid's cut, the flat base |
| `shape.js` | sphere, ellipsoid and egg |
| `types.js` | strut, hub and panel types (struts only) |
| `lumber.js` | Acidome's Joint boards, board, hub and face types |
| `model.js` | a design to its mesh, types and lumber (`buildModel`) |
| `colors.js` | Acidome's palette and the strut-type colours |
| `drawing.js` | board cut drawings |
| `openings.js` | panel openings between the boards |
| `jig.js` | V-cradles, end setups and the top views for the jig sheet |
| `gridshell.js` | geodesic laths (crown ring on round shapes, over the top on any shape), their crossings, types and splices, and the bend check |
| `lathjig.js` | a cradle per kind of lath crossing: the jig frame, the skin's quadric, drawings and OpenSCAD |
| `format.js` | number, inch, HTML and CSV formatting |
| `state.js` | defaults and the URL query |
| `sheets.js` | the cut sheet and jig sheet (HTML and CSV) |
| `export.js` | OBJ exports, file names, the Python command |

The sheet and export functions take the model, the design and the link (`cutSheetHTML(M, state, href)`), so they work outside the page too.

## For scripting

From the browser console, `DomeZ.model.buildModel(DomeZ.state)` rebuilds the current design, `DomeZ.set({ freq: 4 })` changes it, and every other part is under `DomeZ.<file>`.

## Tests

`node --test 'tests/js/*.test.mjs'` runs the viewer's tests with Node 22 or newer, one file per part. They load the scripts the way the page does. `tests/js/fixtures/acidome-drawings.json` holds every label Acidome draws for 28 board types across six designs, and the drawing tests check ours against it. `tests/test_viewer_parity.py` checks that the viewer and the Python package build the same meshes, vertex for vertex.
