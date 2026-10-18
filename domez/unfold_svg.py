#!/usr/bin/env python3
"""
Visualize unfolded Platonic solids as SVG images
No external dependencies required
"""

import argparse
import numpy as np
from pathlib import Path

from .unfold import load_obj


def unfold_simple(vertices, faces):
    """Simple grid layout for visualization"""
    unfolded_faces = []
    
    # Calculate face size
    first_face = vertices[faces[0]]
    face_size = np.max(np.ptp(first_face, axis=0))
    
    # Grid layout
    cols = int(np.ceil(np.sqrt(len(faces))))
    
    for i, face in enumerate(faces):
        row = i // cols
        col = i % cols
        
        # Get face vertices and project to 2D
        face_verts = vertices[face]
        face_2d = face_verts[:, :2]
        
        # Center and position
        center = np.mean(face_2d, axis=0)
        face_2d = face_2d - center
        offset = np.array([col * face_size * 1.5, row * face_size * 1.5])
        face_2d = face_2d + offset
        
        unfolded_faces.append(face_2d)
    
    return unfolded_faces


def create_svg(unfolded_faces, output_file, title, vertex_count, face_count):
    """Create SVG visualization"""
    
    # Calculate bounds
    all_points = np.vstack(unfolded_faces)
    min_x, min_y = all_points.min(axis=0)
    max_x, max_y = all_points.max(axis=0)
    
    margin = 50
    width = int((max_x - min_x) * 100 + 2 * margin)
    height = int((max_y - min_y) * 100 + 2 * margin + 100)  # Extra for title
    
    # Color palette
    colors = [
        '#8dd3c7', '#ffffb3', '#bebada', '#fb8072', '#80b1d3',
        '#fdb462', '#b3de69', '#fccde5', '#d9d9d9', '#bc80bd',
        '#ccebc5', '#ffed6f'
    ]
    
    # Start SVG
    svg = [
        f'<svg width="{width}" height="{height}" xmlns="http://www.w3.org/2000/svg">',
        f'<rect width="{width}" height="{height}" fill="white"/>',
        
        # Title
        f'<text x="{width/2}" y="30" text-anchor="middle" font-size="20" font-weight="bold">{title}</text>',
        f'<text x="{width/2}" y="55" text-anchor="middle" font-size="14">{vertex_count} vertices, {face_count} faces</text>',
        
        # Grid
        '<g opacity="0.2">',
    ]
    
    # Add grid lines
    for x in range(int(min_x), int(max_x) + 1):
        sx = (x - min_x) * 100 + margin
        svg.append(f'<line x1="{sx}" y1="{margin + 80}" x2="{sx}" y2="{height - margin}" stroke="gray" stroke-width="0.5"/>')
    
    for y in range(int(min_y), int(max_y) + 1):
        sy = (y - min_y) * 100 + margin + 80
        svg.append(f'<line x1="{margin}" y1="{sy}" x2="{width - margin}" y2="{sy}" stroke="gray" stroke-width="0.5"/>')
    
    svg.append('</g>')
    
    # Draw faces
    for i, face_2d in enumerate(unfolded_faces):
        color = colors[i % len(colors)]
        
        # Scale and translate
        points = []
        for pt in face_2d:
            x = (pt[0] - min_x) * 100 + margin
            y = (pt[1] - min_y) * 100 + margin + 80
            points.append(f"{x:.2f},{y:.2f}")
        
        points_str = " ".join(points)
        
        # Face polygon
        svg.append(f'<polygon points="{points_str}" fill="{color}" stroke="black" stroke-width="2" opacity="0.7"/>')
        
        # Face number
        center_x = (face_2d[:, 0].mean() - min_x) * 100 + margin
        center_y = (face_2d[:, 1].mean() - min_y) * 100 + margin + 80
        svg.append(f'<text x="{center_x:.2f}" y="{center_y:.2f}" text-anchor="middle" font-size="10" font-weight="bold">{i+1}</text>')
    
    # Legend
    svg.extend([
        f'<text x="{margin}" y="{height - 20}" font-size="10" fill="gray">',
        'Note: Simple grid layout for visualization. Rust unfolder will implement spiral unfolding.',
        '</text>',
        '</svg>'
    ])
    
    # Write file
    with open(output_file, 'w') as f:
        f.write('\n'.join(svg))


def visualize_unfold(obj_file, output_file):
    """Create SVG visualization of unfolded polyhedron"""
    print(f"Processing: {obj_file}")
    
    # Load mesh
    vertices, faces = load_obj(obj_file)
    
    # Unfold
    unfolded = unfold_simple(vertices, faces)
    
    # Create SVG
    polyhedron_name = Path(obj_file).stem.replace('_', ' ').title()
    create_svg(unfolded, output_file, 
              f'Unfolded {polyhedron_name}',
              len(vertices), len(faces))
    
    print(f"  ✓ Saved: {output_file}")
    print(f"    {len(vertices)} vertices, {len(faces)} faces")


def main(argv=None, prog=None):
    """Generate SVG visualizations for all Platonic solids"""
    parser = argparse.ArgumentParser(prog=prog, description="Draw each .obj file's faces as an SVG net")
    parser.add_argument('-i', '--input-dir', default='polyhedra_output', help='folder of .obj files to read (default: polyhedra_output)')
    parser.add_argument('-o', '--output-dir', default='unfold_visualizations', help='folder to write into (default: unfold_visualizations)')
    args = parser.parse_args(argv)
    print("Geodesic Unfold Visualizer (SVG)")
    print("=" * 60)
    print()
    
    # Create output directory
    output_dir = Path(args.output_dir)
    
    # Find all OBJ files
    obj_files = list(Path(args.input_dir).glob('*.obj'))
    
    if not obj_files:
        print(f"No OBJ files found in {args.input_dir}/")
        print("Run: python3 -m domez polyhedra --type all")
        return
    
    output_dir.mkdir(parents=True, exist_ok=True)
    print(f"Found {len(obj_files)} polyhedra to visualize")
    print()
    
    # Process each file
    for obj_file in sorted(obj_files):
        output_file = output_dir / f"{obj_file.stem}_unfolded.svg"
        try:
            visualize_unfold(obj_file, output_file)
        except Exception as e:
            print(f"  ✗ Error: {e}")
            import traceback
            traceback.print_exc()
        print()
    
    print("=" * 60)
    print(f"SVG visualizations saved to: {output_dir}/")
    print()
    print("Open SVG files in your browser to view.")
    print("Note: This is a simple grid layout for visualization.")
    print("The Rust unfolder will implement proper spiral unfolding.")


if __name__ == '__main__':
    main()
