#!/usr/bin/env python3
"""
Comprehensive tests for polyhedron unfolding
Ensures edge-sharing and proper geometry preservation

The test polyhedra are generated fresh into a temporary folder, so no prior output is needed.
Run with:  python3 tests/test_unfolding.py   (or pytest tests/)
"""

import contextlib
import io
import sys
import tempfile
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from domez.polyhedra import PolyhedraGenerator  # noqa: E402
from domez.unfold import steepest_edge_unfold, load_obj, build_adjacency  # noqa: E402

# (type, frequency) pairs that make up the test set
TEST_POLYHEDRA = [
    ('tetrahedron', 1), ('cube', 1), ('octahedron', 1), ('dodecahedron', 1), ('icosahedron', 1),
    ('icosahedron', 3), ('stella_octangula', 1), ('stella_octangula', 3),
]


def generate_test_polyhedra(output_dir):
    """Write the test polyhedra as OBJ files into output_dir and return their paths"""
    paths = []
    for poly_type, frequency in TEST_POLYHEDRA:
        suffix = f"_{frequency}v" if frequency > 1 else ""
        path = Path(output_dir) / f"{poly_type}{suffix}.obj"
        with contextlib.redirect_stdout(io.StringIO()):
            PolyhedraGenerator(poly_type, frequency=frequency, radius=1.0).generate().to_obj(path)
        paths.append(path)
    return sorted(paths)


def check_edge_sharing(obj_file, tolerance=1e-6):
    """
    Test that unfolded faces share complete edges, not just vertices
    Only checks faces that are adjacent in BOTH 3D and the unfolding tree
    """
    print(f"\nTesting edge sharing: {Path(obj_file).name}")
    
    vertices, faces = load_obj(obj_file)
    adjacency = build_adjacency(vertices, faces)
    unfolded = steepest_edge_unfold(vertices, faces)
    
    if len(unfolded) == 0:
        print(f"  ✗ FAIL: No faces unfolded")
        return False
    
    # Build 2D adjacency - which faces are actually touching in the unfolding
    # Two faces are adjacent in 2D if they share at least 2 vertices with matching positions
    adjacency_2d = {}
    for face_idx in unfolded:
        adjacency_2d[face_idx] = []
        face_2d = unfolded[face_idx]
        
        for other_idx in unfolded:
            if other_idx == face_idx:
                continue
            
            other_2d = unfolded[other_idx]
            
            # Count matching vertices
            matches = 0
            for v1 in face_2d:
                for v2 in other_2d:
                    if np.linalg.norm(v1 - v2) < tolerance:
                        matches += 1
                        break
            
            if matches >= 2:
                adjacency_2d[face_idx].append(other_idx)
    
    # Check edge sharing for faces that are adjacent in BOTH 3D and 2D
    edge_sharing_errors = []
    checked_pairs = set()
    
    for face_idx, neighbors_3d in adjacency.items():
        if face_idx not in unfolded:
            continue
            
        face_2d = unfolded[face_idx]
        neighbors_2d = adjacency_2d.get(face_idx, [])
        
        for neighbor_idx, shared_edge in neighbors_3d:
            if neighbor_idx not in unfolded:
                continue
            
            # Only check if they're also adjacent in 2D
            if neighbor_idx not in neighbors_2d:
                continue
            
            # Avoid checking same pair twice
            pair = tuple(sorted([face_idx, neighbor_idx]))
            if pair in checked_pairs:
                continue
            checked_pairs.add(pair)
            
            neighbor_2d = unfolded[neighbor_idx]
            
            # Find the shared edge vertices in 3D
            v1_3d, v2_3d = shared_edge
            
            # Find these vertices in the 2D layouts
            face_3d = faces[face_idx]
            neighbor_3d = faces[neighbor_idx]
            
            try:
                idx1_face = list(face_3d).index(v1_3d)
                idx2_face = list(face_3d).index(v2_3d)
                idx1_neighbor = list(neighbor_3d).index(v1_3d)
                idx2_neighbor = list(neighbor_3d).index(v2_3d)
            except ValueError:
                continue
            
            # Get 2D positions
            face_v1 = face_2d[idx1_face]
            face_v2 = face_2d[idx2_face]
            neighbor_v1 = neighbor_2d[idx1_neighbor]
            neighbor_v2 = neighbor_2d[idx2_neighbor]
            
            # Check if both vertices match
            v1_error = np.linalg.norm(face_v1 - neighbor_v1)
            v2_error = np.linalg.norm(face_v2 - neighbor_v2)
            
            if v1_error > tolerance or v2_error > tolerance:
                edge_sharing_errors.append({
                    'face': face_idx,
                    'neighbor': neighbor_idx,
                    'v1_error': v1_error,
                    'v2_error': v2_error
                })
    
    if edge_sharing_errors:
        print(f"  ✗ FAIL: {len(edge_sharing_errors)} edge-sharing violations")
        for err in edge_sharing_errors[:3]:  # Show first 3
            print(f"    Face {err['face']} <-> {err['neighbor']}: v1_err={err['v1_error']:.2e}, v2_err={err['v2_error']:.2e}")
        return False
    else:
        print(f"  ✓ PASS: All {len(unfolded)} faces share edges properly")
        return True


def check_edge_length_preservation(obj_file, tolerance=1e-6):
    """
    Test that edge lengths are preserved from 3D to 2D
    """
    print(f"\nTesting edge length preservation: {Path(obj_file).name}")
    
    vertices, faces = load_obj(obj_file)
    unfolded = steepest_edge_unfold(vertices, faces)
    
    if len(unfolded) == 0:
        print(f"  ✗ FAIL: No faces unfolded")
        return False
    
    length_errors = []
    for face_idx, face_2d in unfolded.items():
        face_3d = faces[face_idx]
        
        for i in range(len(face_3d)):
            v1_3d = vertices[face_3d[i]]
            v2_3d = vertices[face_3d[(i + 1) % len(face_3d)]]
            edge_len_3d = np.linalg.norm(v2_3d - v1_3d)
            
            v1_2d = face_2d[i]
            v2_2d = face_2d[(i + 1) % len(face_2d)]
            edge_len_2d = np.linalg.norm(v2_2d - v1_2d)
            
            error = abs(edge_len_3d - edge_len_2d)
            if error > tolerance:
                length_errors.append({
                    'face': face_idx,
                    'edge': i,
                    '3d_len': edge_len_3d,
                    '2d_len': edge_len_2d,
                    'error': error
                })
    
    if length_errors:
        print(f"  ✗ FAIL: {len(length_errors)} edge length violations")
        for err in length_errors[:3]:
            print(f"    Face {err['face']}, edge {err['edge']}: 3D={err['3d_len']:.6f}, 2D={err['2d_len']:.6f}, err={err['error']:.2e}")
        return False
    else:
        print(f"  ✓ PASS: All edge lengths preserved")
        return True


def triangulate_face(face_2d):
    """Split a convex 2D face into a fan of triangles"""
    return [np.array([face_2d[0], face_2d[i], face_2d[i + 1]])
            for i in range(1, len(face_2d) - 1)]


def triangles_overlap(tri_a, tri_b, tolerance=1e-6):
    """
    Separating axis test: True if the triangle interiors intersect.
    Triangles that only touch along an edge or at a vertex do not count,
    and neither does an intersection thinner than `tolerance`.
    """
    for tri in (tri_a, tri_b):
        for i in range(3):
            edge = tri[(i + 1) % 3] - tri[i]
            axis = np.array([-edge[1], edge[0]])
            axis_len = np.linalg.norm(axis)
            if axis_len < 1e-12:
                continue
            axis = axis / axis_len
            proj_a = tri_a @ axis
            proj_b = tri_b @ axis
            depth = min(proj_a.max(), proj_b.max()) - max(proj_a.min(), proj_b.min())
            if depth <= tolerance:
                return False
    return True


def find_face_overlaps(unfolded, tolerance=1e-6):
    """Return (face, other_face) pairs whose 2D interiors intersect"""
    face_ids = sorted(unfolded)
    triangles = {f: triangulate_face(unfolded[f]) for f in face_ids}
    bounds = {f: (unfolded[f].min(axis=0), unfolded[f].max(axis=0)) for f in face_ids}

    overlaps = []
    for i, face_a in enumerate(face_ids):
        min_a, max_a = bounds[face_a]
        for face_b in face_ids[i + 1:]:
            min_b, max_b = bounds[face_b]
            # Cheap bounding-box rejection before the exact test
            if np.any(min_a > max_b - tolerance) or np.any(min_b > max_a - tolerance):
                continue
            if any(triangles_overlap(ta, tb, tolerance)
                   for ta in triangles[face_a] for tb in triangles[face_b]):
                overlaps.append((face_a, face_b))
    return overlaps


def check_no_face_overlaps(obj_file, tolerance=1e-6):
    """
    Test that no two unfolded faces overlap: their interiors must not
    intersect anywhere (sharing an edge or a vertex is fine)
    """
    print(f"\nTesting for face overlaps: {Path(obj_file).name}")

    vertices, faces = load_obj(obj_file)
    unfolded = steepest_edge_unfold(vertices, faces)

    if len(unfolded) == 0:
        print(f"  ✗ FAIL: No faces unfolded")
        return False

    overlaps = find_face_overlaps(unfolded, tolerance)

    if overlaps:
        print(f"  ✗ FAIL: {len(overlaps)} overlapping face pairs")
        for f1, f2 in overlaps[:3]:
            print(f"    Face {f1} overlaps Face {f2}")
        return False
    else:
        print(f"  ✓ PASS: No faces overlap")
        return True


def check_completeness(obj_file, min_success_rate=0.95):
    """
    Test that most faces are successfully unfolded
    """
    print(f"\nTesting completeness: {Path(obj_file).name}")
    
    vertices, faces = load_obj(obj_file)
    unfolded = steepest_edge_unfold(vertices, faces)
    
    success_rate = len(unfolded) / len(faces)
    
    if success_rate >= min_success_rate:
        print(f"  ✓ PASS: {len(unfolded)}/{len(faces)} faces ({success_rate*100:.1f}%)")
        return True
    else:
        print(f"  ✗ FAIL: Only {len(unfolded)}/{len(faces)} faces ({success_rate*100:.1f}%)")
        return False


def run_all_tests():
    """Run all checks on freshly generated test polyhedra"""
    with tempfile.TemporaryDirectory() as tmp:
        return run_checks(generate_test_polyhedra(tmp))


def run_checks(obj_files):
    """Run every check on each OBJ file and print a summary"""
    print("="*60)
    print("POLYHEDRON UNFOLDING TEST SUITE")
    print("="*60)
    
    results = {}
    
    for obj_file in obj_files:
        name = obj_file.stem
        print(f"\n{'='*60}")
        print(f"Testing: {name}")
        print('='*60)
        
        tests = {
            'edge_sharing': check_edge_sharing(str(obj_file)),
            'edge_lengths': check_edge_length_preservation(str(obj_file)),
            'no_overlaps': check_no_face_overlaps(str(obj_file)),
            'completeness': check_completeness(str(obj_file))
        }
        
        results[name] = tests
    
    # Summary
    print(f"\n{'='*60}")
    print("TEST SUMMARY")
    print('='*60)
    
    for name, tests in results.items():
        passed = sum(tests.values())
        total = len(tests)
        status = "✓ PASS" if passed == total else "✗ FAIL" if passed == 0 else "⚠ PARTIAL"
        print(f"{status} {name:25s} {passed}/{total} tests passed")
        
        if passed < total:
            failed = [k for k, v in tests.items() if not v]
            print(f"     Failed: {', '.join(failed)}")
    
    # Overall result
    total_tests = sum(len(tests) for tests in results.values())
    passed_tests = sum(sum(tests.values()) for tests in results.values())
    
    print(f"\n{'='*60}")
    print(f"OVERALL: {passed_tests}/{total_tests} tests passed ({passed_tests/total_tests*100:.1f}%)")
    print('='*60)
    
    return passed_tests == total_tests


def test_all_polyhedra_unfold_cleanly():
    """pytest entry point"""
    assert run_all_tests()


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
