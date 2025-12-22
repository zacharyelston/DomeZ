#!/usr/bin/env python3
"""
Polyhedra Generator - Generate Platonic solids and other polyhedra
Extension of the geodesic dome generator for all regular polyhedra
"""

import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict
from dome_generator import Vector3, GeodesicDome


class PolyhedraGenerator:
    """Generate various polyhedra with optional subdivision"""
    
    def __init__(self, polyhedron_type='icosahedron', frequency=1, radius=1.0):
        self.polyhedron_type = polyhedron_type
        self.frequency = frequency
        self.radius = radius
        self.vertices = []
        self.faces = []
        
    def generate_tetrahedron(self):
        """Generate regular tetrahedron (4 faces, 4 vertices)"""
        # Vertices of a regular tetrahedron
        a = 1.0 / np.sqrt(3)
        vertices = [
            Vector3( a,  a,  a),
            Vector3( a, -a, -a),
            Vector3(-a,  a, -a),
            Vector3(-a, -a,  a),
        ]
        
        # Normalize to unit sphere
        vertices = [v.normalize() for v in vertices]
        
        # 4 triangular faces
        faces = [
            (0, 2, 1),
            (0, 1, 3),
            (0, 3, 2),
            (1, 2, 3),
        ]
        
        return vertices, faces
    
    def generate_cube(self):
        """Generate cube (6 faces, 8 vertices)"""
        # Vertices of a cube
        vertices = [
            Vector3(-1, -1, -1), Vector3( 1, -1, -1),
            Vector3( 1,  1, -1), Vector3(-1,  1, -1),
            Vector3(-1, -1,  1), Vector3( 1, -1,  1),
            Vector3( 1,  1,  1), Vector3(-1,  1,  1),
        ]
        
        # Normalize to unit sphere
        vertices = [v.normalize() for v in vertices]
        
        # 6 square faces (split into triangles)
        faces = [
            # Bottom
            (0, 1, 2), (0, 2, 3),
            # Top
            (4, 6, 5), (4, 7, 6),
            # Front
            (0, 5, 1), (0, 4, 5),
            # Back
            (2, 7, 3), (2, 6, 7),
            # Left
            (0, 3, 7), (0, 7, 4),
            # Right
            (1, 5, 6), (1, 6, 2),
        ]
        
        return vertices, faces
    
    def generate_octahedron(self):
        """Generate regular octahedron (8 faces, 6 vertices)"""
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
    
    def generate_dodecahedron(self):
        """Generate regular dodecahedron (12 faces, 20 vertices)"""
        phi = (1 + np.sqrt(5)) / 2  # Golden ratio
        
        # 20 vertices of dodecahedron
        vertices = [
            # Cube vertices scaled by phi
            Vector3( 1,  1,  1), Vector3( 1,  1, -1),
            Vector3( 1, -1,  1), Vector3( 1, -1, -1),
            Vector3(-1,  1,  1), Vector3(-1,  1, -1),
            Vector3(-1, -1,  1), Vector3(-1, -1, -1),
            # Rectangle vertices
            Vector3(0,  phi,  1/phi), Vector3(0,  phi, -1/phi),
            Vector3(0, -phi,  1/phi), Vector3(0, -phi, -1/phi),
            Vector3( 1/phi, 0,  phi), Vector3( 1/phi, 0, -phi),
            Vector3(-1/phi, 0,  phi), Vector3(-1/phi, 0, -phi),
            Vector3( phi,  1/phi, 0), Vector3( phi, -1/phi, 0),
            Vector3(-phi,  1/phi, 0), Vector3(-phi, -1/phi, 0),
        ]
        
        # Normalize to unit sphere
        vertices = [v.normalize() for v in vertices]
        
        # 12 pentagonal faces (split into triangles from center)
        faces = [
            # Each pentagon split into 3 triangles
            (0, 8, 9), (0, 9, 1), (0, 1, 16),
            (0, 16, 17), (0, 17, 2), (0, 2, 12),
            (0, 12, 8),
            (8, 12, 4), (8, 4, 14), (8, 14, 9),
            (9, 14, 5), (9, 5, 15), (9, 15, 1),
            (1, 15, 13), (1, 13, 3), (1, 3, 16),
            (16, 3, 17), (16, 17, 2),
            (2, 17, 10), (2, 10, 6), (2, 6, 12),
            (12, 6, 14), (12, 14, 4),
            (4, 14, 18), (4, 18, 19), (4, 19, 6),
            (6, 19, 7), (6, 7, 10),
            (10, 7, 11), (10, 11, 3), (10, 3, 17),
            (3, 11, 13),
            (13, 11, 7), (13, 7, 19), (13, 19, 15),
            (15, 19, 18), (15, 18, 5),
            (5, 18, 14),
        ]
        
        return vertices, faces
    
    def generate_icosahedron(self):
        """Generate regular icosahedron (20 faces, 12 vertices)"""
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
        
        # 20 triangular faces
        faces = [
            (0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11),
            (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
            (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9),
            (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1),
        ]
        
        return vertices, faces
    
    def generate_truncated_icosahedron(self):
        """Generate truncated icosahedron (soccer ball) (32 faces, 60 vertices)"""
        # This is the classic soccer ball shape
        # Start with icosahedron and truncate vertices
        phi = (1 + np.sqrt(5)) / 2
        
        # Truncated icosahedron vertices (60 total)
        # This is complex, so we'll use a simplified approach
        # Generate from icosahedron by cutting corners
        base_verts, _ = self.generate_icosahedron()
        
        vertices = []
        faces = []
        
        # For simplicity, return icosahedron
        # Full implementation would require edge truncation
        return base_verts, [(0, 1, 2)]  # Placeholder
    
    def generate(self):
        """Generate the selected polyhedron"""
        # Get base polyhedron
        generators = {
            'tetrahedron': self.generate_tetrahedron,
            'cube': self.generate_cube,
            'octahedron': self.generate_octahedron,
            'dodecahedron': self.generate_dodecahedron,
            'icosahedron': self.generate_icosahedron,
        }
        
        if self.polyhedron_type not in generators:
            raise ValueError(f"Unknown polyhedron type: {self.polyhedron_type}")
        
        base_verts, base_faces = generators[self.polyhedron_type]()
        
        # Scale to radius
        base_verts = [v * self.radius for v in base_verts]
        
        # If frequency > 1, subdivide
        if self.frequency > 1:
            all_faces = []
            for face_indices in base_faces:
                v1 = base_verts[face_indices[0]]
                v2 = base_verts[face_indices[1]]
                v3 = base_verts[face_indices[2]]
                
                subdivided = self._subdivide_face(v1, v2, v3, self.frequency)
                all_faces.extend(subdivided)
            
            # Collect unique vertices
            vertex_map = {}
            unique_verts = []
            indexed_faces = []
            
            for face in all_faces:
                face_indices = []
                for v in face:
                    key = tuple(round(x, 6) for x in v.to_tuple())
                    if key not in vertex_map:
                        vertex_map[key] = len(unique_verts)
                        unique_verts.append(v)
                    face_indices.append(vertex_map[key] + 1)  # OBJ is 1-indexed
                indexed_faces.append(face_indices)
            
            self.vertices = unique_verts
            self.faces = indexed_faces
        else:
            # No subdivision, use base polyhedron
            self.vertices = base_verts
            self.faces = [[i + 1 for i in face] for face in base_faces]
        
        return self
    
    def _subdivide_face(self, v1, v2, v3, freq):
        """Subdivide a triangular face (same as GeodesicDome)"""
        new_faces = []
        
        points = {}
        for i in range(freq + 1):
            for j in range(freq + 1 - i):
                k = freq - i - j
                u = i / freq
                v = j / freq
                w = k / freq
                
                p = v1 * w + v2 * u + v3 * v
                p = p.normalize() * self.radius
                points[(i, j)] = p
        
        for i in range(freq):
            for j in range(freq - i):
                p1 = points[(i, j)]
                p2 = points[(i + 1, j)]
                p3 = points[(i, j + 1)]
                new_faces.append((p1, p2, p3))
                
                if j < freq - i - 1:
                    p1 = points[(i + 1, j)]
                    p2 = points[(i + 1, j + 1)]
                    p3 = points[(i, j + 1)]
                    new_faces.append((p1, p2, p3))
        
        return new_faces
    
    def to_obj(self, filename):
        """Export to Wavefront .obj file"""
        lines = [
            f"# {self.polyhedron_type.capitalize()}",
            f"# Frequency: {self.frequency}V" if self.frequency > 1 else "# Base polyhedron",
            f"# Radius: {self.radius}m",
            f"# Vertices: {len(self.vertices)}",
            f"# Faces: {len(self.faces)}",
            "",
        ]
        
        for v in self.vertices:
            lines.append(f"v {v.x:.6f} {v.y:.6f} {v.z:.6f}")
        
        lines.append("")
        
        for face in self.faces:
            lines.append(f"f {' '.join(map(str, face))}")
        
        Path(filename).write_text('\n'.join(lines))
        print(f"✓ Saved: {filename}")
        print(f"  Vertices: {len(self.vertices)}, Faces: {len(self.faces)}")


def main():
    """Generate example polyhedra"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Generate Platonic solids and other polyhedra')
    parser.add_argument('-t', '--type', 
                        choices=['tetrahedron', 'cube', 'octahedron', 'dodecahedron', 'icosahedron', 'all'],
                        default='all',
                        help='Polyhedron type (default: all)')
    parser.add_argument('-f', '--frequency', type=int, default=1,
                        help='Subdivision frequency (1 = base shape, default: 1)')
    parser.add_argument('-r', '--radius', type=float, default=1.0,
                        help='Radius (default: 1.0)')
    parser.add_argument('-o', '--output-dir', default='polyhedra_output',
                        help='Output directory (default: polyhedra_output)')
    
    args = parser.parse_args()
    
    print("Polyhedra Generator")
    print("=" * 60)
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(exist_ok=True)
    
    types = ['tetrahedron', 'cube', 'octahedron', 'dodecahedron', 'icosahedron'] \
            if args.type == 'all' else [args.type]
    
    for poly_type in types:
        print(f"\nGenerating: {poly_type}")
        poly = PolyhedraGenerator(poly_type, frequency=args.frequency, radius=args.radius)
        poly.generate()
        
        freq_suffix = f"_{args.frequency}v" if args.frequency > 1 else ""
        filename = output_dir / f"{poly_type}{freq_suffix}.obj"
        poly.to_obj(filename)
    
    print("\n" + "=" * 60)
    print(f"\nPolyhedra saved to: {output_dir}/")
    print("\nPlatonic Solids Generated:")
    print("  • Tetrahedron - 4 triangular faces")
    print("  • Cube - 6 square faces (as triangles)")
    print("  • Octahedron - 8 triangular faces")
    print("  • Dodecahedron - 12 pentagonal faces (as triangles)")
    print("  • Icosahedron - 20 triangular faces")


if __name__ == '__main__':
    main()
