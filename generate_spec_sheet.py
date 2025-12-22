#!/usr/bin/env python3
"""
Generate full specification sheets for polyhedra
- 3D shaded view (top left)
- Unfolded layout (main area)
- Statistics box (F, V, E, surface-to-volume ratio)
"""

import numpy as np
from pathlib import Path
import math


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


def calculate_stats(vertices, faces):
    """Calculate polyhedron statistics"""
    V = len(vertices)
    F = len(faces)
    
    # Count unique edges
    edges = set()
    for face in faces:
        for i in range(len(face)):
            v1, v2 = face[i], face[(i + 1) % len(face)]
            edges.add(tuple(sorted([v1, v2])))
    E = len(edges)
    
    # Calculate surface area
    surface_area = 0.0
    for face in faces:
        face_verts = vertices[face]
        if len(face_verts) == 3:
            # Triangle area
            v1, v2, v3 = face_verts
            edge1 = v2 - v1
            edge2 = v3 - v1
            cross = np.cross(edge1, edge2)
            area = np.linalg.norm(cross) * 0.5
            surface_area += area
    
    # Estimate volume (for convex polyhedra)
    # Using divergence theorem approximation
    volume = 0.0
    centroid = np.mean(vertices, axis=0)
    for face in faces:
        face_verts = vertices[face]
        if len(face_verts) == 3:
            v1, v2, v3 = face_verts
            # Signed volume of tetrahedron from origin
            vol = np.dot(v1, np.cross(v2, v3)) / 6.0
            volume += vol
    volume = abs(volume)
    
    # Surface to volume ratio
    sv_ratio = surface_area / volume if volume > 0 else 0
    
    # Euler characteristic (should be 2 for closed polyhedra)
    euler = V - E + F
    
    return {
        'vertices': V,
        'edges': E,
        'faces': F,
        'surface_area': surface_area,
        'volume': volume,
        'sv_ratio': sv_ratio,
        'euler': euler
    }


def project_3d_to_2d(vertices, rotation_x=30, rotation_y=45):
    """Project 3D vertices to 2D with rotation (isometric-like view)"""
    # Convert angles to radians
    rx = np.radians(rotation_x)
    ry = np.radians(rotation_y)
    
    # Rotation matrices
    Rx = np.array([
        [1, 0, 0],
        [0, np.cos(rx), -np.sin(rx)],
        [0, np.sin(rx), np.cos(rx)]
    ])
    
    Ry = np.array([
        [np.cos(ry), 0, np.sin(ry)],
        [0, 1, 0],
        [-np.sin(ry), 0, np.cos(ry)]
    ])
    
    # Apply rotations
    rotated = vertices @ Rx.T @ Ry.T
    
    # Orthographic projection (drop z)
    projected = rotated[:, :2]
    
    return projected


def calculate_face_depth(vertices, face, view_direction=np.array([0, 0, 1])):
    """Calculate face depth for shading (back-face culling)"""
    face_verts = vertices[face]
    if len(face_verts) >= 3:
        # Calculate face normal
        v1, v2, v3 = face_verts[:3]
        edge1 = v2 - v1
        edge2 = v3 - v1
        normal = np.cross(edge1, edge2)
        normal = normal / (np.linalg.norm(normal) + 1e-10)
        
        # Dot product with view direction
        depth = np.dot(normal, view_direction)
        return depth
    return 0


def unfold_simple(vertices, faces):
    """Simple grid layout for unfolded view"""
    unfolded_faces = []
    
    first_face = vertices[faces[0]]
    face_size = np.max(np.ptp(first_face, axis=0))
    
    cols = int(np.ceil(np.sqrt(len(faces))))
    
    for i, face in enumerate(faces):
        row = i // cols
        col = i % cols
        
        face_verts = vertices[face]
        face_2d = face_verts[:, :2]
        
        center = np.mean(face_2d, axis=0)
        face_2d = face_2d - center
        offset = np.array([col * face_size * 1.5, row * face_size * 1.5])
        face_2d = face_2d + offset
        
        unfolded_faces.append(face_2d)
    
    return unfolded_faces


def create_spec_sheet(obj_file, output_file):
    """Create full specification sheet SVG"""
    print(f"Processing: {obj_file}")
    
    # Load mesh
    vertices, faces = load_obj(obj_file)
    
    # Calculate statistics
    stats = calculate_stats(vertices, faces)
    
    # Page dimensions
    page_width = 1200
    page_height = 900
    margin = 40
    
    # 3D view area (top left)
    view_3d_size = 350
    view_3d_x = margin
    view_3d_y = margin + 60
    
    # Stats box (below 3D view)
    stats_x = margin
    stats_y = view_3d_y + view_3d_size + 20
    stats_width = view_3d_size
    stats_height = 200
    
    # Unfolded view area (right side)
    unfold_x = view_3d_x + view_3d_size + 40
    unfold_y = view_3d_y
    unfold_width = page_width - unfold_x - margin
    unfold_height = page_height - unfold_y - margin
    
    # Start SVG
    polyhedron_name = Path(obj_file).stem.replace('_', ' ').title()
    svg = [
        f'<svg width="{page_width}" height="{page_height}" xmlns="http://www.w3.org/2000/svg">',
        f'<rect width="{page_width}" height="{page_height}" fill="#f5f5f5"/>',
        
        # Title
        f'<text x="{page_width/2}" y="35" text-anchor="middle" font-size="24" font-weight="bold">{polyhedron_name} - Specification Sheet</text>',
        
        # Section labels
        f'<text x="{view_3d_x}" y="{view_3d_y - 10}" font-size="14" font-weight="bold">3D View</text>',
        f'<text x="{unfold_x}" y="{unfold_y - 10}" font-size="14" font-weight="bold">Unfolded Layout</text>',
    ]
    
    # === 3D VIEW ===
    svg.append(f'<rect x="{view_3d_x}" y="{view_3d_y}" width="{view_3d_size}" height="{view_3d_size}" fill="white" stroke="#ccc" stroke-width="2"/>')
    
    # Project 3D view
    projected_3d = project_3d_to_2d(vertices, rotation_x=25, rotation_y=35)
    
    # Scale and center 3D view
    min_3d = projected_3d.min(axis=0)
    max_3d = projected_3d.max(axis=0)
    range_3d = max_3d - min_3d
    scale_3d = min(view_3d_size * 0.7 / range_3d[0], view_3d_size * 0.7 / range_3d[1])
    center_3d = (min_3d + max_3d) / 2
    
    projected_3d_scaled = (projected_3d - center_3d) * scale_3d
    projected_3d_scaled[:, 0] += view_3d_x + view_3d_size / 2
    projected_3d_scaled[:, 1] += view_3d_y + view_3d_size / 2
    
    # Draw 3D faces with shading
    face_depths = []
    for i, face in enumerate(faces):
        depth = calculate_face_depth(vertices, face)
        face_depths.append((depth, i, face))
    
    # Sort by depth (back to front)
    face_depths.sort()
    
    for depth, i, face in face_depths:
        if depth < 0:  # Back-face culling
            continue
            
        points = []
        for v_idx in face:
            pt = projected_3d_scaled[v_idx]
            points.append(f"{pt[0]:.2f},{pt[1]:.2f}")
        
        points_str = " ".join(points)
        
        # Shading based on depth
        brightness = int(150 + depth * 100)
        brightness = max(100, min(250, brightness))
        color = f"rgb({brightness},{brightness},{brightness})"
        
        svg.append(f'<polygon points="{points_str}" fill="{color}" stroke="#333" stroke-width="1.5"/>')
    
    # === STATISTICS BOX ===
    svg.extend([
        f'<rect x="{stats_x}" y="{stats_y}" width="{stats_width}" height="{stats_height}" fill="white" stroke="#333" stroke-width="2" rx="5"/>',
        f'<text x="{stats_x + 10}" y="{stats_y + 25}" font-size="14" font-weight="bold">Statistics</text>',
        
        # Stats content
        f'<text x="{stats_x + 20}" y="{stats_y + 55}" font-size="12" font-family="monospace">',
        f'<tspan x="{stats_x + 20}" dy="0">Vertices (V): {stats["vertices"]}</tspan>',
        f'<tspan x="{stats_x + 20}" dy="20">Edges (E): {stats["edges"]}</tspan>',
        f'<tspan x="{stats_x + 20}" dy="20">Faces (F): {stats["faces"]}</tspan>',
        f'<tspan x="{stats_x + 20}" dy="20">Euler: V-E+F = {stats["euler"]}</tspan>',
        '</text>',
        
        f'<line x1="{stats_x + 10}" y1="{stats_y + 125}" x2="{stats_x + stats_width - 10}" y2="{stats_y + 125}" stroke="#ccc" stroke-width="1"/>',
        
        f'<text x="{stats_x + 20}" y="{stats_y + 145}" font-size="11" font-family="monospace">',
        f'<tspan x="{stats_x + 20}" dy="0">Surface Area: {stats["surface_area"]:.4f} m²</tspan>',
        f'<tspan x="{stats_x + 20}" dy="18">Volume: {stats["volume"]:.4f} m³</tspan>',
        f'<tspan x="{stats_x + 20}" dy="18">S/V Ratio: {stats["sv_ratio"]:.4f} m⁻¹</tspan>',
        '</text>',
    ])
    
    # === UNFOLDED VIEW ===
    svg.append(f'<rect x="{unfold_x}" y="{unfold_y}" width="{unfold_width}" height="{unfold_height}" fill="white" stroke="#ccc" stroke-width="2"/>')
    
    # Unfold layout
    unfolded = unfold_simple(vertices, faces)
    
    # Scale and position unfolded view
    all_unfold_points = np.vstack(unfolded)
    min_unfold = all_unfold_points.min(axis=0)
    max_unfold = all_unfold_points.max(axis=0)
    range_unfold = max_unfold - min_unfold
    
    scale_unfold = min(unfold_width * 0.85 / range_unfold[0], unfold_height * 0.85 / range_unfold[1])
    center_unfold = (min_unfold + max_unfold) / 2
    
    # Color palette
    colors = ['#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3',
              '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd']
    
    for i, face_2d in enumerate(unfolded):
        # Scale and position
        face_scaled = (face_2d - center_unfold) * scale_unfold
        face_scaled[:, 0] += unfold_x + unfold_width / 2
        face_scaled[:, 1] += unfold_y + unfold_height / 2
        
        points = []
        for pt in face_scaled:
            points.append(f"{pt[0]:.2f},{pt[1]:.2f}")
        
        points_str = " ".join(points)
        color = colors[i % len(colors)]
        
        svg.append(f'<polygon points="{points_str}" fill="{color}" stroke="#333" stroke-width="2" opacity="0.8"/>')
        
        # Face number
        center = face_scaled.mean(axis=0)
        svg.append(f'<text x="{center[0]:.2f}" y="{center[1]:.2f}" text-anchor="middle" font-size="10" font-weight="bold">{i+1}</text>')
    
    # Footer
    svg.extend([
        f'<text x="{page_width/2}" y="{page_height - 15}" text-anchor="middle" font-size="10" fill="#666">',
        'Generated by Geodesic Dome Generator | Unfolding algorithm: Grid layout (Rust spiral unfolder in development)',
        '</text>',
        '</svg>'
    ])
    
    # Write file
    with open(output_file, 'w') as f:
        f.write('\n'.join(svg))
    
    print(f"  ✓ Saved: {output_file}")
    print(f"    V={stats['vertices']}, E={stats['edges']}, F={stats['faces']}")
    print(f"    Surface/Volume ratio: {stats['sv_ratio']:.4f} m⁻¹")


def main():
    """Generate specification sheets for all polyhedra"""
    print("Geodesic Specification Sheet Generator")
    print("=" * 60)
    print()
    
    # Create output directory
    output_dir = Path('spec_sheets')
    output_dir.mkdir(exist_ok=True)
    
    # Find all OBJ files
    obj_files = list(Path('polyhedra_output').glob('*.obj'))
    
    if not obj_files:
        print("No OBJ files found in polyhedra_output/")
        print("Run: python3 polyhedra_generator.py --type all")
        return
    
    print(f"Found {len(obj_files)} polyhedra")
    print()
    
    # Process each file
    for obj_file in sorted(obj_files):
        output_file = output_dir / f"{obj_file.stem}_spec.svg"
        try:
            create_spec_sheet(obj_file, output_file)
        except Exception as e:
            print(f"  ✗ Error: {e}")
            import traceback
            traceback.print_exc()
        print()
    
    print("=" * 60)
    print(f"Specification sheets saved to: {output_dir}/")
    print("Open SVG files in browser to view")


if __name__ == '__main__':
    main()
