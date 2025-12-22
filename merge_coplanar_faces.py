#!/usr/bin/env python3
"""
Merge coplanar triangular faces back into quads
Fixes the cube unfolding issue where squares are split into triangles
"""

import numpy as np
from collections import defaultdict


def calculate_face_normal(vertices, face):
    """Calculate face normal"""
    if len(face) < 3:
        return np.array([0, 0, 0])
    
    face_verts = vertices[face]
    v1, v2, v3 = face_verts[:3]
    edge1 = v2 - v1
    edge2 = v3 - v1
    normal = np.cross(edge1, edge2)
    norm = np.linalg.norm(normal)
    if norm > 1e-10:
        return normal / norm
    return np.array([0, 0, 0])


def are_coplanar(normal1, normal2, threshold=0.01):
    """Check if two faces are coplanar (same normal)"""
    dot = np.dot(normal1, normal2)
    return abs(abs(dot) - 1.0) < threshold


def share_edge(face1, face2):
    """Check if two faces share an edge"""
    shared = set(face1) & set(face2)
    return len(shared) >= 2


def merge_coplanar_triangles(vertices, faces):
    """
    Merge coplanar triangular faces that share an edge
    Returns new face list with quads where appropriate
    """
    # Calculate normals for all faces
    normals = []
    for face in faces:
        normal = calculate_face_normal(vertices, face)
        normals.append(normal)
    
    # Find coplanar pairs that share an edge
    merged = set()
    new_faces = []
    face_mapping = {}  # old face idx -> new face idx
    
    for i in range(len(faces)):
        if i in merged:
            continue
        
        # Try to find a coplanar neighbor
        found_pair = False
        for j in range(i + 1, len(faces)):
            if j in merged:
                continue
            
            if are_coplanar(normals[i], normals[j]) and share_edge(faces[i], faces[j]):
                # Merge these two triangles into a quad
                shared_verts = list(set(faces[i]) & set(faces[j]))
                all_verts = list(set(faces[i]) | set(faces[j]))
                
                if len(all_verts) == 4:  # Valid quad
                    # Order vertices properly (counter-clockwise)
                    # Start with a non-shared vertex
                    start_vert = [v for v in faces[i] if v not in shared_verts][0]
                    
                    # Build ordered quad
                    quad = [start_vert]
                    remaining = [v for v in all_verts if v != start_vert]
                    
                    # Simple ordering - find adjacent vertices
                    current = start_vert
                    while len(quad) < 4 and remaining:
                        # Find next vertex that shares an edge with current
                        for v in remaining:
                            # Check if v is adjacent to current in either triangle
                            if (current in faces[i] and v in faces[i]) or \
                               (current in faces[j] and v in faces[j]):
                                # Check they're actually adjacent (not diagonal)
                                face_i_list = list(faces[i])
                                face_j_list = list(faces[j])
                                
                                is_adjacent = False
                                if current in face_i_list and v in face_i_list:
                                    idx_curr = face_i_list.index(current)
                                    idx_v = face_i_list.index(v)
                                    if abs(idx_curr - idx_v) == 1 or abs(idx_curr - idx_v) == 2:
                                        is_adjacent = True
                                
                                if current in face_j_list and v in face_j_list:
                                    idx_curr = face_j_list.index(current)
                                    idx_v = face_j_list.index(v)
                                    if abs(idx_curr - idx_v) == 1 or abs(idx_curr - idx_v) == 2:
                                        is_adjacent = True
                                
                                if is_adjacent and v not in quad:
                                    quad.append(v)
                                    remaining.remove(v)
                                    current = v
                                    break
                    
                    if len(quad) == 4:
                        new_face_idx = len(new_faces)
                        new_faces.append(quad)
                        face_mapping[i] = new_face_idx
                        face_mapping[j] = new_face_idx
                        merged.add(i)
                        merged.add(j)
                        found_pair = True
                        break
        
        if not found_pair:
            # Keep as triangle
            new_face_idx = len(new_faces)
            new_faces.append(list(faces[i]))
            face_mapping[i] = new_face_idx
    
    print(f"Merged {len(faces)} faces into {len(new_faces)} faces")
    print(f"  Triangles merged: {len(merged)}")
    print(f"  Quads created: {(len(merged)) // 2}")
    
    return new_faces, face_mapping


if __name__ == '__main__':
    # Test on cube
    from steepest_edge_unfold import load_obj
    
    vertices, faces = load_obj('polyhedra_output/cube.obj')
    print(f"Original: {len(faces)} faces")
    
    new_faces, mapping = merge_coplanar_triangles(vertices, faces)
    print(f"After merge: {len(new_faces)} faces")
    
    # Show face types
    triangles = sum(1 for f in new_faces if len(f) == 3)
    quads = sum(1 for f in new_faces if len(f) == 4)
    print(f"  Triangles: {triangles}")
    print(f"  Quads: {quads}")
