#!/usr/bin/env python3
"""
Build "Acidome Height+" from your own offline copy of the Acidome calculator.

Acidome (acidome.com/lab/calc, by popitch) offers a free offline version of its geodesic dome
calculator ("Acidome offline ⤓" on the site). This script applies a few small, labelled edits
to that file. The result can stretch a dome along its vertical axis and give it an egg's pointed
top. Spheres become ellipsoids of revolution (taller for snow shedding, or flatter) or eggs,
while Acidome's own Base, Framework, Scheme, Cover and Tent tabs, beam drawings, typing and OBJ
export keep working. Every face type also gets the inside opening of its triangle between the
boards, as sizes for panel forms.

    python3 tools/acidome_height.py
        reads  vendor/acidome/acidome-offline.html
        writes vendor/acidome/acidome-height.html

Open the result in a browser. Under Product options:
  Height ×       stretches the dome vertically (1 = plain Acidome)
  Egg point, %   gives it an egg's pointed top (0 = none; negative points it down)
  Panel gap, mm  shrinks the panel sizes listed under Faces by this gap to the boards
The settings are kept in the page address (?h=1.4&egg=8&gap=10). Acidome's own URL hash still
holds the dome, e.g. acidome-height.html?h=1.4&egg=8#3/4_Joint_3V_R3_beams_120x40.

What the edits do:
  1. Read the settings from the address, and treat localhost like a local file (offline mode,
     no redirect to https), so the page can also be served with `python3 -m http.server`.
  2. Add the three fields under Product options.
  3. Insert one calculation stage, after Acidome cuts the dome (and flattens its base) and before
     it builds beams and hubs. The stage maps every hub from Acidome's sphere onto the stretched
     shape: height × h, then the Hügelschäffer egg profile (the same as the DomeZ viewer). Cuts
     and flat bases therefore stay where Acidome puts them, and all products are computed on the
     new shape, aimed at the dome's centre as Acidome does.
  4. Fix the one Joint step that assumes every hub lies on the unit sphere: the end cut is found
     on the sphere through that hub instead. On a plain sphere this edit changes nothing.
  5. Under each face type, list the opening of its triangle between the boards' facing sides:
     side lengths and corner angles at the boards' outer face and at their inner face, and the
     panel size after the panel gap.
  6. Fix the beam drawings' shortened middle on stretched and egg domes: Acidome underestimates
     how far each end reaches along the board, so the gap could cut into an end and leave stray
     lines. The printed numbers were never affected. Plain spheres draw exactly as in Acidome.
  7. Keep the local copy private: no usage log to acidome.com, no language lookup, and Google
     Analytics opt-out flags set.

Neither Acidome's code nor the patched file belongs in this repository; vendor/ is git-ignored.
"""

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_IN = ROOT / 'vendor' / 'acidome' / 'acidome-offline.html'
DEFAULT_OUT = ROOT / 'vendor' / 'acidome' / 'acidome-height.html'
MARKER = 'DomeZ Height+ patch'

# Settings, fields and the face-opening table. Runs early in the page; the functions it defines
# are only called later, once Acidome's Vector and Plane classes exist.
SETTINGS_JS = r"""
			// DomeZ Height+ patch: shape and panel settings from the address (?h=1.4&egg=8&gap=10)
			const DOMEZ = (function() {
				var q = new URLSearchParams(document.location.search),
					num = function(name, fallback, ok) { var v = parseFloat(q.get(name)); return ok(v) ? v : fallback; };
				return {
					height: num('h', 1, function(v) { return v > 0; }),                      // vertical stretch
					egg: num('egg', 0, function(v) { return Math.abs(v) < 50; }) / 100,      // egg asymmetry, share of length
					gap: num('gap', 0, function(v) { return v >= 0; })                        // panel gap to the boards, mm
				};
			})();
			const HEIGHT_PLUS = DOMEZ.height;
			const DOMEZ_SHAPED = DOMEZ.height !== 1 || DOMEZ.egg !== 0;

			function domezSetParam(name, text) {
				var v = parseFloat(String(text).replace(/,/, '.'));
				if (!isFinite(v)) return;
				var q = new URLSearchParams(location.search);
				q.set(name, v);
				location.search = q.toString();
			}

			document.addEventListener('DOMContentLoaded', function() {
				var set = function(id, value) { var field = document.getElementById(id); if (field) field.value = value; };
				set('domez-height', DOMEZ.height);
				set('domez-egg', +(DOMEZ.egg * 100).toFixed(3));
				set('domez-gap', DOMEZ.gap);
			});

			// Map a point of Acidome's unit sphere (y up) onto the stretched shape: a Hügelschäffer egg
			// of length 2h and breadth 2 (an ellipsoid of revolution when egg = 0).
			function domezShape(point) {
				var L = 2 * DOMEZ.height, w = DOMEZ.egg * L, t = point.y * L / 2,
					s = L / Math.sqrt(L * L + 8 * w * t + 4 * w * w);
				point.x *= s;
				point.z *= s;
				point.y = t;
			}

			// The opening of a face's triangle between its boards, as panel form sizes (HTML table).
			function domezOpening(product) {
				try {
					var face = product.face, lines = product.lines;
					if (!face || !lines || !lines[0]) return '';
					var beamOf = function(line) { return line.product || (line.origin && line.origin.product); },
						beam = beamOf(lines[0]);
					if (!beam || !beam.getPlane) return '';
					var R = beam.R, t = beam.thickness, w = beam.width, mm = function(x) { return Math.round(x * R * 1000); };
					var reals = product.realPoints(),
						hubs = [0, 1, 2].map(function(k) { return reals[k].vertex.$points[0]; });

					// panel plane through the three hubs, normal pointing out of the dome
					var n = Vector.crossProduct(hubs[1].clone().subtract(hubs[0]), hubs[2].clone().subtract(hubs[0])).normalize();
					if (Vector.dotProduct(n, hubs[0]) < 0) n.scale(-1);
					var level = Vector.dotProduct(n, hubs[0]);

					// side k (opposite corner k): the side face of its board that faces this triangle,
					// oriented so the triangle's inside is on its + side
					var sides = [0, 1, 2].map(function(k) {
						var plane = beamOf(lines[k]).getPlane(true).clone().normalize(),
							s = plane.result(hubs[k]) > 0 ? 1 : -1;
						plane.D -= s * t / 2;
						if (s < 0) plane.revert();
						return plane;
					});
					var solve = function(p1, p2, n3, d3) {     // three planes n·X = d
						var n1 = p1.normal(), n2 = p2.normal(), d1 = -p1.D, d2 = -p2.D,
							c23 = Vector.crossProduct(n2, n3), c31 = Vector.crossProduct(n3, n1), c12 = Vector.crossProduct(n1, n2),
							det = Vector.dotProduct(n1, c23);
						return c23.scale(d1 / det).add(c31.scale(d2 / det)).add(c12.scale(d3 / det));
					};
					var triangle = function(depth, gap) {    // corner k is where the two sides next to it meet
						var shifted = sides.map(function(p) { var c = p.clone(); c.D -= gap; return c; });
						return [0, 1, 2].map(function(k) { return solve(shifted[(k + 1) % 3], shifted[(k + 2) % 3], n, level - depth); });
					};
					var lengths = function(c) { return [0, 1, 2].map(function(k) { return mm(c[(k + 1) % 3].distance(c[(k + 2) % 3])); }); };
					var angles = function(c) {
						return [0, 1, 2].map(function(k) {
							var a = c[(k + 1) % 3].clone().subtract(c[k]), b = c[(k + 2) % 3].clone().subtract(c[k]);
							return (Math.acos(a.cosWith(b)) * 180 / Math.PI).toFixed(1) + '°';
						});
					};

					var outer = triangle(0, 0), inner = triangle(w, 0), gapR = DOMEZ.gap / 1000 / R;
					var letters = [0, 1, 2].map(function(k) { return lines[k].index || (lines[k].origin && lines[k].origin.index) || '?'; });
					var row = function(label, cells) {
						return '<tr><td style="padding-right:1em;color:#666">' + label + '</td>' +
							cells.map(function(c) { return '<td style="padding-right:1em;text-align:right">' + c + '</td>'; }).join('') + '</tr>';
					};
					var html = '<table class="domez-opening" style="font:12px monospace;margin:6px 0 10px;border-collapse:collapse">' +
						row('<b>Opening</b>, mm', letters.map(function(l) { return 'side ' + l; })) +
						row('outer face', lengths(outer)) +
						row('inner face (' + mm(w) + ' deep)', lengths(inner)) +
						row('corner angles', angles(outer));
					if (gapR > 0) html += row('panel, ' + DOMEZ.gap + ' mm gap', lengths(triangle(0, gapR)));
					return html + '</table>';
				} catch (e) {
					console.log(['DomeZ opening', e]);
					return '';
				}
			}
"""

FIELDS_HTML = (
    "\t\t\t\t<dl><!-- DomeZ Height+ patch -->\n"
    "\t\t\t\t\t<dt title=\"Stretches the dome vertically: above 1 is taller, below 1 flatter, 1 is plain Acidome\">Height ×</dt>\n"
    "\t\t\t\t\t<dd><input class=\"input_text\" id=\"domez-height\" onchange=\"domezSetParam('h', this.value)\" /></dd>\n"
    "\t\t\t\t</dl>\n"
    "\t\t\t\t<dl>\n"
    "\t\t\t\t\t<dt title=\"Egg shape: shifts the widest point down by this share of the height, for a pointed top. 0 = no egg, negative = pointed bottom\">Egg point, %</dt>\n"
    "\t\t\t\t\t<dd><input class=\"input_text\" id=\"domez-egg\" onchange=\"domezSetParam('egg', this.value)\" /></dd>\n"
    "\t\t\t\t</dl>\n"
    "\t\t\t\t<dl>\n"
    "\t\t\t\t\t<dt title=\"Gap between a cast panel and the boards around it, for the panel sizes listed under Faces\">Panel gap, mm</dt>\n"
    "\t\t\t\t\t<dd><input class=\"input_text\" id=\"domez-gap\" onchange=\"domezSetParam('gap', this.value)\" /></dd>\n"
    "\t\t\t\t</dl>\n"
)

RADIUS_FIELD = (
    "\t\t\t\t\t<dt data-bind=\"text: 'Sphere radius, m'\">Sphere radius, m</dt>\n"
    "\t\t\t\t\t<dd>\n"
    "\t\t\t\t\t\t<input class=\"input_text\" \n"
    "\t\t\t\t\t\t\tdata-bind=\"value: radius\"\n"
    "\t\t\t\t\t\t\tonblur=\"$(this).val( this.value.replace(/\\s/g, '').replace(/,/, '.') ).trigger('change'); \"\n"
    "\t\t\t\t\t\t/>\n"
    "\t\t\t\t\t</dd>\n"
    "\t\t\t\t</dl>\n"
)

FLAT_BASE_STAGE = (
    "\t\tstate.alignTheBase && { // if required\n"
    "\t\t\tname: 'flat base',\n"
    "\t\t\tprocess: function(figure){\n"
    "\t\t\t\tfigure.groundSliced(AXIS);\n"
    "\t\t\t\treturn figure;\n"
    "\t\t\t}\n"
    "\t\t}, {\n"
    "\t\t\tname: 'init product objects',\n"
)

FACE_CANVAS = (
    "\t\t\t\t\t\t<!-- ko ifnot: $parent.type == 'line' && /GoodKarma|Semicone|Piped_TODO|Joint_TODO/.test(form.connType()) -->\n"
    "\t\t\t\t\t\t<br />\n"
    "\t\t\t\t\t\t<canvas data-bind=\"\n"
    "\t\t\t\t\t\t\tattr: $parent.canvasAttr,\n"
    "\t\t\t\t\t\t\tplot: product\n"
    "\t\t\t\t\t\t\"></canvas>\n"
    "\t\t\t\t\t\t<!-- /ko -->\n"
)

# (description, original text, replacement). Each original must occur exactly once.
EDITS = [
    (
        'analytics opt-out before any tracking code runs',
        '\t<head>\n',
        "\t<head>\n\t\t<script>/* DomeZ Height+ patch: local copy, no analytics */"
        "window['ga-disable-G-FPF05L83RL'] = true; window['ga-disable-UA-7847979-1'] = true;</script>\n",
    ),
    (
        'no https redirect for a local server',
        "\t\t\tif (location.protocol === 'http:') {\n"
        "\t\t\t\tlocation.protocol = 'https:';\n",
        "\t\t\tif (location.protocol === 'http:' && !/^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/.test(location.hostname)) { // DomeZ Height+ patch\n"
        "\t\t\t\tlocation.protocol = 'https:';\n",
    ),
    (
        'settings from the address, localhost counts as offline',
        "\t\t\tconst IS_OFFLINE = (document.location.protocol == 'file:');\n",
        "\t\t\tconst IS_OFFLINE = (document.location.protocol == 'file:')\n"
        "\t\t\t\t|| /^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/.test(document.location.hostname); // DomeZ Height+ patch\n"
        + SETTINGS_JS,
    ),
    (
        'no usage log when local',
        "\tvar isLocal = (location.protocol === 'file:');\n"
        "\n"
        "\t// save logs on unload calc window\n"
        "\t$(window).on('unload', function() {\n",
        "\tvar isLocal = IS_OFFLINE; // DomeZ Height+ patch\n"
        "\n"
        "\t// save logs on unload calc window\n"
        "\t$(window).on('unload', function() {\n"
        "\t\tif (isLocal) return; // DomeZ Height+ patch: no usage log from a local copy\n",
    ),
    (
        'no language lookup when offline',
        "\tif (! IS_IFRAME && ! hasLang) {\n",
        "\tif (! IS_IFRAME && ! hasLang && ! IS_OFFLINE) { // DomeZ Height+ patch: no lookup offline\n",
    ),
    (
        'Height ×, Egg point and Panel gap fields under Product options',
        RADIUS_FIELD,
        RADIUS_FIELD + FIELDS_HTML,
    ),
    (
        'shape stage before products',
        FLAT_BASE_STAGE,
        FLAT_BASE_STAGE.replace(
            "\t\t}, {\n\t\t\tname: 'init product objects',\n",
            "\t\t}, DOMEZ_SHAPED && { // DomeZ Height+ patch: map every hub onto the stretched or egg shape\n"
            "\t\t\tname: 'height plus',\n"
            "\t\t\tprocess: function(figure){\n"
            "\t\t\t\tvar seen = new Set();\n"
            "\t\t\t\t_.each(figure.$primitives, function(primitive) {\n"
            "\t\t\t\t\t_.each(primitive.$points, function(point) {\n"
            "\t\t\t\t\t\tif (seen.has(point)) return;\n"
            "\t\t\t\t\t\tseen.add(point);\n"
            "\t\t\t\t\t\tdomezShape(point);\n"
            "\t\t\t\t\t});\n"
            "\t\t\t\t});\n"
            "\t\t\t\treturn figure;\n"
            "\t\t\t}\n"
            "\t\t}, {\n"
            "\t\t\tname: 'init product objects',\n"),
    ),
    (
        'beam drawings: keep the shortened middle clear of both ends',
        "\t\t\t\treturn 2 * _.max(_.map(tail.bevelSides, Math.abs)) + Math.abs(tail.bevelInner);\n",
        "\t\t\t\t// DomeZ Height+ patch: an end spans 2(|s| + |b|) along the board, not 2|s| + |b|; on stretched\n"
        "\t\t\t\t// and egg domes the shorter estimate lets the drawing's middle gap cut into an end.\n"
        "\t\t\t\treturn 2 * _.max(_.map(tail.bevelSides, Math.abs)) + (DOMEZ_SHAPED ? 2 : 1) * Math.abs(tail.bevelInner);\n",
    ),
    (
        'opening table under each face type',
        FACE_CANVAS + "\t\t\t\t\t</li>\n",
        FACE_CANVAS +
        "\t\t\t\t\t\t<!-- ko if: $parent.type == 'face' --><!-- DomeZ Height+ patch -->\n"
        "\t\t\t\t\t\t<div data-bind=\"html: domezOpening(product)\"></div>\n"
        "\t\t\t\t\t\t<!-- /ko -->\n"
        "\t\t\t\t\t</li>\n",
    ),
]

# The Joint end-cut solve appears twice (live branch and Acidome's own boundary branch).
JOINT_OLD = (
    "\t\t\tvar sols = Solutions.twoPlanesAndSphere(plane, wall.plane);\n"
)
JOINT_NEW = (
    "\t\t\t// DomeZ Height+ patch: hubs of a stretched dome are not on the unit sphere, so solve on the\n"
    "\t\t\t// sphere through this hub; the existing outer.scale(point.length()) below scales back out.\n"
    "\t\t\tvar hubR = DOMEZ_SHAPED ? point.length() : 1,\n"
    "\t\t\t\tsols = Solutions.twoPlanesAndSphere(\n"
    "\t\t\t\t\tnew Plane(plane.A, plane.B, plane.C, plane.D / hubR),\n"
    "\t\t\t\t\tnew Plane(wall.plane.A, wall.plane.B, wall.plane.C, wall.plane.D / hubR));\n"
)
JOINT_COUNT = 2


def patch(text):
    if MARKER in text:
        raise SystemExit('This file is already patched; start from the unmodified Acidome offline file.')
    for desc, old, new in EDITS:
        n = text.count(old)
        if n != 1:
            raise SystemExit(f'Cannot apply "{desc}": expected the original text once, found it {n} times. '
                             'This Acidome version may differ from the one the patch was written for (420+).')
        text = text.replace(old, new)
    n = text.count(JOINT_OLD)
    if n != JOINT_COUNT:
        raise SystemExit(f'Cannot apply the Joint fix: expected {JOINT_COUNT} end-cut solves, found {n}.')
    return text.replace(JOINT_OLD, JOINT_NEW)


def main(argv=None):
    parser = argparse.ArgumentParser(description='Build Acidome Height+ from your offline Acidome copy.')
    parser.add_argument('source', nargs='?', type=Path, default=DEFAULT_IN,
                        help=f'offline Acidome HTML (default: {DEFAULT_IN.relative_to(ROOT)})')
    parser.add_argument('-o', '--output', type=Path, default=DEFAULT_OUT,
                        help=f'patched file to write (default: {DEFAULT_OUT.relative_to(ROOT)})')
    args = parser.parse_args(argv)
    if not args.source.exists():
        raise SystemExit(f'{args.source} not found. Download "Acidome offline" from https://acidome.com/lab/calc/ '
                         'and save it there.')
    args.output.write_text(patch(args.source.read_text(encoding='utf-8')), encoding='utf-8')
    print(f'Wrote {args.output}')
    print('Open it in a browser; Height ×, Egg point and Panel gap are under Product options.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
