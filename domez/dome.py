#!/usr/bin/env python3
"""
Geodesic Dome Generator - Pure Python Implementation
Generates geodesic dome .obj files using mathematical subdivision
Based on icosahedron/octahedron base polyhedra

Subdivision methods:
  flat      Equal divisions of each flat base triangle pushed out to the sphere (default)
  chords    Acidome "Equal Chords"
  arcs      Acidome "Equal Arcs"
  mexican   Acidome "Mexican" (Arcs with strut lengths equalised per grid line)
  kruschke  Acidome "Kruschke" (3V and 4V icosahedra only, otherwise Chords)

The Acidome methods, their base orientations, partial cut and flat-base rules are
ported from web/index.html, which reproduces the Acidome calculator
(acidome.ru/lab/calc, by popitch).
"""

import argparse
import math
import numpy as np
from fractions import Fraction
from pathlib import Path
from typing import List, Tuple, Dict
import itertools


class Vector3:
    """3D vector with basic operations"""
    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z
    
    def __add__(self, other):
        return Vector3(self.x + other.x, self.y + other.y, self.z + other.z)
    
    def __sub__(self, other):
        return Vector3(self.x - other.x, self.y - other.y, self.z - other.z)
    
    def __mul__(self, scalar):
        return Vector3(self.x * scalar, self.y * scalar, self.z * scalar)
    
    def __truediv__(self, scalar):
        return Vector3(self.x / scalar, self.y / scalar, self.z / scalar)
    
    def length(self):
        return np.sqrt(self.x**2 + self.y**2 + self.z**2)
    
    def normalize(self):
        l = self.length()
        return Vector3(self.x / l, self.y / l, self.z / l) if l > 0 else self
    
    def to_tuple(self):
        return (self.x, self.y, self.z)
    
    def __repr__(self):
        return f"V({self.x:.3f}, {self.y:.3f}, {self.z:.3f})"


# =============================================================================
# Subdivision methods, base orientations and cut rules
#
# Everything below works on plain (x, y, z) tuples on a unit sphere, with the
# same arithmetic, ordering and tolerances as the "Geometry" block of
# web/index.html, so meshes match the viewer (and through it acidome.com).
# The Acidome pipeline works y-up; GeodesicDome turns it z-up at the end.
# =============================================================================

PHI = (1 + math.sqrt(5)) / 2

METHODS = ('flat', 'chords', 'arcs', 'mexican', 'kruschke')
SYMMETRIES = ('pentad', 'cross', 'triad')
METHOD_LABELS = {
    'flat': 'Flat grid', 'chords': 'Chords (Acidome)', 'arcs': 'Arcs (Acidome)',
    'mexican': 'Mexican (Acidome)', 'kruschke': 'Kruschke (Acidome)',
}
ACIDOME_CREDIT = 'Subdivision ported from the Acidome calculator (acidome.ru/lab/calc, by popitch)'


def _add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def _sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def _mul(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def _dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def _cross(a, b):
    return (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])


def _len(a):
    return math.hypot(a[0], a[1], a[2])


def _norm(a):
    l = _len(a)
    return (a[0] / l, a[1] / l, a[2] / l) if l > 0 else a


def _rot_x(p, t):
    return (p[0], p[1] * math.cos(t) - p[2] * math.sin(t), p[1] * math.sin(t) + p[2] * math.cos(t))


def _rot_y(p, t):
    return (p[0] * math.cos(t) + p[2] * math.sin(t), p[1], -p[0] * math.sin(t) + p[2] * math.cos(t))


def _rot_z(p, t):
    return (p[0] * math.cos(t) - p[1] * math.sin(t), p[0] * math.sin(t) + p[1] * math.cos(t), p[2])


# generate_icosahedron / generate_octahedron's vertices before normalising (the turned flat grid starts here).
_FLAT_RAW_VERTS = {
    'icosahedron': [(-1, PHI, 0), (1, PHI, 0), (-1, -PHI, 0), (1, -PHI, 0), (0, -1, PHI), (0, 1, PHI),
                    (0, -1, -PHI), (0, 1, -PHI), (PHI, 0, -1), (PHI, 0, 1), (-PHI, 0, -1), (-PHI, 0, 1)],
    'octahedron': [(1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1)],
}
# The flat-grid icosahedron has an edge up (Cross); its octahedron has a vertex up (Pentad).
NATIVE_SYMMETRY = {'icosahedron': 'cross', 'octahedron': 'pentad'}
_FLAT_ORIENT = {
    'icosahedron': {
        'pentad': lambda p: _rot_x(p, math.atan2(1, PHI)),
        'triad': lambda p: _rot_y(p, -math.atan2(PHI, 2 * PHI + 1)),
    },
    'octahedron': {
        'cross': lambda p: _rot_x(p, math.pi / 4),
        'triad': lambda p: _rot_y(_rot_z(p, -math.pi / 4), -math.atan2(math.sqrt(2), 1)),
    },
}


def _base_name(base):
    return 'octahedron' if base == 'octahedron' else 'icosahedron'


def default_symmetry(method, base):
    """Native orientation for the flat grid; Acidome's default (Pentad) otherwise."""
    return NATIVE_SYMMETRY[_base_name(base)] if method == 'flat' else 'pentad'


def effective_method(method, base, frequency):
    """Acidome only defines Kruschke for 3V and 4V icosahedra and falls back to Chords otherwise."""
    if method == 'kruschke' and not (_base_name(base) == 'icosahedron' and frequency in (3, 4)):
        return 'chords'
    return method


class AcidomeMesh:
    """Unit-sphere mesh in Acidome's y-up frame: points, triangles and (for Arcs) grid lines."""

    def __init__(self, pts, tris, lines=None):
        self.pts = pts
        self.tris = tris
        self.lines = lines or []


class _GridLine:
    """A strut of the Arcs grid and the grid-line family (side) it belongs to."""
    __slots__ = ('a', 'b', 'side', 'd', 'len')

    def __init__(self, a, b, side):
        self.a, self.b, self.side = a, b, side


_AC_A = 4 / math.sqrt(2 * (5 + math.sqrt(5))) / 2
_AC_B = math.sqrt(1 - _AC_A * _AC_A)
_AC_ICOSA = (
    [(-_AC_A, 0, _AC_B), (_AC_A, 0, _AC_B), (-_AC_A, 0, -_AC_B), (_AC_A, 0, -_AC_B),
     (0, _AC_B, _AC_A), (0, _AC_B, -_AC_A), (0, -_AC_B, _AC_A), (0, -_AC_B, -_AC_A),
     (_AC_B, _AC_A, 0), (-_AC_B, _AC_A, 0), (_AC_B, -_AC_A, 0), (-_AC_B, -_AC_A, 0)],
    [(0, 4, 1), (0, 9, 4), (9, 5, 4), (4, 5, 8), (4, 8, 1), (8, 10, 1), (8, 3, 10), (5, 3, 8), (5, 2, 3), (2, 7, 3),
     (7, 10, 3), (7, 6, 10), (7, 11, 6), (11, 0, 6), (0, 1, 6), (6, 1, 10), (9, 0, 11), (9, 11, 2), (9, 2, 5), (7, 2, 11)],
)
_AC_OCTA = (
    [(-1, 0, 0), (1, 0, 0), (0, -1, 0), (0, 1, 0), (0, 0, -1), (0, 0, 1)],
    [(3, 5, 0), (4, 3, 0), (2, 4, 0), (5, 2, 0), (5, 3, 1), (3, 4, 1), (4, 2, 1), (2, 5, 1)],
)


def ac_rotate(p, t, axis):
    """Acidome's Vector.rotate (note its sign convention)."""
    c, s = math.cos(t), math.sin(t)
    if axis == 'x':
        return (p[0], p[1] * c + p[2] * s, p[2] * c - p[1] * s)
    if axis == 'y':
        return (p[0] * c + p[2] * s, p[1], p[2] * c - p[0] * s)
    return (p[0] * c + p[1] * s, p[1] * c - p[0] * s, p[2])


def acidome_base(base, symmetry):
    """Acidome's y-up base solid, turned so a vertex (Pentad), edge (Cross) or face (Triad) points up."""
    verts, faces = _AC_OCTA if base == 'octahedron' else _AC_ICOSA
    v = [tuple(float(c) for c in p) for p in verts]
    if base == 'octahedron':
        if symmetry == 'cross':
            v = [ac_rotate(p, math.pi / 4, 'x') for p in v]
        if symmetry == 'triad':
            beta = math.acos(1 / math.sqrt(3))
            v = [ac_rotate(ac_rotate(p, math.pi / 4, 'y'), -beta, 'x') for p in v]
    else:
        if symmetry == 'pentad':
            v = [ac_rotate(p, math.atan(_AC_A / _AC_B), 'x') for p in v]
        if symmetry == 'triad':
            v = [ac_rotate(p, math.asin(2 / (math.sqrt(3) + math.sqrt(15))), 'z') for p in v]
    return v, faces


def ac_chords(base, N):
    """Acidome splitFaces: rows grow from each face's lowest-numbered corner; points are normalised chord midpoints."""
    verts, faces = base
    pts = list(verts)
    cache = {}

    def mid(key, ai, bi, q):
        v = cache.get(key)
        if v is not None:
            return v
        if q == 0:
            v = ai
        elif q == 1:
            v = bi
        else:
            pts.append(_norm(_add(_mul(pts[ai], 1 - q), _mul(pts[bi], q))))
            v = len(pts) - 1
        cache[key] = v
        return v

    tris = []
    for face in faces:
        f = list(face)
        mini = min(f)
        while f[0] != mini:
            f.append(f.pop(0))
        A, B, C = f
        up = [A]
        for n in range(1, N + 1):
            li = mid((A, B, n), A, B, n / N)
            ri = mid((A, C, n), A, C, n / N)
            down = [mid((li, ri, i) if li < ri else (ri, li, n - i), li, ri, i / n) for i in range(n + 1)]
            tris.append((up[0], down[0], down[1]))
            for i in range(1, len(up)):
                tris.append((up[i], up[i - 1], down[i]))
                tris.append((up[i], down[i], down[i + 1]))
            up = down
    return AcidomeMesh(pts, tris)


def ac_kruschke(base, N):
    """Acidome Kruschke: Chords, then pull each spoke around the 12 base hubs to Kruschke's length (3V and 4V only)."""
    mesh = ac_chords(base, N)
    mr = 0.9442890204731844 if N == 3 else 0.22219 / 0.253185 * 0.9983958444733023
    n_base = len(base[0])
    for a, b in edges_of(mesh.tris):
        if (a < n_base) == (b < n_base):
            continue
        E, S = (a, b) if a < n_base else (b, a)
        mesh.pts[S] = _norm(_add(_mul(mesh.pts[E], 1 - mr), _mul(mesh.pts[S], mr)))
    return mesh


def ac_arcs(base, N):
    """Acidome splitFaces_EA: equal-arc edge points; each inner point is the spherical incentre of three great circles."""
    verts, faces = base
    pts = list(verts)
    cache = {}
    tris = []
    lines = {}

    def edge_point(a, b, i, key=None):
        if key is None:
            key = (a, b, i) if a < b else (b, a, N - i)
        if i * 2 > N:
            return edge_point(b, a, N - i, key)
        hit = cache.get(key)
        if hit is not None:
            return hit
        A, B = pts[a], pts[b]
        cos = _dot(A, B) / (_len(A) * _len(B))
        if abs(cos - 1) < 1e-9:
            cos = 1.0
        elif abs(cos + 1) < 1e-9:
            cos = -1.0
        Y = _norm(_sub(B, _mul(A, cos)))
        ang = math.acos(cos) * i / N
        pts.append(_add(_mul(Y, math.sin(ang)), _mul(A, math.cos(ang))))
        cache[key] = len(pts) - 1
        return len(pts) - 1

    def add_face(A, B, C, side):
        tris.append((A, B, C))
        for (u, v), s in zip(((B, C), (C, A), (A, B)), side):
            key = (u, v) if u < v else (v, u)
            if key not in lines:
                lines[key] = _GridLine(u, v, s)

    def circle(u, v):
        return _norm(_cross(pts[u], pts[v]))

    def seg(a, b):
        return [a] + [edge_point(a, b, i) for i in range(1, N)] + [b]

    for A, B, C in faces:
        AB, BC, CA = seg(A, B), seg(B, C), seg(C, A)
        up = [A]
        for n in range(1, N + 1):
            down = [CA[N - n]]
            for i in range(1, n):
                if n == N:
                    down.append(BC[N - i])
                    continue
                n1 = circle(AB[n], CA[N - n])
                n2 = circle(BC[N - i], AB[i])
                n3 = circle(CA[N - n + i], BC[n - i])
                x = _norm(_cross(_sub(n1, n2), _sub(n3, n2)))
                if _dot(x, pts[A]) < 0:
                    x = _mul(x, -1)
                pts.append(x)
                down.append(len(pts) - 1)
            down.append(AB[n])
            for i in range(n):
                add_face(up[i], down[i + 1], down[i], (n, N - i, N - n + i + 1))
                if i > 0:
                    add_face(down[i], up[i - 1], up[i], (n - 1, N - i, N - n + i))
            up = down
    return AcidomeMesh(pts, tris, list(lines.values()))


def ac_mexican(base, N):
    """Acidome Mexican: Arcs, then equalise strut lengths within each grid-line family (300 passes max)."""
    mesh = ac_arcs(base, N)
    pts = mesh.pts
    groups = {}
    for l in mesh.lines:
        groups.setdefault(l.side, []).append(l)
    ordered = [groups[k] for k in sorted(groups)]
    # Acidome means to push every hub back onto the sphere after each pass, but it collects the hubs with
    # underscore 1.8's flatten() on an object, which returns [], so nothing is renormalised and hubs drift
    # slightly outward (about 0.003% at 4V). We skip it too so lengths match what Acidome really outputs.
    step = 0
    while True:
        delta = 0
        for l in mesh.lines:
            l.d = _sub(pts[l.a], pts[l.b])
            l.len = _len(l.d)
        for g in ordered:
            mn, mx, total = math.inf, -math.inf, 0.0
            for l in g:  # a plain loop: sum() of floats is compensated since Python 3.12, JavaScript's isn't
                mn = min(mn, l.len)
                mx = max(mx, l.len)
                total += l.len
            diff = mx - mn
            if diff < 1e-12:
                continue
            delta = max(delta, diff)
            avg = total / len(g)
            for l in g:
                q = (avg - l.len) / l.len / 4
                pts[l.a] = _add(pts[l.a], _mul(l.d, q))
                pts[l.b] = _add(pts[l.b], _mul(l.d, -q))
        if not delta:
            break
        step += 1
        if step >= 300:
            break
    return mesh


_BUILDERS = {'chords': ac_chords, 'arcs': ac_arcs, 'mexican': ac_mexican, 'kruschke': ac_kruschke}


def edges_of(tris):
    """Unique edges (lo, hi) in the order they are first met."""
    seen = set()
    edges = []
    for t in tris:
        for k in range(3):
            a, b = t[k], t[(k + 1) % 3]
            key = (a, b) if a < b else (b, a)
            if key not in seen:
                seen.add(key)
                edges.append(key)
    return edges


def _face_neighbours(tris):
    """Faces sharing each edge, for the wave cut."""
    by_edge = {}
    for f, t in enumerate(tris):
        for k in range(3):
            a, b = t[k], t[(k + 1) % 3]
            by_edge.setdefault((a, b) if a < b else (b, a), []).append(f)
    nb = [[] for _ in tris]
    for fs in by_edge.values():
        for f in fs:
            for g in fs:
                if f != g:
                    nb[f].append(g)
    return nb


def ac_slice_by_fraction(mesh, frac):
    """Acidome sliceByFraction: from the top hub, keep whole waves of edge-adjacent faces until the fraction is reached."""
    total = len(mesh.tris)
    top = 0
    for i, p in enumerate(mesh.pts):
        if p[1] >= mesh.pts[top][1]:
            top = i
    nb = _face_neighbours(mesh.tris)
    live = [False] * total
    wave = [f for f, t in enumerate(mesh.tris) if top in t]
    count = 0
    while count < frac * total - 1e-9 and wave:
        ready = set()
        for f in wave:
            live[f] = True
            count += 1
        for f in wave:
            for g in nb[f]:
                if not live[g]:
                    ready.add(g)
        wave = sorted(ready)
    return live


def ac_slice_by_axis(mesh, frac):
    """Acidome sliceByAxis: keep faces whose centroid is above y = 1 - 2f (plus faces whose vertices all belong to kept faces)."""
    t = 1 - 2 * frac
    flagged = [False] * len(mesh.pts)
    for tri in mesh.tris:
        c = (mesh.pts[tri[0]][1] + mesh.pts[tri[1]][1] + mesh.pts[tri[2]][1]) / 3
        if abs(c - t) > 1e-6 and c > t:
            for i in tri:
                flagged[i] = True
    return [all(flagged[i] for i in tri) for tri in mesh.tris]


def flatten_base(pts, tris, keep, axis, radius=1.0):
    """Acidome groundSliced: move boundary hubs along their meridians to the boundary height closest to the equator.

    pts is a list of (x, y, z) tuples on a sphere of the given radius, changed in place; axis is the up axis.
    """
    in_kept = [False] * len(pts)
    in_cut = [False] * len(pts)
    for t, k in zip(tris, keep):
        side = in_kept if k else in_cut
        for i in t:
            side[i] = True
    boundary = [i for i in range(len(pts)) if in_kept[i] and in_cut[i]]
    if not boundary:
        return
    aval = None
    for i in boundary:
        y = pts[i][axis]
        aval = aval if (aval and abs(aval) < abs(y)) else y
    for i in boundary:
        p = list(pts[i])
        if abs(p[axis] - aval) <= 1e-6 * radius:
            continue
        p[axis] = aval
        l = _len(p)
        q = math.sqrt((radius * radius - aval * aval) / (l * l - aval * aval))
        for k in range(3):
            if k != axis:
                p[k] *= q
        pts[i] = tuple(p)


def acidome_partials(base, V):
    """The fractions Acidome offers for a base and frequency: they land on complete rows of faces."""
    pairs = []
    if base == 'octahedron':
        V2 = V * V
        for p in range(1, V + 1):
            pairs.append((p * p, 2 * V2))
        p2 = 0
        for p in range(V, 0, -1):
            p2 += 2 * p - 1
            pairs.append((V2 + p2, 2 * V2))
    else:
        p, q = V, V * 4
        while p <= V * 4:
            pairs.append((p, q))
            p += 2 if p != V * 3 else V
    return [Fraction(p, q) for p, q in pairs]


def nearest_acidome_partial(base, V, value):
    """Acidome snaps any other fraction to the nearest one it offers."""
    best, gap = Fraction(1), math.inf
    for c in acidome_partials(base, V):
        d = abs(min(1.0, float(c)) - value)
        if d < gap - 1e-12:
            gap, best = d, c
    return best


def parse_partial(text):
    """'7/12', '0.583' or '1' -> float (for the command line)."""
    try:
        return float(Fraction(text.strip())) if '/' in text else float(text)
    except (ValueError, ZeroDivisionError):
        raise argparse.ArgumentTypeError(f"expected a number like 0.5 or a fraction like 7/12, got {text!r}")


class GeodesicDome:
    """Generate geodesic dome geometry

    method:    'flat' (default), 'chords', 'arcs', 'mexican' or 'kruschke'
    symmetry:  what points up: 'pentad' (a vertex), 'cross' (an edge) or 'triad' (a face).
               Default: the flat grid's native orientation (cross for the icosahedron,
               pentad for the octahedron), or pentad for the Acidome methods.
    flat_base: after a partial cut, move the boundary hubs to one height so the dome
               stands flat (Acidome's rule; ignored for full spheres).

    The Acidome methods cut along whole rows of faces, so cut_to_partial() snaps to the
    nearest fraction Acidome offers (see acidome_partials) and drops the hubs below the
    cut. The flat method keeps them in self.vertices, as it always has; call
    drop_unused_vertices() to remove them.
    """

    def __init__(self, frequency=3, radius=1.0, base='icosahedron',
                 method='flat', symmetry=None, flat_base=False):
        if method not in METHODS:
            raise ValueError(f"method must be one of {', '.join(METHODS)}, got {method!r}")
        if symmetry is not None and symmetry not in SYMMETRIES:
            raise ValueError(f"symmetry must be one of {', '.join(SYMMETRIES)}, got {symmetry!r}")
        self.frequency = frequency
        self.radius = radius
        self.base = base
        self.method = method
        self.symmetry = symmetry or default_symmetry(method, base)
        self.flat_base = flat_base
        self.partial = 1.0  # fraction of the sphere actually built
        self.vertices = []
        self.faces = []
        self.edges = []
        self._unit = None  # Acidome methods: the full y-up unit mesh, kept for cutting

    @property
    def effective_method(self):
        """The method actually used (Kruschke falls back to Chords outside 3V/4V icosahedra)."""
        return effective_method(self.method, self.base, self.frequency)

    def is_default_flat(self):
        """True when this is the original flat-grid dome (native orientation, no base flattening)."""
        return (self.method == 'flat' and self.symmetry == NATIVE_SYMMETRY[_base_name(self.base)]
                and not self.flat_base)

    def generate_icosahedron(self):
        """Generate base icosahedron vertices and faces"""
        phi = (1 + np.sqrt(5)) / 2  # Golden ratio
        
        # 12 vertices of icosahedron
        vertices = [
            Vector3(-1,  phi,  0), Vector3( 1,  phi,  0),
            Vector3(-1, -phi,  0), Vector3( 1, -phi,  0),
            Vector3( 0, -1,  phi), Vector3( 0,  1,  phi),
            Vector3( 0, -1, -phi), Vector3( 0,  1, -phi),
            Vector3( phi,  0, -1), Vector3( phi,  0,  1),
            Vector3(-phi,  0, -1), Vector3(-phi,  0,  1),
        ]
        
        # Normalize to unit sphere
        vertices = [v.normalize() for v in vertices]
        
        # 20 faces of icosahedron
        faces = [
            (0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11),
            (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
            (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9),
            (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1),
        ]
        
        return vertices, faces
    
    def generate_octahedron(self):
        """Generate base octahedron vertices and faces"""
        vertices = [
            Vector3( 1,  0,  0), Vector3(-1,  0,  0),
            Vector3( 0,  1,  0), Vector3( 0, -1,  0),
            Vector3( 0,  0,  1), Vector3( 0,  0, -1),
        ]
        
        faces = [
            (0, 2, 4), (0, 4, 3), (0, 3, 5), (0, 5, 2),
            (1, 4, 2), (1, 3, 4), (1, 5, 3), (1, 2, 5),
        ]
        
        return vertices, faces
    
    def subdivide_face(self, v1, v2, v3, freq):
        """Subdivide a triangular face into smaller triangles"""
        new_faces = []
        
        # Create grid of points on the face
        points = {}
        for i in range(freq + 1):
            for j in range(freq + 1 - i):
                k = freq - i - j
                # Barycentric coordinates
                u = i / freq
                v = j / freq
                w = k / freq
                
                # Interpolate position
                p = v1 * w + v2 * u + v3 * v
                # Project to sphere (for geodesic)
                p = p.normalize() * self.radius
                points[(i, j)] = p
        
        # Create faces from grid
        for i in range(freq):
            for j in range(freq - i):
                # Triangle 1
                p1 = points[(i, j)]
                p2 = points[(i + 1, j)]
                p3 = points[(i, j + 1)]
                new_faces.append((p1, p2, p3))
                
                # Triangle 2 (if not at edge)
                if j < freq - i - 1:
                    p1 = points[(i + 1, j)]
                    p2 = points[(i + 1, j + 1)]
                    p3 = points[(i, j + 1)]
                    new_faces.append((p1, p2, p3))
        
        return new_faces
    
    def generate(self):
        """Generate the geodesic dome"""
        if self.method != 'flat':
            return self._generate_acidome()

        # Get base polyhedron
        if self.base == 'icosahedron':
            base_verts, base_faces = self.generate_icosahedron()
        else:
            base_verts, base_faces = self.generate_octahedron()
        
        # Turned to another symmetry, follow the viewer's flat grid step for step
        orient = _FLAT_ORIENT[_base_name(self.base)].get(self.symmetry)
        if orient:
            return self._generate_turned_flat(base_faces, orient)
        
        # Scale to radius
        base_verts = [v * self.radius for v in base_verts]
        
        # Subdivide each face
        all_faces = []
        for face_indices in base_faces:
            v1 = base_verts[face_indices[0]]
            v2 = base_verts[face_indices[1]]
            v3 = base_verts[face_indices[2]]
            
            subdivided = self.subdivide_face(v1, v2, v3, self.frequency)
            all_faces.extend(subdivided)
        
        # Collect unique vertices
        vertex_map = {}
        unique_verts = []
        indexed_faces = []
        
        for face in all_faces:
            face_indices = []
            for v in face:
                # Round to avoid floating point duplicates
                key = tuple(round(x, 6) for x in v.to_tuple())
                if key not in vertex_map:
                    vertex_map[key] = len(unique_verts)
                    unique_verts.append(v)
                face_indices.append(vertex_map[key] + 1)  # OBJ is 1-indexed
            indexed_faces.append(face_indices)
        
        self.vertices = unique_verts
        self.faces = indexed_faces
        
        return self
    
    def _generate_turned_flat(self, base_faces, orient):
        """The flat grid on a turned base solid, as web/index.html's pythonGeodesic builds it."""
        f = self.frequency
        verts = [orient(_norm(v)) for v in _FLAT_RAW_VERTS[_base_name(self.base)]]
        key_index = {}
        pts = []
        
        def idx(q):
            # JavaScript's Math.round, so hubs merge exactly as in the viewer
            k = tuple(math.floor(c * 1e6 + 0.5) for c in q)
            if k not in key_index:
                key_index[k] = len(pts)
                pts.append(q)
            return key_index[k] + 1  # OBJ is 1-indexed
        
        faces = []
        for a, b, c in base_faces:
            A, B, C = verts[a], verts[b], verts[c]
            g = [[_norm(_add(_add(_mul(A, (f - i - j) / f), _mul(B, i / f)), _mul(C, j / f)))
                  for j in range(f - i + 1)] for i in range(f + 1)]
            for i in range(f):
                for j in range(f - i):
                    faces.append([idx(g[i][j]), idx(g[i + 1][j]), idx(g[i][j + 1])])
                    if j < f - i - 1:
                        faces.append([idx(g[i + 1][j]), idx(g[i + 1][j + 1]), idx(g[i][j + 1])])
        self.vertices = [Vector3(*q) * self.radius for q in pts]
        self.faces = faces
        return self
    
    def cut_to_partial(self, partial_fraction):
        """Cut dome to partial sphere (e.g., hemisphere = 0.5, or a fraction string like '7/12')"""
        if isinstance(partial_fraction, str):
            partial_fraction = parse_partial(partial_fraction)
        if self.method != 'flat':
            return self._cut_acidome(partial_fraction)
        if partial_fraction >= 1.0:
            return self
        
        # Calculate cutting height
        # For hemisphere: cut at z=0
        # For 3/4: cut at z = -radius/2
        cut_height = self.radius * (1 - 2 * partial_fraction)
        # A turned grid leaves equator hubs a rounding error either side of z = 0, so it gets the
        # viewer's tolerance; the native orientation keeps its original exact test.
        if self.symmetry != NATIVE_SYMMETRY[_base_name(self.base)]:
            cut_height -= 1e-9 * self.radius
        
        # Filter faces that are above cut height
        filtered_faces = []
        keep = []
        for face in self.faces:
            # Check if all vertices are above cut
            verts = [self.vertices[i - 1] for i in face]
            keep.append(all(v.z >= cut_height for v in verts))
            if keep[-1]:
                filtered_faces.append(face)
        
        if self.flat_base:
            pts = [v.to_tuple() for v in self.vertices]
            flatten_base(pts, [[i - 1 for i in face] for face in self.faces], keep, 2, self.radius)
            self.vertices = [Vector3(*p) for p in pts]
        
        self.faces = filtered_faces
        self.partial = partial_fraction
        return self
    
    def _generate_acidome(self):
        """Build the full Acidome mesh on a unit sphere (y-up) and publish it z-up."""
        build = _BUILDERS[self.effective_method]
        self._unit = build(acidome_base(_base_name(self.base), self.symmetry), max(1, int(self.frequency)))
        self.partial = 1.0
        self._set_from_unit(self._unit.pts, [True] * len(self._unit.tris))
        return self
    
    def _cut_acidome(self, partial_fraction):
        """Acidome's cut: whole rows from the top (Pentad) or by face centroid height (Cross, Triad)."""
        if self._unit is None:
            self._generate_acidome()
        if partial_fraction >= 1.0:
            frac = 1.0
        else:
            frac = float(nearest_acidome_partial(_base_name(self.base), self.frequency, partial_fraction))
        pts = list(self._unit.pts)
        tris = self._unit.tris
        if frac >= 1:
            keep = [True] * len(tris)
        else:
            mesh = AcidomeMesh(pts, tris)
            keep = ac_slice_by_fraction(mesh, frac) if self.symmetry == 'pentad' else ac_slice_by_axis(mesh, frac)
            if self.flat_base:
                flatten_base(pts, tris, keep, 1)
        self.partial = frac
        self._set_from_unit(pts, keep)
        return self
    
    def _set_from_unit(self, pts, keep):
        """Unit y-up Acidome points -> z-up, outward-wound, scaled; drops faces not kept and unused hubs."""
        tris = [t for t, k in zip(self._unit.tris, keep) if k]
        used = [False] * len(pts)
        for t in tris:
            for i in t:
                used[i] = True
        remap = [0] * len(pts)
        self.vertices = []
        for i, (x, y, z) in enumerate(pts):
            if used[i]:
                self.vertices.append(Vector3(x, -z, y) * self.radius)
                remap[i] = len(self.vertices)  # OBJ is 1-indexed
        # y-up -> z-up flips handedness, so reverse Acidome's winding to keep faces pointing out
        self.faces = [[remap[a], remap[c], remap[b]] for a, b, c in tris]
    
    def drop_unused_vertices(self):
        """Remove vertices no face uses (the flat cut leaves them in), keeping the original order."""
        used = sorted({i for face in self.faces for i in face})
        remap = {old: new for new, old in enumerate(used, 1)}
        self.vertices = [self.vertices[i - 1] for i in used]
        self.faces = [[remap[i] for i in face] for face in self.faces]
        return self
    
    def partial_text(self):
        """The built fraction as text: '7/12' for Acidome row fractions, else the number given."""
        if self.partial >= 1:
            return 'full'
        if self.method != 'flat':
            return str(Fraction(self.partial).limit_denominator(1000))
        return f"{self.partial:g}"
    
    def method_header(self, always=False):
        """Extra OBJ comment lines describing the method; by default none for the original flat grid, so its files don't change."""
        if self.is_default_flat() and not always:
            return []
        lines = [f"# Method: {METHOD_LABELS[self.effective_method]}, symmetry: {self.symmetry}",
                 f"# Partial: {self.partial_text()}{', flattened base' if self.flat_base and self.partial < 1 else ''}"]
        if self.method != 'flat':
            lines.append(f"# {ACIDOME_CREDIT}")
        return lines
    
    def to_obj(self, filename):
        """Export to Wavefront .obj file"""
        lines = [
            "# Geodesic Dome",
            f"# Frequency: {self.frequency}V",
            f"# Radius: {self.radius}m",
            f"# Base: {self.base}",
            *self.method_header(),
            f"# Vertices: {len(self.vertices)}",
            f"# Faces: {len(self.faces)}",
            "",
        ]
        
        # Write vertices
        for v in self.vertices:
            lines.append(f"v {v.x:.6f} {v.y:.6f} {v.z:.6f}")
        
        lines.append("")
        
        # Write faces
        for face in self.faces:
            lines.append(f"f {' '.join(map(str, face))}")
        
        # Save to file
        Path(filename).write_text('\n'.join(lines))
        print(f"✓ Saved: {filename}")
        print(f"  Vertices: {len(self.vertices)}, Faces: {len(self.faces)}")


def main(argv=None, prog=None):
    """Generate example domes"""
    parser = argparse.ArgumentParser(prog=prog,
        description='Generate geodesic dome .obj files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --presets                    # Generate all preset domes
  %(prog)s -f 4 -r 10 -p 0.5           # 4V hemisphere, 10m radius
  %(prog)s -f 3 -r 3.5 -p 0.583        # Greenhouse dome (7/12 sphere)
  %(prog)s -f 4 -r 8 -p 1.0 -o dome.obj # Full sphere planetarium
  %(prog)s -f 3 -r 3.5 -p 7/12 -m kruschke          # Acidome Kruschke greenhouse
  %(prog)s -f 4 -r 5 -p 5/8 -m chords --flat-base   # 5/8 dome standing flat
  %(prog)s -f 4 -r 5 -p 1/2 -m mexican -s cross     # Mexican hemisphere, edge up

Methods (-m):
  flat      Equal divisions of the flat base triangle pushed out to the sphere
  chords    Acidome Equal Chords
  arcs      Acidome Equal Arcs
  mexican   Acidome Mexican: Arcs with struts on each grid line equalised
  kruschke  Acidome Kruschke (3V and 4V icosahedra only, otherwise Chords)
The Acidome methods (acidome.ru/lab/calc, by popitch) cut along whole rows of
faces, so -p snaps to the nearest fraction Acidome offers.
        """
    )
    
    parser.add_argument('-f', '--frequency', type=int, default=3,
                        help='Subdivision frequency (2-6, default: 3)')
    parser.add_argument('-r', '--radius', type=float, default=5.0,
                        help='Dome radius in meters (default: 5.0)')
    parser.add_argument('-p', '--partial', type=parse_partial, default=0.5,
                        help='Sphere fraction 0.0-1.0 or a fraction like 7/12 (default: 0.5 = hemisphere)')
    parser.add_argument('-b', '--base', choices=['icosahedron', 'octahedron'],
                        default='icosahedron',
                        help='Base polyhedron (default: icosahedron)')
    parser.add_argument('-m', '--method', choices=METHODS, default='flat',
                        help='Subdivision method (default: flat)')
    parser.add_argument('-s', '--symmetry', choices=SYMMETRIES,
                        help='What points up: pentad (a vertex), cross (an edge) or triad (a face). '
                             'Default: cross for the flat icosahedron, pentad otherwise')
    parser.add_argument('--flat-base', action='store_true',
                        help='Move the hubs on the cut edge to one height so the dome stands flat')
    parser.add_argument('-o', '--output', type=str,
                        help='Output filename (default: auto-generated)')
    parser.add_argument('--output-dir', type=str, default='dome_output',
                        help='Output directory (default: dome_output)')
    parser.add_argument('--presets', action='store_true',
                        help='Generate all preset domes')
    
    args = parser.parse_args(argv)
    options = dict(method=args.method, symmetry=args.symmetry, flat_base=args.flat_base)
    
    print("Geodesic Dome Generator")
    print("=" * 60)
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(exist_ok=True)
    
    if args.presets:
        # Generate preset configurations
        configs = [
            ("hemisphere_2v", 2, 5.0, 0.5),
            ("hemisphere_3v", 3, 5.0, 0.5),
            ("hemisphere_4v", 4, 5.0, 0.5),
            ("three_quarter_3v", 3, 5.0, 0.75),
            ("full_sphere_3v", 3, 5.0, 1.0),
            ("greenhouse_3v", 3, 3.5, 7/12),
        ]
        
        for name, freq, radius, partial in configs:
            print(f"\nGenerating: {name}")
            dome = GeodesicDome(frequency=freq, radius=radius, base='icosahedron', **options)
            dome.generate()
            dome.cut_to_partial(partial)
            dome.to_obj(output_dir / f"{name}.obj")
    else:
        dome = GeodesicDome(frequency=args.frequency, radius=args.radius, base=args.base, **options)
        
        print(f"\nConfiguration:")
        print(f"  Frequency: {args.frequency}V")
        print(f"  Radius: {args.radius}m")
        print(f"  Partial: {args.partial:g} ({args.partial*100:.0f}% of sphere)")
        print(f"  Base: {args.base}")
        print(f"  Method: {METHOD_LABELS[dome.effective_method]}, symmetry: {dome.symmetry}"
              f"{', flat base' if args.flat_base else ''}")
        if dome.effective_method != args.method:
            print("  Note: Kruschke is only defined for 3V and 4V icosahedra, so this is Chords")
        
        dome.generate()
        dome.cut_to_partial(args.partial)
        if dome.partial != args.partial and args.partial < 1:
            print(f"  Note: Acidome cuts whole rows of faces, so the partial is {dome.partial_text()}")
        
        # Generate custom dome
        if args.output:
            filename = args.output
        else:
            partial_str = f"{dome.partial:.2f}".replace('.', '_')
            suffix = '' if dome.is_default_flat() else (
                f"_{dome.effective_method}_{dome.symmetry}" + ('_flat' if args.flat_base else ''))
            filename = f"dome_{args.frequency}v_r{args.radius:.1f}_p{partial_str}{suffix}.obj"
        dome.to_obj(output_dir / filename)
    
    print("\n" + "=" * 60)
    print(f"\nDomes saved to: {output_dir}/")
    print("\nTo import into Blender:")
    print("  File > Import > Wavefront (.obj)")
    print(f"  Navigate to {output_dir}/")


if __name__ == '__main__':
    main()
