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
| Class II and III subdivision, fullerenes | — | Not ported |
| Joint boards: solids, end cuts, board, hub and face types, cut drawings | ✓ | In the viewer, with saw settings and panel openings added |
| GoodKarma, Piped, Cone, Semicone and Nose connectors | — | On the [roadmap](roadmap.md) |
| Base, Scheme and Tent views | — | On the [roadmap](roadmap.md); the cut sheet covers boards, hubs and panels |

For comparing with Acidome, its URL hash for a dome is `[Octohedron_][Flat_]<partial>_[Method_][Symmetry_]<connector>_<V>V_R<radius>_beams_<W>x<T>`, with tokens in exactly that order, e.g. `3/4_Joint_3V_R3_beams_120x40`. Chords and Pentad are the defaults and are left out, and Acidome only recognises the octahedron spelled `Octohedron`.

### Joint boards

The viewer's Joint frame follows Acidome's construction:
- **Board:** each board is a straight W × T prism whose mid-plane passes through the dome's centre, turned about its strut so each hub sits T/2 to one side.
- **End cuts:** each end is cut against the facing side of the next board clockwise around the hub.
- **Typing:** boards are typed by overall length (1 mm) and end cuts (0.1°), most numerous first. Hubs are typed by the real face-corner and strut angles around them, and faces by their real triangle.

On the reference dome `3/4_Joint_3V_R3_beams_120x40`, every board type, every mark and angle on the four cut drawings, the hub types and the face types match acidome.com. On ellipsoids and eggs, the board ends are found on the sphere through each hub (the Acidome Height+ fix). The viewer's ellipsoid 3 × 3 × 4.2 m and egg 7.8 × 6 m with an 8% point match Acidome Height+ at `h=1.4` and at `h=1.3&egg=8`: 28 and 42 board types with identical quantities and lengths.

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

Acidome offers a free offline version of the calculator for use without internet ("Acidome offline ⤓" on acidome.com). It's a single HTML file. Save it as:

```
vendor/acidome/acidome-offline.html
```

`vendor/` is git-ignored and the file is not distributed with DomeZ. Its code carries only a non-standard "Legalize Cannabis License" line, and the OBJ files it exports are marked CC-BY-SA. Even offline, the unmodified file still loads Google Analytics and a donation iframe when opened.

## Acidome Height+

`tools/acidome_height.py` turns your offline copy into **Acidome Height+**: Acidome itself, plus three controls. It can stretch the dome along its vertical axis, give it an egg's pointed top, and list each triangle's opening between the boards as panel form sizes. Taller and pointed domes shed snow; flatter ones cover more floor. Everything else is Acidome's own: the Base, Framework, Scheme, Cover and Tent tabs, the beam cut drawings, the typing and the OBJ export.

```bash
python3 tools/acidome_height.py     # vendor/acidome/acidome-offline.html -> vendor/acidome/acidome-height.html
```

Open `vendor/acidome/acidome-height.html` in a browser. The new fields are under Product options:

| Field | Address | What it does |
|---|---|---|
| **Height ×** | `h` | Stretches the dome vertically. 1 is plain Acidome; 1.4 makes it 40% taller than wide. |
| **Egg point, %** | `egg` | Gives it an egg's pointed top: the widest ring moves down by this share of the height (the same Hügelschäffer egg as the DomeZ viewer). 0 is no egg; negative points it down. |
| **Panel gap, mm** | `gap` | The gap left between a cast panel and the boards around it, for the panel sizes under Faces. |

The settings are kept in the address, next to Acidome's usual hash, e.g. `acidome-height.html?h=1.3&egg=8&gap=10#3/4_Joint_3V_R3_beams_120x40`. To serve the file rather than open it: `python3 -m http.server` from the repository root, then go to `http://localhost:8000/vendor/acidome/acidome-height.html`.

### Panel form sizes

Under every face type in the Faces list, a table gives that triangle's **opening**: the space between the side faces of its three boards, where a panel goes. For each side (labelled with its board's letter) it lists:

- the opening's length at the boards' outer face, and at their inner face (one board width deeper; the opening narrows inward because the boards' sides lean toward the dome's centre);
- the corner angles;
- with a panel gap set, the panel's side lengths after that gap is left to every board.

Example, face type 1 of the plain reference dome (`3/4_Joint_3V_R3_beams_120x40`): the real triangle's sides are about 1237, 1236 and 1210 mm. The opening is 1167, 1166 and 1141 mm at the outer face and 1116, 1115 and 1091 mm at the inner face, with corners of 60.8°, 60.7° and 58.6°.

### What the patch changes

All edits are marked "DomeZ Height+ patch" in the output file.

1. **A shape stage.** After Acidome subdivides, cuts and (optionally) flattens the dome, and before it builds beams and hubs, every hub is mapped onto the new shape: its height × h, then the egg profile. The cut and the flat base stay where Acidome puts them, and every board, hub type and drawing is computed on the new shape.
2. **One Joint fix.** Acidome finds each Joint board's end on the unit sphere and then scales it to the hub's radius, which is only exact when all hubs are the same distance from the centre. The patch solves on the sphere through that hub instead.
3. **One drawing fix.** To fit long boards, Acidome's cut drawings leave out a middle stretch. It underestimates how far each end reaches along the board, so on stretched and egg domes the left-out stretch could cut into an end and leave stray lines. The printed numbers were never affected.
4. **The opening tables** under Faces.
5. **The three fields**, and localhost treated as offline (no redirect to https).
6. **Privacy for a local copy.** No usage log to acidome.com, no language lookup, and Google Analytics opt-out flags set.

With Height × at 1 and no egg, fixes 2 and 3 are switched off, so the dome, its typing and its drawings are exactly Acidome's.

### Checks

On the Joint reference dome (`3/4_Joint_3V_R3_beams_120x40`):

- **Plain (height 1, no egg):** the board types (A 90, B 50, C 45, D 25), face types and cut drawings are identical to acidome.com.
- **Height 1.4:** all 210 boards and 135 faces build without warnings, in 28 board types of 5 or 10. Every one of the 420 board ends lies exactly on its own mid-plane, on its neighbour's side face and at its hub's distance from the centre. Without the Joint fix, ends would land up to 8 mm off the neighbour's face.
- **Height 1.3, egg point 8%:** the widest ring sits below the middle, and all 420 board ends are exact. There are 42 board types and 27 face types, each with its opening table, and a 10 mm gap takes about 40 mm off each panel side.

### Limits

- **Board tilt.** Like Acidome, Height+ aims every board at the dome's centre. On a stretched or egg dome the boards therefore stay untwisted, but their wide faces tilt away from the skin by a few degrees, up to about 20° at 1.5 : 1 (see the [roadmap](roadmap.md#boards-on-ellipsoids-and-eggs)).
- **Outward-leaning ends.** On eggs, some board ends have their inner face longer than the outer face. Their drawings show the inner cut as a solid line with a blue angle over 90°.
- **Acidome versions.** The patch applies to Acidome 420+. If a later version changes the lines it edits, the script stops and says which edit no longer fits.
- **Local use only.** The patched file contains Acidome's code, so it isn't committed or published. Publishing it would need the author's permission.
