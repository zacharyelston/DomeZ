#!/usr/bin/env python3
"""
Geodesic Dome Generator - Pure Python Implementation
Generates geodesic dome .obj files using mathematical subdivision
Based on icosahedron/octahedron base polyhedra
"""

import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict
import itertools


class Vector3:
    """3D vector with basic operations"""
    def __init__(self, x, y, z):
        self.x, self.y, self.z = x, y, z
    
    def __add__(self, other):
        return Vector3(self.x + other.x, self.y + other.y, self.z + other.z)
    
    def __sub__(self, other):
        return Vector3(self.x - other.x, self.y - other.y, self.z - other.z)
    
    def __mul__(self, scalar):
        return Vector3(self.x * scalar, self.y * scalar, self.z * scalar)
    
    def __truediv__(self, scalar):
        return Vector3(self.x / scalar, self.y / scalar, self.z / scalar)
    
    def length(self):
        return np.sqrt(self.x**2 + self.y**2 + self.z**2)
    
    def normalize(self):
        l = self.length()
        return Vector3(self.x / l, self.y / l, self.z / l) if l > 0 else self
    
    def to_tuple(self):
        return (self.x, self.y, self.z)
    
    def __repr__(self):
        return f"V({self.x:.3f}, {self.y:.3f}, {self.z:.3f})"


class GeodesicDome:
    """Generate geodesic dome geometry"""
    
    def __init__(self, frequency=3, radius=1.0, base='icosahedron'):
        self.frequency = frequency
        self.radius = radius
        self.base = base
        self.vertices = []
        self.faces = []
        self.edges = []
        
    def generate_icosahedron(self):
        """Generate base icosahedron vertices and faces"""
        phi = (1 + np.sqrt(5)) / 2  # Golden ratio
        
        # 12 vertices of icosahedron
        vertices = [
            Vector3(-1,  phi,  0), Vector3( 1,  phi,  0),
            Vector3(-1, -phi,  0), Vector3( 1, -phi,  0),
            Vector3( 0, -1,  phi), Vector3( 0,  1,  phi),
            Vector3( 0, -1, -phi), Vector3( 0,  1, -phi),
            Vector3( phi,  0, -1), Vector3( phi,  0,  1),
            Vector3(-phi,  0, -1), Vector3(-phi,  0,  1),
        ]
        
        # Normalize to unit sphere
        vertices = [v.normalize() for v in vertices]
        
        # 20 faces of icosahedron
        faces = [
            (0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11),
            (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
            (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9),
            (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1),
        ]
        
        return vertices, faces
    
    def generate_octahedron(self):
        """Generate base octahedron vertices and faces"""
        vertices = [
            Vector3( 1,  0,  0), Vector3(-1,  0,  0),
            Vector3( 0,  1,  0), Vector3( 0, -1,  0),
            Vector3( 0,  0,  1), Vector3( 0,  0, -1),
        ]
        
        faces = [
            (0, 2, 4), (0, 4, 3), (0, 3, 5), (0, 5, 2),
            (1, 4, 2), (1, 3, 4), (1, 5, 3), (1, 2, 5),
        ]
        
        return vertices, faces
    
    def subdivide_face(self, v1, v2, v3, freq):
        """Subdivide a triangular face into smaller triangles"""
        new_faces = []
        
        # Create grid of points on the face
        points = {}
        for i in range(freq + 1):
            for j in range(freq + 1 - i):
                k = freq - i - j
                # Barycentric coordinates
                u = i / freq
                v = j / freq
                w = k / freq
                
                # Interpolate position
                p = v1 * w + v2 * u + v3 * v
                # Project to sphere (for geodesic)
                p = p.normalize() * self.radius
                points[(i, j)] = p
        
        # Create faces from grid
        for i in range(freq):
            for j in range(freq - i):
                # Triangle 1
                p1 = points[(i, j)]
                p2 = points[(i + 1, j)]
                p3 = points[(i, j + 1)]
                new_faces.append((p1, p2, p3))
                
                # Triangle 2 (if not at edge)
                if j < freq - i - 1:
                    p1 = points[(i + 1, j)]
                    p2 = points[(i + 1, j + 1)]
                    p3 = points[(i, j + 1)]
                    new_faces.append((p1, p2, p3))
        
        return new_faces
    
    def generate(self):
        """Generate the geodesic dome"""
        # Get base polyhedron
        if self.base == 'icosahedron':
            base_verts, base_faces = self.generate_icosahedron()
        else:
            base_verts, base_faces = self.generate_octahedron()
        
        # Scale to radius
        base_verts = [v * self.radius for v in base_verts]
        
        # Subdivide each face
        all_faces = []
        for face_indices in base_faces:
            v1 = base_verts[face_indices[0]]
            v2 = base_verts[face_indices[1]]
            v3 = base_verts[face_indices[2]]
            
            subdivided = self.subdivide_face(v1, v2, v3, self.frequency)
            all_faces.extend(subdivided)
        
        # Collect unique vertices
        vertex_map = {}
        unique_verts = []
        indexed_faces = []
        
        for face in all_faces:
            face_indices = []
            for v in face:
                # Round to avoid floating point duplicates
                key = tuple(round(x, 6) for x in v.to_tuple())
                if key not in vertex_map:
                    vertex_map[key] = len(unique_verts)
                    unique_verts.append(v)
                face_indices.append(vertex_map[key] + 1)  # OBJ is 1-indexed
            indexed_faces.append(face_indices)
        
        self.vertices = unique_verts
        self.faces = indexed_faces
        
        return self
    
    def cut_to_partial(self, partial_fraction):
        """Cut dome to partial sphere (e.g., hemisphere = 0.5)"""
        if partial_fraction >= 1.0:
            return self
        
        # Calculate cutting height
        # For hemisphere: cut at z=0
        # For 3/4: cut at z = -radius/2
        cut_height = self.radius * (1 - 2 * partial_fraction)
        
        # Filter faces that are above cut height
        filtered_faces = []
        for face in self.faces:
            # Check if all vertices are above cut
            verts = [self.vertices[i - 1] for i in face]
            if all(v.z >= cut_height for v in verts):
                filtered_faces.append(face)
        
        self.faces = filtered_faces
        return self
    
    def to_obj(self, filename):
        """Export to Wavefront .obj file"""
        lines = [
            "# Geodesic Dome",
            f"# Frequency: {self.frequency}V",
            f"# Radius: {self.radius}m",
            f"# Base: {self.base}",
            f"# Vertices: {len(self.vertices)}",
            f"# Faces: {len(self.faces)}",
            "",
        ]
        
        # Write vertices
        for v in self.vertices:
            lines.append(f"v {v.x:.6f} {v.y:.6f} {v.z:.6f}")
        
        lines.append("")
        
        # Write faces
        for face in self.faces:
            lines.append(f"f {' '.join(map(str, face))}")
        
        # Save to file
        Path(filename).write_text('\n'.join(lines))
        print(f"✓ Saved: {filename}")
        print(f"  Vertices: {len(self.vertices)}, Faces: {len(self.faces)}")


def main():
    """Generate example domes"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Generate geodesic dome .obj files',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --presets                    # Generate all preset domes
  %(prog)s -f 4 -r 10 -p 0.5           # 4V hemisphere, 10m radius
  %(prog)s -f 3 -r 3.5 -p 0.583        # Greenhouse dome (7/12 sphere)
  %(prog)s -f 4 -r 8 -p 1.0 -o dome.obj # Full sphere planetarium
        """
    )
    
    parser.add_argument('-f', '--frequency', type=int, default=3,
                        help='Subdivision frequency (2-6, default: 3)')
    parser.add_argument('-r', '--radius', type=float, default=5.0,
                        help='Dome radius in meters (default: 5.0)')
    parser.add_argument('-p', '--partial', type=float, default=0.5,
                        help='Sphere fraction 0.0-1.0 (default: 0.5 = hemisphere)')
    parser.add_argument('-b', '--base', choices=['icosahedron', 'octahedron'],
                        default='icosahedron',
                        help='Base polyhedron (default: icosahedron)')
    parser.add_argument('-o', '--output', type=str,
                        help='Output filename (default: auto-generated)')
    parser.add_argument('--output-dir', type=str, default='dome_output',
                        help='Output directory (default: dome_output)')
    parser.add_argument('--presets', action='store_true',
                        help='Generate all preset domes')
    
    args = parser.parse_args()
    
    print("Geodesic Dome Generator")
    print("=" * 60)
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(exist_ok=True)
    
    if args.presets:
        # Generate preset configurations
        configs = [
            ("hemisphere_2v", 2, 5.0, 0.5),
            ("hemisphere_3v", 3, 5.0, 0.5),
            ("hemisphere_4v", 4, 5.0, 0.5),
            ("three_quarter_3v", 3, 5.0, 0.75),
            ("full_sphere_3v", 3, 5.0, 1.0),
            ("greenhouse_3v", 3, 3.5, 7/12),
        ]
        
        for name, freq, radius, partial in configs:
            print(f"\nGenerating: {name}")
            dome = GeodesicDome(frequency=freq, radius=radius, base='icosahedron')
            dome.generate()
            dome.cut_to_partial(partial)
            dome.to_obj(output_dir / f"{name}.obj")
    else:
        # Generate custom dome
        if args.output:
            filename = args.output
        else:
            partial_str = f"{args.partial:.2f}".replace('.', '_')
            filename = f"dome_{args.frequency}v_r{args.radius:.1f}_p{partial_str}.obj"
        
        print(f"\nConfiguration:")
        print(f"  Frequency: {args.frequency}V")
        print(f"  Radius: {args.radius}m")
        print(f"  Partial: {args.partial} ({args.partial*100:.0f}% of sphere)")
        print(f"  Base: {args.base}")
        
        dome = GeodesicDome(frequency=args.frequency, radius=args.radius, base=args.base)
        dome.generate()
        dome.cut_to_partial(args.partial)
        dome.to_obj(output_dir / filename)
    
    print("\n" + "=" * 60)
    print(f"\nDomes saved to: {output_dir}/")
    print("\nTo import into Blender:")
    print("  File > Import > Wavefront (.obj)")
    print(f"  Navigate to {output_dir}/")


if __name__ == '__main__':
    main()
