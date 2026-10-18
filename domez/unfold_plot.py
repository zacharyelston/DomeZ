#!/usr/bin/env python3
"""
Visualize unfolded Platonic solids as PNG images
Demonstrates the spiral unfolding concept
"""

import argparse
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon
from pathlib import Path

from .unfold import load_obj
from .unfold_svg import unfold_simple


def project_face_2d(vertices, face_indices):
    """Project a 3D face to 2D using simple orthographic projection"""
    face_verts = vertices[face_indices]
    
    # Use first two coordinates (x, y) as 2D projection
    # This is a simple projection - real unfolding would preserve edge lengths
    return face_verts[:, :2]


def visualize_unfold(obj_file, output_file):
    """Create PNG visualization of unfolded polyhedron"""
    print(f"Processing: {obj_file}")
    
    # Load mesh
    vertices, faces = load_obj(obj_file)
    
    # Unfold
    unfolded = unfold_simple(vertices, faces)
    
    # Create figure
    fig, ax = plt.subplots(figsize=(12, 12))
    ax.set_aspect('equal')
    
    # Draw faces
    colors = plt.cm.Set3(np.linspace(0, 1, len(faces)))
    
    for i, face_2d in enumerate(unfolded):
        polygon = Polygon(face_2d, 
                         facecolor=colors[i], 
                         edgecolor='black', 
                         linewidth=2,
                         alpha=0.7)
        ax.add_patch(polygon)
        
        # Add face number
        center = np.mean(face_2d, axis=0)
        ax.text(center[0], center[1], str(i+1), 
               ha='center', va='center', 
               fontsize=8, fontweight='bold')
    
    # Set limits
    all_points = np.vstack(unfolded)
    margin = 0.5
    ax.set_xlim(all_points[:, 0].min() - margin, all_points[:, 0].max() + margin)
    ax.set_ylim(all_points[:, 1].min() - margin, all_points[:, 1].max() + margin)
    
    # Labels
    polyhedron_name = Path(obj_file).stem
    ax.set_title(f'Unfolded {polyhedron_name.replace("_", " ").title()}\n'
                f'{len(vertices)} vertices, {len(faces)} faces',
                fontsize=14, fontweight='bold')
    ax.set_xlabel('X (meters)', fontsize=10)
    ax.set_ylabel('Y (meters)', fontsize=10)
    ax.grid(True, alpha=0.3)
    
    # Save
    plt.tight_layout()
    plt.savefig(output_file, dpi=150, bbox_inches='tight')
    plt.close()
    
    print(f"  ✓ Saved: {output_file}")
    print(f"    {len(vertices)} vertices, {len(faces)} faces")


def main(argv=None, prog=None):
    """Generate PNG visualizations for all Platonic solids"""
    parser = argparse.ArgumentParser(prog=prog, description="Draw each .obj file's faces as a PNG net (needs matplotlib)")
    parser.add_argument('-i', '--input-dir', default='polyhedra_output', help='folder of .obj files to read (default: polyhedra_output)')
    parser.add_argument('-o', '--output-dir', default='unfold_visualizations', help='folder to write into (default: unfold_visualizations)')
    args = parser.parse_args(argv)
    print("Geodesic Unfold Visualizer")
    print("=" * 60)
    print()
    
    # Create output directory
    output_dir = Path(args.output_dir)
    
    # Find all OBJ files in polyhedra_output
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
        output_file = output_dir / f"{obj_file.stem}_unfolded.png"
        try:
            visualize_unfold(obj_file, output_file)
        except Exception as e:
            print(f"  ✗ Error: {e}")
        print()
    
    print("=" * 60)
    print(f"Visualizations saved to: {output_dir}/")
    print()
    print("Note: This is a simple grid layout for visualization.")
    print("The Rust unfolder will implement proper spiral unfolding")
    print("with optimized edge planning for manufacturing.")


if __name__ == '__main__':
    main()
