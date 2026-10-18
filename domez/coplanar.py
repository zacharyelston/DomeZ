#!/usr/bin/env python3
"""
Merge coplanar triangle pairs back into quads (cubes and other solids whose faces were triangulated)

The merge lives in smart_unfold, which only pairs triangles that are truly coplanar and only makes
convex quads. This module keeps the two-argument entry point, which also returns where each
original face went.
"""

from .smart_unfold import MeshAnalyzer, merge_coplanar_triangles as _merge_pairs


def merge_coplanar_triangles(vertices, faces):
    """Faces with coplanar triangle pairs merged into quads, and {old face index: new face index}"""
    pairs = MeshAnalyzer(vertices, faces).analyze()['coplanar_pairs']
    new_faces = _merge_pairs(vertices, faces, pairs)
    mapping = {}
    for i, face in enumerate(faces):
        mapping[i] = next(k for k, new in enumerate(new_faces) if set(face) <= set(new))
    return new_faces, mapping


if __name__ == '__main__':
    import sys
    from .unfold import load_obj

    vertices, faces = load_obj(sys.argv[1] if len(sys.argv) > 1 else 'polyhedra_output/cube.obj')
    new_faces, _ = merge_coplanar_triangles(vertices, faces)
    print(f"{len(faces)} faces became {len(new_faces)}: "
          f"{sum(len(f) == 3 for f in new_faces)} triangles, {sum(len(f) == 4 for f in new_faces)} quads")
