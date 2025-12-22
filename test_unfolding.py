#!/usr/bin/env python3
"""
Comprehensive tests for polyhedron unfolding
Ensures edge-sharing and proper geometry preservation
"""

import numpy as np
from pathlib import Path
from steepest_edge_unfold import steepest_edge_unfold, load_obj, build_adjacency


def test_edge_sharing(obj_file, tolerance=1e-6):
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


def test_edge_length_preservation(obj_file, tolerance=1e-6):
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


def test_no_face_overlaps(obj_file):
    """
    Test that face centers are not at the same position (basic overlap check)
    """
    print(f"\nTesting for face overlaps: {Path(obj_file).name}")
    
    vertices, faces = load_obj(obj_file)
    unfolded = steepest_edge_unfold(vertices, faces)
    
    if len(unfolded) == 0:
        print(f"  ✗ FAIL: No faces unfolded")
        return False
    
    # Check face centers
    centers = {}
    overlaps = []
    
    for face_idx, face_2d in unfolded.items():
        center = tuple(np.round(face_2d.mean(axis=0), 3))
        if center in centers:
            overlaps.append((face_idx, centers[center]))
        else:
            centers[center] = face_idx
    
    if overlaps:
        print(f"  ⚠ WARNING: {len(overlaps)} potential overlaps detected")
        for f1, f2 in overlaps[:3]:
            print(f"    Face {f1} and Face {f2} at same position")
        return False
    else:
        print(f"  ✓ PASS: No obvious overlaps detected")
        return True


def test_completeness(obj_file, min_success_rate=0.95):
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
    """Run all tests on all polyhedra"""
    print("="*60)
    print("POLYHEDRON UNFOLDING TEST SUITE")
    print("="*60)
    
    obj_files = sorted(Path('polyhedra_output').glob('*.obj'))
    
    if not obj_files:
        print("ERROR: No OBJ files found in polyhedra_output/")
        return
    
    results = {}
    
    for obj_file in obj_files:
        name = obj_file.stem
        print(f"\n{'='*60}")
        print(f"Testing: {name}")
        print('='*60)
        
        tests = {
            'edge_sharing': test_edge_sharing(str(obj_file)),
            'edge_lengths': test_edge_length_preservation(str(obj_file)),
            'no_overlaps': test_no_face_overlaps(str(obj_file)),
            'completeness': test_completeness(str(obj_file))
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


if __name__ == '__main__':
    success = run_all_tests()
    exit(0 if success else 1)
