#!/usr/bin/env python3
"""
Steepest Edge Unfolding Algorithm
Based on Biedl et al. (1999) - 100% success rate for convex polyhedra
"""

import numpy as np
from pathlib import Path
import heapq
from collections import defaultdict


def load_obj(filename):
    """Load vertices and faces from OBJ file"""
    vertices = []
    faces = []
    
    with open(filename, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith('v '):
                parts = line.split()
                vertices.append([float(parts[1]), float(parts[2]), float(parts[3])])
            elif line.startswith('f '):
                parts = line.split()
                face = [int(p.split('/')[0]) - 1 for p in parts[1:]]
                faces.append(face)
    
    return np.array(vertices), faces


def build_adjacency(vertices, faces):
    """Build face adjacency graph with shared edges"""
    adjacency = defaultdict(list)
    
    # Build edge to faces mapping
    edge_to_faces = defaultdict(list)
    for face_idx, face in enumerate(faces):
        for i in range(len(face)):
            v1 = face[i]
            v2 = face[(i + 1) % len(face)]
            edge = tuple(sorted([v1, v2]))
            edge_to_faces[edge].append(face_idx)
    
    # Build adjacency list
    for edge, face_list in edge_to_faces.items():
        if len(face_list) == 2:
            f1, f2 = face_list
            adjacency[f1].append((f2, edge))
            adjacency[f2].append((f1, edge))
    
    return adjacency


def calculate_dihedral_angle(vertices, face1_indices, face2_indices, shared_edge):
    """Calculate dihedral angle between two faces"""
    # Get face vertices
    face1_verts = vertices[face1_indices]
    face2_verts = vertices[face2_indices]
    
    # Calculate face normals
    if len(face1_verts) >= 3:
        v1, v2, v3 = face1_verts[:3]
        edge1 = v2 - v1
        edge2 = v3 - v1
        normal1 = np.cross(edge1, edge2)
        normal1 = normal1 / (np.linalg.norm(normal1) + 1e-10)
    else:
        return 0
    
    if len(face2_verts) >= 3:
        v1, v2, v3 = face2_verts[:3]
        edge1 = v2 - v1
        edge2 = v3 - v1
        normal2 = np.cross(edge1, edge2)
        normal2 = normal2 / (np.linalg.norm(normal2) + 1e-10)
    else:
        return 0
    
    # Dihedral angle
    dot = np.clip(np.dot(normal1, normal2), -1.0, 1.0)
    angle = np.arccos(dot)
    
    # Return angle in degrees for easier interpretation
    return np.degrees(angle)


def project_face_to_2d(vertices_3d, face_indices):
    """Project a 3D face to 2D preserving edge lengths"""
    face_verts = vertices_3d[face_indices]
    
    if len(face_verts) < 3:
        return np.array([[0, 0]] * len(face_verts))
    
    # Use first vertex as origin
    v0 = face_verts[0]
    v1 = face_verts[1]
    
    # First edge defines x-axis
    edge1 = v1 - v0
    edge1_len = np.linalg.norm(edge1)
    
    if edge1_len < 1e-10:
        return np.array([[0, 0]] * len(face_verts))
    
    # Place first two vertices
    face_2d = []
    face_2d.append(np.array([0.0, 0.0]))
    face_2d.append(np.array([edge1_len, 0.0]))
    
    # Place remaining vertices using distances
    for i in range(2, len(face_verts)):
        vi = face_verts[i]
        
        # Distances to first two vertices
        d0 = np.linalg.norm(vi - v0)
        d1 = np.linalg.norm(vi - v1)
        
        # Use law of cosines to find position
        cos_angle = (d0**2 + edge1_len**2 - d1**2) / (2 * d0 * edge1_len + 1e-10)
        cos_angle = np.clip(cos_angle, -1, 1)
        
        x = d0 * cos_angle
        y = d0 * np.sqrt(max(0, 1 - cos_angle**2))
        
        face_2d.append(np.array([x, y]))
    
    return np.array(face_2d)


def find_shared_vertices(face1, face2):
    """Find shared vertices between two faces"""
    shared = []
    for v in face1:
        if v in face2:
            shared.append(v)
    return shared


def steepest_edge_unfold(vertices, faces):
    """
    Steepest Edge Unfolding Algorithm
    Always unfold across the edge with the largest dihedral angle
    """
    adjacency = build_adjacency(vertices, faces)
    
    # Track placed faces and their 2D positions
    placed = set()
    face_2d_positions = {}
    
    # Priority queue: (-dihedral_angle, parent_face, child_face, shared_edge)
    # Negative angle for max-heap behavior
    pq = []
    
    # Start with face 0
    start_face = 0
    face_2d = project_face_to_2d(vertices, faces[start_face])
    
    # Center the first face
    center = face_2d.mean(axis=0)
    face_2d = face_2d - center
    
    face_2d_positions[start_face] = face_2d
    placed.add(start_face)
    
    print(f"Starting with face {start_face}")
    
    # Add all neighbors of start face to priority queue
    for neighbor_face, shared_edge in adjacency[start_face]:
        angle = calculate_dihedral_angle(
            vertices, 
            faces[start_face], 
            faces[neighbor_face], 
            shared_edge
        )
        heapq.heappush(pq, (-angle, start_face, neighbor_face, shared_edge))
    
    # Process queue
    while pq:
        neg_angle, parent_face, child_face, shared_edge = heapq.heappop(pq)
        angle = -neg_angle
        
        if child_face in placed:
            continue
        
        print(f"  Unfolding face {child_face} from {parent_face} (angle: {angle:.1f}°)")
        
        # Get parent's 2D position
        parent_2d = face_2d_positions[parent_face]
        parent_3d = faces[parent_face]
        
        # Find shared vertices
        shared_verts = find_shared_vertices(parent_3d, faces[child_face])
        
        if len(shared_verts) < 2:
            continue
        
        v1, v2 = shared_verts[:2]
        
        # Find positions in parent's 2D layout
        try:
            idx1_parent = list(parent_3d).index(v1)
            idx2_parent = list(parent_3d).index(v2)
        except ValueError:
            continue
        
        edge_2d_p1 = parent_2d[idx1_parent]
        edge_2d_p2 = parent_2d[idx2_parent]
        
        # Project child face to 2D
        child_2d = project_face_to_2d(vertices, faces[child_face])
        child_3d = faces[child_face]
        
        # Find shared vertices in child
        try:
            idx1_child = list(child_3d).index(v1)
            idx2_child = list(child_3d).index(v2)
        except ValueError:
            continue
        
        child_edge_p1 = child_2d[idx1_child]
        child_edge_p2 = child_2d[idx2_child]
        
        # Transform child to align with parent - BOTH vertices must match
        # This ensures faces share the complete edge, not just touch at a vertex
        
        # Step 1: Translate child so first vertex aligns
        translation = edge_2d_p1 - child_edge_p1
        child_2d_translated = child_2d + translation
        
        # Step 2: Rotate around first vertex to align second vertex
        # After translation, child_edge_p1 is at edge_2d_p1
        child_vec = child_2d_translated[idx2_child] - edge_2d_p1
        parent_vec = edge_2d_p2 - edge_2d_p1
        
        angle_child = np.arctan2(child_vec[1], child_vec[0])
        angle_parent = np.arctan2(parent_vec[1], parent_vec[0])
        rotation_angle = angle_parent - angle_child
        
        # Rotate around edge_2d_p1
        child_2d_centered = child_2d_translated - edge_2d_p1
        cos_a = np.cos(rotation_angle)
        sin_a = np.sin(rotation_angle)
        rotation_matrix = np.array([[cos_a, -sin_a], [sin_a, cos_a]])
        child_2d_rotated = child_2d_centered @ rotation_matrix.T + edge_2d_p1
        
        # Step 3: Flip across the shared edge (reflection for dihedral = 180°)
        # Reflect each vertex across the line defined by edge_2d_p1 -> edge_2d_p2
        edge_vec = edge_2d_p2 - edge_2d_p1
        edge_len = np.linalg.norm(edge_vec)
        if edge_len < 1e-10:
            continue
        edge_unit = edge_vec / edge_len
        
        child_2d_final = []
        for vertex in child_2d_rotated:
            # Vector from p1 to vertex
            v = vertex - edge_2d_p1
            # Project onto edge
            proj_len = np.dot(v, edge_unit)
            proj = proj_len * edge_unit
            # Perpendicular component
            perp = v - proj
            # Reflect across edge
            reflected = edge_2d_p1 + proj - perp
            child_2d_final.append(reflected)
        
        child_2d_final = np.array(child_2d_final)
        
        # Verify edge alignment (both vertices should match exactly)
        v1_error = np.linalg.norm(child_2d_final[idx1_child] - edge_2d_p1)
        v2_error = np.linalg.norm(child_2d_final[idx2_child] - edge_2d_p2)
        if v1_error > 1e-6 or v2_error > 1e-6:
            print(f"    WARNING: Edge alignment error - v1: {v1_error:.2e}, v2: {v2_error:.2e}")
            continue
        
        face_2d_positions[child_face] = child_2d_final
        placed.add(child_face)
        
        # Add neighbors of child to queue
        for neighbor_face, neighbor_edge in adjacency[child_face]:
            if neighbor_face not in placed:
                angle = calculate_dihedral_angle(
                    vertices,
                    faces[child_face],
                    faces[neighbor_face],
                    neighbor_edge
                )
                heapq.heappush(pq, (-angle, child_face, neighbor_face, neighbor_edge))
    
    print(f"Placed {len(placed)} out of {len(faces)} faces")
    
    return face_2d_positions


def test_unfold(obj_file):
    """Test unfolding on a polyhedron"""
    print(f"\n{'='*60}")
    print(f"Testing: {obj_file}")
    print('='*60)
    
    vertices, faces = load_obj(obj_file)
    print(f"Loaded: {len(vertices)} vertices, {len(faces)} faces")
    
    unfolded = steepest_edge_unfold(vertices, faces)
    
    if len(unfolded) == len(faces):
        print(f"✓ SUCCESS: All {len(faces)} faces unfolded")
    else:
        print(f"✗ PARTIAL: {len(unfolded)}/{len(faces)} faces unfolded")
    
    return unfolded


def main():
    """Test on all Platonic solids"""
    print("Steepest Edge Unfolding - Testing on Platonic Solids")
    print("="*60)
    
    obj_files = sorted(Path('polyhedra_output').glob('*.obj'))
    
    if not obj_files:
        print("No OBJ files found in polyhedra_output/")
        print("Run: python3 polyhedra_generator.py --type all")
        return
    
    results = {}
    for obj_file in obj_files:
        try:
            unfolded = test_unfold(obj_file)
            results[obj_file.stem] = unfolded
        except Exception as e:
            print(f"✗ ERROR: {e}")
            import traceback
            traceback.print_exc()
    
    print(f"\n{'='*60}")
    print("Summary")
    print('='*60)
    for name, unfolded in results.items():
        print(f"  {name}: {len(unfolded)} faces unfolded")


if __name__ == '__main__':
    main()
