#!/usr/bin/env python3
"""
Advanced Geodesic Transformations
Generate ellipsoidal, tubular, and custom-shaped geodesic meshes
Perfect for converting complex 3D models into geodesic triangle panels
"""

import math
import numpy as np
from pathlib import Path
from typing import List, Tuple, Dict, Optional
from .dome import Vector3, GeodesicDome, parse_partial


def _unit_dome(shape):
    """The unit-sphere dome a shape is mapped from: subdivided, cut, and without hubs below the cut.

    shape carries frequency, base, partial, method, symmetry and flat_base (see GeodesicDome).
    """
    dome = GeodesicDome(frequency=shape.frequency, radius=1.0, base=shape.base,
                        method=shape.method, symmetry=shape.symmetry, flat_base=shape.flat_base)
    dome.generate()
    partial = parse_partial(shape.partial) if isinstance(shape.partial, str) else shape.partial
    if partial < 1.0:
        dome.cut_to_partial(partial).drop_unused_vertices()
    return dome


class EllipsoidalGeodesic:
    """Generate ellipsoidal geodesic meshes with independent axis scaling

    partial, method, symmetry and flat_base work as for GeodesicDome; the cut is made on the
    unit sphere before scaling, as in the web viewer.
    """
    
    def __init__(self, frequency=3, radius_x=1.0, radius_y=1.0, radius_z=1.0, base='icosahedron',
                 partial=1.0, method='flat', symmetry=None, flat_base=False):
        self.frequency = frequency
        self.radius_x = radius_x
        self.radius_y = radius_y
        self.radius_z = radius_z
        self.base = base
        self.partial = partial
        self.method = method
        self.symmetry = symmetry
        self.flat_base = flat_base
        self.dome = None
        self.vertices = []
        self.faces = []
        
    def generate(self):
        """Generate ellipsoidal geodesic by scaling sphere"""
        # Start with spherical geodesic
        dome = self.dome = _unit_dome(self)
        
        # Scale each vertex independently per axis
        self.vertices = []
        for v in dome.vertices:
            # Apply ellipsoidal transformation
            scaled = Vector3(
                v.x * self.radius_x,
                v.y * self.radius_y,
                v.z * self.radius_z
            )
            self.vertices.append(scaled)
        
        self.faces = dome.faces
        return self
    
    def to_obj(self, filename):
        """Export to .obj file"""
        lines = [
            "# Ellipsoidal Geodesic",
            f"# Frequency: {self.frequency}V",
            f"# Radii: X={self.radius_x}m, Y={self.radius_y}m, Z={self.radius_z}m",
            *(self.dome.method_header(always=self.partial < 1) if self.dome else []),
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


class EggGeodesic:
    """Generate egg-shaped geodesic meshes (a Hügelschäffer egg of revolution about Z)

    The egg's profile is r(t) = (B/2) * sqrt((L² - 4t²) / (L² + 8wt + 4w²)) for -L/2 <= t <= L/2,
    where L is the length (along Z), B the breadth and w = asymmetry * L. A unit-sphere point
    (x, y, z) maps to (x*s, y*s, t) with t = z*L/2 and s = (B/2)*L / sqrt(L² + 8wt + 4w²).
    Positive asymmetry puts the pointed end up (+Z), negative puts it down, 0 gives an
    ellipsoid; |asymmetry| must stay below 0.5.

    partial, method, symmetry and flat_base work as for GeodesicDome; the cut is made on the
    unit sphere before the egg mapping, as in the web viewer.
    """
    
    def __init__(self, frequency=3, length=6.0, breadth=4.4, asymmetry=0.08, base='icosahedron',
                 partial=1.0, method='flat', symmetry=None, flat_base=False):
        if length <= 0 or breadth <= 0:
            raise ValueError("length and breadth must be positive")
        if abs(asymmetry) >= 0.5:
            raise ValueError("asymmetry must be between -0.5 and 0.5")
        self.frequency = frequency
        self.length = length
        self.breadth = breadth
        self.asymmetry = asymmetry
        self.base = base
        self.partial = partial
        self.method = method
        self.symmetry = symmetry
        self.flat_base = flat_base
        self.dome = None
        self.vertices = []
        self.faces = []
    
    def generate(self):
        """Generate the egg by mapping a unit-sphere geodesic onto it"""
        dome = self.dome = _unit_dome(self)
        L, B = self.length, self.breadth
        w = self.asymmetry * L
        self.vertices = []
        for v in dome.vertices:
            t = v.z * L / 2
            s = (B / 2) * L / math.sqrt(L * L + 8 * w * t + 4 * w * w)
            self.vertices.append(Vector3(v.x * s, v.y * s, t))
        self.faces = dome.faces
        return self
    
    def to_obj(self, filename):
        """Export to .obj file"""
        end = 'up' if self.asymmetry > 0 else 'down' if self.asymmetry < 0 else 'none'
        lines = [
            "# Egg Geodesic (Hügelschäffer egg)",
            f"# Frequency: {self.frequency}V",
            f"# Length: {self.length}m, Breadth: {self.breadth}m, Asymmetry: {self.asymmetry} (pointed end {end})",
            f"# Base: {self.base}",
            *(self.dome.method_header(always=True) if self.dome else []),
            f"# Vertices: {len(self.vertices)}",
            f"# Faces: {len(self.faces)}",
            "",
        ]
        
        for v in self.vertices:
            lines.append(f"v {v.x:.6f} {v.y:.6f} {v.z:.6f}")
        
        lines.append("")
        
        for face in self.faces:
            lines.append(f"f {' '.join(map(str, face))}")
        
        Path(filename).write_text('\n'.join(lines), encoding='utf-8')
        print(f"✓ Saved: {filename}")
        print(f"  Vertices: {len(self.vertices)}, Faces: {len(self.faces)}")


class TubularGeodesic:
    """Generate tubular/cylindrical geodesic meshes"""
    
    def __init__(self, frequency=3, radius=1.0, length=5.0, caps=True):
        self.frequency = frequency
        self.radius = radius
        self.length = length
        self.caps = caps
        self.vertices = []
        self.faces = []
        
    def generate(self):
        """Generate tubular geodesic mesh"""
        # Generate cylindrical surface with geodesic-like triangulation
        segments_circumference = self.frequency * 10  # Triangles around
        segments_length = int(self.length / self.radius * self.frequency * 5)  # Triangles along
        
        vertices = []
        
        # Generate vertices
        for i in range(segments_length + 1):
            z = (i / segments_length) * self.length - self.length / 2
            for j in range(segments_circumference):
                angle = (j / segments_circumference) * 2 * np.pi
                x = self.radius * np.cos(angle)
                y = self.radius * np.sin(angle)
                vertices.append(Vector3(x, y, z))
        
        # Generate faces for cylinder body
        faces = []
        for i in range(segments_length):
            for j in range(segments_circumference):
                # Current ring
                v1 = i * segments_circumference + j
                v2 = i * segments_circumference + (j + 1) % segments_circumference
                # Next ring
                v3 = (i + 1) * segments_circumference + j
                v4 = (i + 1) * segments_circumference + (j + 1) % segments_circumference
                
                # Two triangles per quad
                faces.append([v1 + 1, v2 + 1, v3 + 1])  # OBJ is 1-indexed
                faces.append([v2 + 1, v4 + 1, v3 + 1])
        
        # Add caps if requested
        if self.caps:
            # Bottom cap (z = -length/2)
            center_bottom = len(vertices)
            vertices.append(Vector3(0, 0, -self.length / 2))
            for j in range(segments_circumference):
                v1 = j
                v2 = (j + 1) % segments_circumference
                faces.append([center_bottom + 1, v2 + 1, v1 + 1])
            
            # Top cap (z = length/2)
            center_top = len(vertices)
            vertices.append(Vector3(0, 0, self.length / 2))
            base_top = segments_length * segments_circumference
            for j in range(segments_circumference):
                v1 = base_top + j
                v2 = base_top + (j + 1) % segments_circumference
                faces.append([center_top + 1, v1 + 1, v2 + 1])
        
        self.vertices = vertices
        self.faces = faces
        return self
    
    def to_obj(self, filename):
        """Export to .obj file"""
        lines = [
            "# Tubular Geodesic",
            f"# Frequency: {self.frequency}V",
            f"# Radius: {self.radius}m, Length: {self.length}m",
            f"# Caps: {self.caps}",
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


class MeshGeodesifier:
    """Convert arbitrary 3D meshes into geodesic triangle meshes"""
    
    def __init__(self, target_edge_length=0.5):
        self.target_edge_length = target_edge_length
        self.vertices = []
        self.faces = []
        
    def load_obj(self, filename):
        """Load an existing .obj file"""
        vertices = []
        faces = []
        
        with open(filename, 'r') as f:
            for line in f:
                line = line.strip()
                if line.startswith('v '):
                    parts = line.split()
                    vertices.append(Vector3(float(parts[1]), float(parts[2]), float(parts[3])))
                elif line.startswith('f '):
                    parts = line.split()
                    # Handle face indices (remove texture/normal indices if present)
                    face = []
                    for part in parts[1:]:
                        idx = int(part.split('/')[0])
                        face.append(idx)
                    faces.append(face)
        
        self.vertices = vertices
        self.faces = faces
        return self
    
    def remesh_uniform(self):
        """Remesh to create more uniform triangles"""
        # Simple subdivision approach
        new_vertices = list(self.vertices)
        new_faces = []
        edge_midpoints = {}
        
        def get_midpoint(v1_idx, v2_idx):
            """Get or create midpoint between two vertices"""
            key = tuple(sorted([v1_idx, v2_idx]))
            if key not in edge_midpoints:
                v1 = self.vertices[v1_idx - 1]  # Convert from 1-indexed
                v2 = self.vertices[v2_idx - 1]
                midpoint = Vector3(
                    (v1.x + v2.x) / 2,
                    (v1.y + v2.y) / 2,
                    (v1.z + v2.z) / 2
                )
                new_vertices.append(midpoint)
                edge_midpoints[key] = len(new_vertices)
            return edge_midpoints[key]
        
        # Subdivide each triangle into 4 smaller triangles
        for face in self.faces:
            if len(face) != 3:
                continue  # Skip non-triangular faces
            
            v1, v2, v3 = face
            
            # Get midpoints
            m12 = get_midpoint(v1, v2)
            m23 = get_midpoint(v2, v3)
            m31 = get_midpoint(v3, v1)
            
            # Create 4 new triangles
            new_faces.append([v1, m12, m31])
            new_faces.append([v2, m23, m12])
            new_faces.append([v3, m31, m23])
            new_faces.append([m12, m23, m31])
        
        self.vertices = new_vertices
        self.faces = new_faces
        return self
    
    def project_to_surface(self, surface_func):
        """Project vertices onto a custom surface defined by a function"""
        for i, v in enumerate(self.vertices):
            # Apply custom surface projection
            new_pos = surface_func(v)
            self.vertices[i] = new_pos
        return self
    
    def to_obj(self, filename):
        """Export to .obj file"""
        lines = [
            "# Geodesified Mesh",
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


class SpacecraftGeodesifier:
    """Specialized geodesifier for spacecraft/complex shapes like MoonPies"""
    
    def __init__(self, frequency=3):
        self.frequency = frequency
        
    def create_fuselage(self, length=10.0, nose_radius=1.0, body_radius=2.0, tail_radius=1.5):
        """Create geodesic fuselage with varying radius"""
        segments = self.frequency * 20
        vertices = []
        faces = []
        
        # Define radius profile along length
        def radius_at_position(t):
            """Radius as function of position (0 to 1 along length)"""
            if t < 0.2:  # Nose cone
                return nose_radius + (body_radius - nose_radius) * (t / 0.2)
            elif t < 0.8:  # Main body
                return body_radius
            else:  # Tail cone
                return body_radius - (body_radius - tail_radius) * ((t - 0.8) / 0.2)
        
        # Generate vertices
        circumference_segments = self.frequency * 12
        for i in range(segments + 1):
            t = i / segments
            z = t * length - length / 2
            r = radius_at_position(t)
            
            for j in range(circumference_segments):
                angle = (j / circumference_segments) * 2 * np.pi
                x = r * np.cos(angle)
                y = r * np.sin(angle)
                vertices.append(Vector3(x, y, z))
        
        # Generate faces
        for i in range(segments):
            for j in range(circumference_segments):
                v1 = i * circumference_segments + j
                v2 = i * circumference_segments + (j + 1) % circumference_segments
                v3 = (i + 1) * circumference_segments + j
                v4 = (i + 1) * circumference_segments + (j + 1) % circumference_segments
                
                faces.append([v1 + 1, v2 + 1, v3 + 1])
                faces.append([v2 + 1, v4 + 1, v3 + 1])
        
        return vertices, faces
    
    def add_solar_panel(self, vertices, faces, position, width=3.0, height=1.0, thickness=0.1):
        """Add geodesic solar panel"""
        # Create rectangular panel with geodesic triangulation
        base_idx = len(vertices)
        
        # Panel vertices (simple rectangular panel)
        panel_verts = [
            Vector3(position[0] - width/2, position[1] - thickness/2, position[2] - height/2),
            Vector3(position[0] + width/2, position[1] - thickness/2, position[2] - height/2),
            Vector3(position[0] + width/2, position[1] - thickness/2, position[2] + height/2),
            Vector3(position[0] - width/2, position[1] - thickness/2, position[2] + height/2),
            Vector3(position[0] - width/2, position[1] + thickness/2, position[2] - height/2),
            Vector3(position[0] + width/2, position[1] + thickness/2, position[2] - height/2),
            Vector3(position[0] + width/2, position[1] + thickness/2, position[2] + height/2),
            Vector3(position[0] - width/2, position[1] + thickness/2, position[2] + height/2),
        ]
        
        vertices.extend(panel_verts)
        
        # Panel faces
        panel_faces = [
            # Bottom
            [base_idx + 1, base_idx + 2, base_idx + 3],
            [base_idx + 1, base_idx + 3, base_idx + 4],
            # Top
            [base_idx + 5, base_idx + 7, base_idx + 6],
            [base_idx + 5, base_idx + 8, base_idx + 7],
            # Sides
            [base_idx + 1, base_idx + 5, base_idx + 2],
            [base_idx + 2, base_idx + 5, base_idx + 6],
            [base_idx + 2, base_idx + 6, base_idx + 3],
            [base_idx + 3, base_idx + 6, base_idx + 7],
            [base_idx + 3, base_idx + 7, base_idx + 4],
            [base_idx + 4, base_idx + 7, base_idx + 8],
            [base_idx + 4, base_idx + 8, base_idx + 1],
            [base_idx + 1, base_idx + 8, base_idx + 5],
        ]
        
        faces.extend(panel_faces)
        
        return vertices, faces


def main(argv=None, prog=None):
    """Generate example advanced geodesics"""
    import argparse
    
    parser = argparse.ArgumentParser(prog=prog, description='Generate advanced geodesic shapes')
    parser.add_argument('--type', choices=['ellipsoid', 'egg', 'tube', 'spacecraft', 'all'], 
                        default='all', help='Shape type to generate')
    parser.add_argument('-f', '--frequency', type=int, default=3,
                        help='Subdivision frequency (default: 3)')
    parser.add_argument('-o', '--output-dir', default='advanced_output',
                        help='Output directory')
    
    args = parser.parse_args(argv)
    
    print("Advanced Geodesic Generator")
    print("=" * 60)
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(exist_ok=True)
    
    if args.type in ['ellipsoid', 'all']:
        print("\nGenerating ellipsoids...")
        
        # Sphere (baseline)
        ellipsoid = EllipsoidalGeodesic(args.frequency, 2.0, 2.0, 2.0)
        ellipsoid.generate()
        ellipsoid.to_obj(output_dir / "sphere.obj")
        
        # Oblate ellipsoid (flattened)
        ellipsoid = EllipsoidalGeodesic(args.frequency, 3.0, 3.0, 1.5)
        ellipsoid.generate()
        ellipsoid.to_obj(output_dir / "ellipsoid_oblate.obj")
        
        # Prolate ellipsoid (elongated)
        ellipsoid = EllipsoidalGeodesic(args.frequency, 1.5, 1.5, 4.0)
        ellipsoid.generate()
        ellipsoid.to_obj(output_dir / "ellipsoid_prolate.obj")
        
        # Tri-axial ellipsoid
        ellipsoid = EllipsoidalGeodesic(args.frequency, 2.0, 3.0, 4.0)
        ellipsoid.generate()
        ellipsoid.to_obj(output_dir / "ellipsoid_triaxial.obj")
    
    if args.type in ['egg', 'all']:
        print("\nGenerating eggs...")
        
        # Full egg, pointed end up
        egg = EggGeodesic(args.frequency, length=6.0, breadth=4.4, asymmetry=0.08)
        egg.generate()
        egg.to_obj(output_dir / "egg.obj")
        
        # Egg dome: Acidome Chords, 5/8 of the egg, standing on a flat base
        egg = EggGeodesic(args.frequency, length=6.0, breadth=4.4, asymmetry=0.08,
                          partial=5/8, method='chords', flat_base=True)
        egg.generate()
        egg.to_obj(output_dir / "egg_dome.obj")
    
    if args.type in ['tube', 'all']:
        print("\nGenerating tubes...")
        
        # Short cylinder
        tube = TubularGeodesic(args.frequency, radius=1.0, length=3.0, caps=True)
        tube.generate()
        tube.to_obj(output_dir / "tube_short.obj")
        
        # Long tube
        tube = TubularGeodesic(args.frequency, radius=0.5, length=8.0, caps=True)
        tube.generate()
        tube.to_obj(output_dir / "tube_long.obj")
        
        # Pipe (no caps)
        tube = TubularGeodesic(args.frequency, radius=1.5, length=5.0, caps=False)
        tube.generate()
        tube.to_obj(output_dir / "pipe.obj")
    
    if args.type in ['spacecraft', 'all']:
        print("\nGenerating spacecraft fuselage...")
        
        spacecraft = SpacecraftGeodesifier(frequency=args.frequency)
        vertices, faces = spacecraft.create_fuselage(
            length=15.0,
            nose_radius=0.5,
            body_radius=2.0,
            tail_radius=1.0
        )
        
        # Add solar panels
        vertices, faces = spacecraft.add_solar_panel(
            vertices, faces,
            position=[0, 2.5, 0],
            width=4.0, height=6.0, thickness=0.1
        )
        
        # Save
        lines = [
            "# Spacecraft Fuselage",
            f"# Frequency: {args.frequency}V",
            f"# Vertices: {len(vertices)}",
            f"# Faces: {len(faces)}",
            "",
        ]
        
        for v in vertices:
            lines.append(f"v {v.x:.6f} {v.y:.6f} {v.z:.6f}")
        
        lines.append("")
        
        for face in faces:
            lines.append(f"f {' '.join(map(str, face))}")
        
        output_file = output_dir / "spacecraft_fuselage.obj"
        output_file.write_text('\n'.join(lines))
        print(f"✓ Saved: {output_file}")
        print(f"  Vertices: {len(vertices)}, Faces: {len(faces)}")
    
    print("\n" + "=" * 60)
    print(f"\nAdvanced geodesics saved to: {output_dir}/")
    print("\nGenerated shapes:")
    print("  • Ellipsoids - Oblate, prolate, and tri-axial")
    print("  • Eggs - Hügelschäffer egg, full and as a flat-based dome")
    print("  • Tubes - Cylindrical geodesic meshes")
    print("  • Spacecraft - Fuselage with solar panels")


if __name__ == '__main__':
    main()
