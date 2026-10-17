#!/usr/bin/env python3
"""
Build "Acidome Height+" from your own offline copy of the Acidome calculator.

Acidome (acidome.com/lab/calc, by popitch) offers a free offline version of its geodesic dome
calculator ("Acidome offline ⤓" on the site). This script applies a few small, labelled edits
to that file so it can stretch a dome along its vertical axis: spheres become ellipsoids of
revolution (taller for snow shedding, or flatter), while Acidome's own Base, Framework, Scheme,
Cover and Tent tabs, beam drawings, typing and OBJ export keep working.

    python3 tools/acidome_height.py
        reads  vendor/acidome/acidome-offline.html
        writes vendor/acidome/acidome-height.html

Open the result in a browser and set "Height ×" under Product options (1 = plain Acidome).
The factor is kept in the page address as ?h=<factor>. Acidome's own URL hash still holds the
dome, e.g. acidome-height.html?h=1.4#3/4_Joint_3V_R3_beams_120x40.

What the edits do:
  1. Read the height factor from ?h= and treat localhost like a local file (offline mode, no
     redirect to https), so the page can also be served with `python3 -m http.server`.
  2. Add a "Height ×" field under Product options.
  3. Insert one calculation stage, after Acidome cuts the dome (and flattens its base) and
     before it builds beams and hubs, that multiplies every hub's height by the factor. Cuts and
     flat bases therefore stay where Acidome puts them, and all products are computed on the
     stretched dome, aimed at the dome's centre as Acidome does.
  4. Fix the one Joint step that assumes every hub lies on the unit sphere: the end cut is found
     on the sphere through that hub instead. With a factor of 1 this edit changes nothing.
  5. Keep the local copy private: no usage log to acidome.com, no language lookup, and Google
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
        'height factor from ?h=, localhost counts as offline',
        "\t\t\tconst IS_OFFLINE = (document.location.protocol == 'file:');\n",
        "\t\t\tconst IS_OFFLINE = (document.location.protocol == 'file:')\n"
        "\t\t\t\t|| /^(localhost|127\\.0\\.0\\.1|\\[::1\\])$/.test(document.location.hostname); // DomeZ Height+ patch\n"
        "\n"
        "\t\t\t// DomeZ Height+ patch: vertical stretch factor from ?h=<factor> (1 = plain Acidome)\n"
        "\t\t\tconst HEIGHT_PLUS = (function() {\n"
        "\t\t\t\tvar h = parseFloat(new URLSearchParams(document.location.search).get('h'));\n"
        "\t\t\t\treturn h > 0 ? h : 1;\n"
        "\t\t\t})();\n"
        "\t\t\tdocument.addEventListener('DOMContentLoaded', function() {\n"
        "\t\t\t\tvar field = document.getElementById('domez-height');\n"
        "\t\t\t\tif (field) field.value = HEIGHT_PLUS;\n"
        "\t\t\t});\n",
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
        '"Height ×" field under Product options',
        "\t\t\t\t\t<dt data-bind=\"text: 'Sphere radius, m'\">Sphere radius, m</dt>\n"
        "\t\t\t\t\t<dd>\n"
        "\t\t\t\t\t\t<input class=\"input_text\" \n"
        "\t\t\t\t\t\t\tdata-bind=\"value: radius\"\n"
        "\t\t\t\t\t\t\tonblur=\"$(this).val( this.value.replace(/\\s/g, '').replace(/,/, '.') ).trigger('change'); \"\n"
        "\t\t\t\t\t\t/>\n"
        "\t\t\t\t\t</dd>\n"
        "\t\t\t\t</dl>\n",
        "\t\t\t\t\t<dt data-bind=\"text: 'Sphere radius, m'\">Sphere radius, m</dt>\n"
        "\t\t\t\t\t<dd>\n"
        "\t\t\t\t\t\t<input class=\"input_text\" \n"
        "\t\t\t\t\t\t\tdata-bind=\"value: radius\"\n"
        "\t\t\t\t\t\t\tonblur=\"$(this).val( this.value.replace(/\\s/g, '').replace(/,/, '.') ).trigger('change'); \"\n"
        "\t\t\t\t\t\t/>\n"
        "\t\t\t\t\t</dd>\n"
        "\t\t\t\t</dl>\n"
        "\t\t\t\t<dl><!-- DomeZ Height+ patch -->\n"
        "\t\t\t\t\t<dt title=\"Stretches the dome vertically: above 1 is taller, below 1 flatter, 1 is plain Acidome\">Height ×</dt>\n"
        "\t\t\t\t\t<dd>\n"
        "\t\t\t\t\t\t<input class=\"input_text\" id=\"domez-height\"\n"
        "\t\t\t\t\t\t\tonchange=\"var h = parseFloat(this.value.replace(/,/, '.')); "
        "if (h > 0) { var q = new URLSearchParams(location.search); q.set('h', h); location.search = q.toString(); }\"\n"
        "\t\t\t\t\t\t/>\n"
        "\t\t\t\t\t</dd>\n"
        "\t\t\t\t</dl>\n",
    ),
    (
        'vertical stretch stage before products',
        "\t\tstate.alignTheBase && { // if required\n"
        "\t\t\tname: 'flat base',\n"
        "\t\t\tprocess: function(figure){\n"
        "\t\t\t\tfigure.groundSliced(AXIS);\n"
        "\t\t\t\treturn figure;\n"
        "\t\t\t}\n"
        "\t\t}, {\n"
        "\t\t\tname: 'init product objects',\n",
        "\t\tstate.alignTheBase && { // if required\n"
        "\t\t\tname: 'flat base',\n"
        "\t\t\tprocess: function(figure){\n"
        "\t\t\t\tfigure.groundSliced(AXIS);\n"
        "\t\t\t\treturn figure;\n"
        "\t\t\t}\n"
        "\t\t}, HEIGHT_PLUS !== 1 && { // DomeZ Height+ patch: stretch every hub along the vertical axis\n"
        "\t\t\tname: 'height plus',\n"
        "\t\t\tprocess: function(figure){\n"
        "\t\t\t\tvar seen = new Set();\n"
        "\t\t\t\t_.each(figure.$primitives, function(primitive) {\n"
        "\t\t\t\t\t_.each(primitive.$points, function(point) {\n"
        "\t\t\t\t\t\tif (seen.has(point)) return;\n"
        "\t\t\t\t\t\tseen.add(point);\n"
        "\t\t\t\t\t\tpoint[AXIS] *= HEIGHT_PLUS;\n"
        "\t\t\t\t\t});\n"
        "\t\t\t\t});\n"
        "\t\t\t\treturn figure;\n"
        "\t\t\t}\n"
        "\t\t}, {\n"
        "\t\t\tname: 'init product objects',\n",
    ),
]

# The Joint end-cut solve appears twice (live branch and Acidome's own boundary branch).
JOINT_OLD = (
    "\t\t\tvar sols = Solutions.twoPlanesAndSphere(plane, wall.plane);\n"
)
JOINT_NEW = (
    "\t\t\t// DomeZ Height+ patch: hubs of a stretched dome are not on the unit sphere, so solve on the\n"
    "\t\t\t// sphere through this hub; the existing outer.scale(point.length()) below scales back out.\n"
    "\t\t\tvar hubR = HEIGHT_PLUS === 1 ? 1 : point.length(),\n"
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
    print('Open it in a browser and set "Height ×" under Product options (1 = plain Acidome).')
    return 0


if __name__ == '__main__':
    sys.exit(main())
