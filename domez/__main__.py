"""
DomeZ command line: python3 -m domez <command> [options]

Each command is a module's own CLI; run `python3 -m domez <command> --help` for its options.
"""

import importlib
import inspect
import os
import sys

COMMANDS = {
    'dome': ('domez.dome', 'Geodesic spheres and domes: flat grid or Acidome methods, cuts, flat base'),
    'shapes': ('domez.shapes', 'Ellipsoids, eggs, tubes and a spacecraft example'),
    'polyhedra': ('domez.polyhedra', 'Platonic solids and the stella octangula'),
    'unfold': ('domez.unfold', 'Steepest-edge unfolding of the OBJ files in polyhedra_output/'),
    'smart-unfold': ('domez.smart_unfold', 'Unfolding with topology detection and strategy selection'),
    'spec-sheets': ('domez.spec_sheet', 'SVG spec sheets (3D view, unfolded net, statistics)'),
    'unfold-svg': ('domez.unfold_svg', 'SVG drawings of unfolded nets'),
    'unfold-plot': ('domez.unfold_plot', 'Matplotlib drawings of unfolded nets (needs matplotlib)'),
}


def usage():
    width = max(len(c) for c in COMMANDS)
    lines = ['usage: python3 -m domez <command> [options]', '', 'commands:']
    lines += [f'  {name.ljust(width)}  {desc}' for name, (_, desc) in COMMANDS.items()]
    lines += ['', 'Run `python3 -m domez <command> --help` for a command\'s options.']
    return '\n'.join(lines)


def main(argv=None):
    argv = sys.argv[1:] if argv is None else list(argv)
    if not argv or argv[0] in ('-h', '--help', 'help'):
        print(usage())
        return 0
    command, rest = argv[0], argv[1:]
    if command not in COMMANDS:
        print(f'domez: unknown command {command!r}\n\n{usage()}', file=sys.stderr)
        return 2
    module = importlib.import_module(COMMANDS[command][0])
    launcher = 'domez' if os.path.basename(sys.argv[0]) == 'domez' else 'python3 -m domez'
    if 'prog' in inspect.signature(module.main).parameters:
        return module.main(rest, prog=f'{launcher} {command}') or 0
    sys.argv = [f'{launcher} {command}', *rest]
    return module.main() or 0


if __name__ == '__main__':
    sys.exit(main())
