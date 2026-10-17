#!/usr/bin/env python3
"""
Steepest Edge Unfolding Algorithm
Steepest edge cut trees (Schlickenrieder, "Nets of Polyhedra", 1997), tried
over many directions, with a greedy overlap-avoiding fallback. No single
direction is guaranteed to give an overlap-free net.
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


def find_connected_components(num_faces, adjacency):
    """Group faces into pieces connected through shared edges"""
    component_of = {}
    components = []
    
    for start in range(num_faces):
        if start in component_of:
            continue
        
        component = []
        stack = [start]
        component_of[start] = len(components)
        while stack:
            face_idx = stack.pop()
            component.append(face_idx)
            for neighbor_face, _ in adjacency[face_idx]:
                if neighbor_face not in component_of:
                    component_of[neighbor_face] = len(components)
                    stack.append(neighbor_face)
        
        components.append(sorted(component))
    
    return components


def side_of_line(point, line_p1, line_p2):
    """Signed area test: >0 left of p1->p2, <0 right, 0 on the line"""
    edge = line_p2 - line_p1
    offset = point - line_p1
    return edge[0] * offset[1] - edge[1] * offset[0]


def reflect_across_line(points, line_p1, line_p2):
    """Mirror 2D points across the line through p1 and p2"""
    edge_unit = (line_p2 - line_p1) / np.linalg.norm(line_p2 - line_p1)
    offsets = points - line_p1
    proj = np.outer(offsets @ edge_unit, edge_unit)
    perp = offsets - proj
    return line_p1 + proj - perp


def convex_faces_overlap(face_a, face_b, tolerance):
    """
    Separating axis test for two convex 2D faces: True if their interiors
    intersect by more than `tolerance`. Touching along an edge or at a
    vertex does not count as overlapping.
    """
    for face in (face_a, face_b):
        for i in range(len(face)):
            edge = face[(i + 1) % len(face)] - face[i]
            axis = np.array([-edge[1], edge[0]])
            axis_len = np.linalg.norm(axis)
            if axis_len < 1e-12:
                continue
            axis = axis / axis_len
            proj_a = face_a @ axis
            proj_b = face_b @ axis
            if min(proj_a.max(), proj_b.max()) - max(proj_a.min(), proj_b.min()) <= tolerance:
                return False
    return True


def find_overlapping_pair(face_2d_positions, tolerance):
    """Return one pair of faces whose 2D interiors overlap, or None"""
    face_ids = list(face_2d_positions)
    mins = np.array([face_2d_positions[f].min(axis=0) for f in face_ids])
    maxs = np.array([face_2d_positions[f].max(axis=0) for f in face_ids])
    
    # Sweep along x: only faces whose bounding boxes overlap need the exact
    # test, and once faces are sorted by left edge, the candidates for a
    # face are the later ones that start before it ends
    order = np.argsort(mins[:, 0])
    face_ids = [face_ids[i] for i in order]
    mins, maxs = mins[order], maxs[order]
    ends = np.searchsorted(mins[:, 0], maxs[:, 0] - tolerance)
    
    for i, end in enumerate(ends):
        later = np.arange(i + 1, end)
        later = later[(mins[later, 1] < maxs[i, 1] - tolerance)
                      & (mins[i, 1] < maxs[later, 1] - tolerance)]
        for j in later:
            face_a, face_b = face_ids[i], face_ids[j]
            if convex_faces_overlap(face_2d_positions[face_a], face_2d_positions[face_b], tolerance):
                return face_a, face_b
    return None


def candidate_directions(count, seed=0):
    """Fixed pseudo-random unit vectors, so repeated runs give the same net"""
    rng = np.random.default_rng(seed)
    directions = rng.normal(size=(count, 3))
    return directions / np.linalg.norm(directions, axis=1, keepdims=True)


def steepest_edge_cuts(vertices, neighbors, boundary, direction):
    """
    Cut, at every vertex, the edge that climbs most steeply toward
    `direction`. The roots cut nothing: the boundary vertices of an open
    mesh (such as a dome's rim), or else the single highest vertex.
    
    Returns the set of cut edges, or None if some other vertex has no edge
    climbing toward `direction` (its cuts could not reach a root).
    """
    heights = {v: vertices[v] @ direction for v in neighbors}
    roots = boundary or {max(heights, key=heights.get)}
    
    cut_edges = set()
    for v, vertex_neighbors in neighbors.items():
        if v in roots:
            continue
        offsets = vertices[vertex_neighbors] - vertices[v]
        slopes = (offsets @ direction) / np.linalg.norm(offsets, axis=1)
        steepest = int(np.argmax(slopes))
        if slopes[steepest] <= 0:
            return None
        cut_edges.add(tuple(sorted((v, vertex_neighbors[steepest]))))
    
    return cut_edges


def hinge_tree(edge_faces, cut_edges, component):
    """
    Join faces across every interior edge that is not cut. Returns the
    hinge adjacency {face: [(neighbor_face, edge), ...]} if the hinges form
    a spanning tree of the component's faces, else None.
    """
    tree = defaultdict(list)
    num_hinges = 0
    for edge, edge_face_list in edge_faces.items():
        if len(edge_face_list) == 2 and edge not in cut_edges:
            f1, f2 = edge_face_list
            tree[f1].append((f2, edge))
            tree[f2].append((f1, edge))
            num_hinges += 1
    
    if num_hinges != len(component) - 1:
        return None
    
    reached = {component[0]}
    stack = [component[0]]
    while stack:
        for neighbor_face, _ in tree[stack.pop()]:
            if neighbor_face not in reached:
                reached.add(neighbor_face)
                stack.append(neighbor_face)
    
    return tree if len(reached) == len(component) else None


def unfold_along_tree(vertices, faces, tree, start_face):
    """Lay every face of a hinge tree flat, starting from start_face"""
    start_2d = project_face_to_2d(vertices, faces[start_face])
    face_2d_positions = {start_face: start_2d - start_2d.mean(axis=0)}
    
    stack = [start_face]
    while stack:
        parent_face = stack.pop()
        for child_face, shared_edge in tree[parent_face]:
            if child_face in face_2d_positions:
                continue
            child_2d = place_child(
                vertices, faces, parent_face, face_2d_positions[parent_face],
                child_face, shared_edge
            )
            if child_2d is None:
                return None
            face_2d_positions[child_face] = child_2d
            stack.append(child_face)
    
    return face_2d_positions


def steepest_edge_net(vertices, faces, component, directions):
    """
    Try steepest edge unfoldings of one connected part of the mesh toward
    each direction in turn. Returns the first net that keeps every face in
    one piece without overlaps, or None if no direction gives one.
    """
    # Edges of this part and the faces on either side of each
    edge_faces = defaultdict(list)
    for face_idx in component:
        face = faces[face_idx]
        for i in range(len(face)):
            edge = tuple(sorted((face[i], face[(i + 1) % len(face)])))
            edge_faces[edge].append(face_idx)
    
    # An edge shared by 3+ faces has no well-defined unfolding
    if any(len(edge_face_list) > 2 for edge_face_list in edge_faces.values()):
        return None
    
    neighbors = defaultdict(list)
    for v1, v2 in edge_faces:
        neighbors[v1].append(v2)
        neighbors[v2].append(v1)
    boundary = {v for edge, edge_face_list in edge_faces.items()
                if len(edge_face_list) == 1 for v in edge}
    
    mean_edge = np.mean([np.linalg.norm(vertices[v1] - vertices[v2]) for v1, v2 in edge_faces])
    tolerance = 1e-7 * mean_edge
    
    for attempt, direction in enumerate(directions, 1):
        cut_edges = steepest_edge_cuts(vertices, neighbors, boundary, direction)
        if cut_edges is None:
            continue
        tree = hinge_tree(edge_faces, cut_edges, component)
        if tree is None:
            continue
        net = unfold_along_tree(vertices, faces, tree, component[0])
        if net is not None and find_overlapping_pair(net, tolerance) is None:
            print(f"Steepest edge net of {len(component)} faces found "
                  f"(direction {attempt} of {len(directions)})")
            return net
    
    return None


def steepest_edge_unfold(vertices, faces, num_directions=200):
    """
    Unfold a mesh into flat nets without overlaps
    
    Each connected part of the mesh is unfolded with the steepest edge
    method: for a direction c, every vertex cuts the edge that climbs most
    steeply toward c, and faces stay joined across all other edges. This
    usually gives a one-piece net for convex and dome-shaped meshes, but
    not for every c, so up to `num_directions` fixed pseudo-random
    directions are tried and the first overlap-free net is kept.
    
    If none works, that part falls back to a greedy unfolding that always
    hinges across the edge with the largest dihedral angle. It never
    attaches a face where it would overlap a face already in its piece;
    faces that cannot be attached anywhere start a new piece.
    
    Meshes made of several disconnected parts (e.g. a stella octangula,
    which is two interpenetrating tetrahedra) always unfold into at least
    one piece per part. Each piece is laid out to the right of the
    previous one.
    """
    adjacency = build_adjacency(vertices, faces)
    face_2d_positions = {}
    num_pieces = 0
    directions = candidate_directions(num_directions)
    
    components = find_connected_components(len(faces), adjacency)
    if len(components) > 1:
        print(f"Mesh has {len(components)} disconnected parts; unfolding each separately")
    
    for component in components:
        net = steepest_edge_net(vertices, faces, component, directions)
        if net is not None:
            pieces = [net]
        else:
            print(f"No overlap-free steepest edge net for {len(component)} faces; "
                  f"falling back to greedy unfolding")
            pieces = []
            remaining = set(component)
            while remaining:
                piece = unfold_piece(vertices, faces, adjacency, min(remaining), remaining)
                remaining -= piece.keys()
                pieces.append(piece)
        
        for piece in pieces:
            num_pieces += 1
            
            # Lay this piece out next to the pieces already placed
            if face_2d_positions:
                placed_pts = np.vstack(list(face_2d_positions.values()))
                piece_pts = np.vstack(list(piece.values()))
                gap = 0.1 * max(np.ptp(placed_pts, axis=0).max(), np.ptp(piece_pts, axis=0).max())
                shift = np.array([
                    placed_pts[:, 0].max() + gap - piece_pts[:, 0].min(),
                    placed_pts[:, 1].min() - piece_pts[:, 1].min(),
                ])
                piece = {face_idx: pts + shift for face_idx, pts in piece.items()}
            
            face_2d_positions.update(piece)
    
    print(f"Placed {len(face_2d_positions)} out of {len(faces)} faces in {num_pieces} piece(s)")
    
    return face_2d_positions


def place_child(vertices, faces, parent_face, parent_2d, child_face, shared_edge):
    """
    Lay child_face flat beside parent_face (already at parent_2d), hinged
    on their shared edge. Returns the child's 2D vertices, or None if the
    hinge cannot be used.
    """
    v1, v2 = shared_edge
    parent_3d = faces[parent_face]
    
    # Find positions in parent's 2D layout
    try:
        idx1_parent = list(parent_3d).index(v1)
        idx2_parent = list(parent_3d).index(v2)
    except ValueError:
        return None
    
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
        return None
    
    child_edge_p1 = child_2d[idx1_child]
    
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
    
    # Step 3: Make sure the child lies on the far side of the hinge.
    # Hinging the child down into the parent's plane always lands it on
    # the opposite side of the shared edge from the parent. The child's
    # own 2D projection has an arbitrary handedness, so after the
    # rotation it may sit on top of the parent; if so, mirror it across
    # the shared edge (which keeps the hinge vertices fixed).
    if np.linalg.norm(edge_2d_p2 - edge_2d_p1) < 1e-10:
        return None
    
    parent_side = side_of_line(parent_2d.mean(axis=0), edge_2d_p1, edge_2d_p2)
    child_side = side_of_line(child_2d_rotated.mean(axis=0), edge_2d_p1, edge_2d_p2)
    
    if parent_side * child_side > 0:
        child_2d_final = reflect_across_line(child_2d_rotated, edge_2d_p1, edge_2d_p2)
    else:
        child_2d_final = child_2d_rotated
    
    # Verify edge alignment (both vertices should match exactly)
    v1_error = np.linalg.norm(child_2d_final[idx1_child] - edge_2d_p1)
    v2_error = np.linalg.norm(child_2d_final[idx2_child] - edge_2d_p2)
    if v1_error > 1e-6 or v2_error > 1e-6:
        print(f"    WARNING: Edge alignment error - v1: {v1_error:.2e}, v2: {v2_error:.2e}")
        return None
    
    return child_2d_final


def unfold_piece(vertices, faces, adjacency, start_face, allowed_faces):
    """
    Greedy fallback: grow one net piece from start_face, always hinging
    across the edge with the largest dihedral angle, attaching only faces
    in allowed_faces and skipping any hinge that would cause an overlap
    """
    # Track placed faces and their 2D positions
    placed = set()
    face_2d_positions = {}
    
    # Priority queue: (-dihedral_angle, parent_face, child_face, shared_edge)
    # Negative angle for max-heap behavior
    pq = []
    
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
        
        if child_face in placed or child_face not in allowed_faces:
            continue
        
        print(f"  Unfolding face {child_face} from {parent_face} (angle: {angle:.1f}°)")
        
        child_2d_final = place_child(
            vertices, faces, parent_face, face_2d_positions[parent_face],
            child_face, shared_edge
        )
        if child_2d_final is None:
            continue
        
        # Refuse this hinge if the child would overlap the net so far.
        # It may still attach through another neighbor, or start a new piece.
        v1, v2 = shared_edge
        tolerance = 1e-7 * np.linalg.norm(vertices[v1] - vertices[v2])
        child_min = child_2d_final.min(axis=0)
        child_max = child_2d_final.max(axis=0)
        overlapping_face = next(
            (other for other, other_2d in face_2d_positions.items()
             if np.all(child_min < other_2d.max(axis=0) - tolerance)
             and np.all(other_2d.min(axis=0) < child_max - tolerance)
             and convex_faces_overlap(child_2d_final, other_2d, tolerance)),
            None
        )
        if overlapping_face is not None:
            print(f"    Skipped: face {child_face} would overlap face {overlapping_face}")
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
        print("Run: python3 -m domez polyhedra --type all")
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
