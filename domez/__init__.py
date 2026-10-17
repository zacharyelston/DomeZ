"""
DomeZ: geodesic spheres, ellipsoids and eggs, with Acidome-compatible subdivision.

    from domez import GeodesicDome, EllipsoidalGeodesic, EggGeodesic

    GeodesicDome(frequency=3, radius=3.0, method='chords').generate().cut_to_partial('3/4')

Command line: python3 -m domez --help
"""

from .dome import (
    GeodesicDome,
    Vector3,
    METHODS,
    SYMMETRIES,
    acidome_partials,
    edges_of,
    parse_partial,
)
from .shapes import (
    EggGeodesic,
    EllipsoidalGeodesic,
    MeshGeodesifier,
    SpacecraftGeodesifier,
    TubularGeodesic,
)
from .polyhedra import PolyhedraGenerator
from .unfold import build_adjacency, load_obj, steepest_edge_unfold

__version__ = '0.2.0'

__all__ = [
    'GeodesicDome', 'Vector3', 'METHODS', 'SYMMETRIES', 'acidome_partials', 'edges_of', 'parse_partial',
    'EggGeodesic', 'EllipsoidalGeodesic', 'MeshGeodesifier', 'SpacecraftGeodesifier', 'TubularGeodesic',
    'PolyhedraGenerator', 'build_adjacency', 'load_obj', 'steepest_edge_unfold',
]
