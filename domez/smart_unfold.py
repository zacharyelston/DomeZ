#!/usr/bin/env python3
"""
Smart Unfolder - Analyzes mesh topology and selects appropriate unfolding strategy
"""

import argparse
import numpy as np
from pathlib import Path
from .unfold import steepest_edge_unfold, load_obj, build_adjacency, calculate_dihedral_angle


class MeshAnalyzer:
    """Analyze mesh topology to determine best unfolding strategy"""
    
    def __init__(self, vertices, faces):
        self.vertices = vertices
        self.faces = faces
        self.analysis = {}
        
    def analyze(self):
        """Perform comprehensive mesh analysis"""
        self.analysis = {
            'vertex_count': len(self.vertices),
            'face_count': len(self.faces),
            'face_types': self._analyze_face_types(),
            'coplanar_pairs': self._find_coplanar_pairs(),
            'topology_type': None,
            'recommended_strategy': None
        }
        
        # Determine topology type
        self.analysis['topology_type'] = self._determine_topology()
        
        # Recommend strategy
        self.analysis['recommended_strategy'] = self._recommend_strategy()
        
        return self.analysis
    
    def _analyze_face_types(self):
        """Count face types by number of vertices"""
        face_types = {}
        for face in self.faces:
            n = len(face)
            face_types[n] = face_types.get(n, 0) + 1
        return face_types
    
    def _calculate_face_normal(self, face):
        """Calculate face normal"""
        if len(face) < 3:
            return np.array([0, 0, 0])
        
        face_verts = self.vertices[face]
        v1, v2, v3 = face_verts[:3]
        edge1 = v2 - v1
        edge2 = v3 - v1
        normal = np.cross(edge1, edge2)
        norm = np.linalg.norm(normal)
        if norm > 1e-10:
            return normal / norm
        return np.array([0, 0, 0])
    
    def _are_coplanar(self, normal1, normal2, max_angle_degrees=0.1):
        """
        Check if two normals are parallel (coplanar faces). The tolerance
        only absorbs rounding in the OBJ coordinates: neighbouring faces of
        even a finely subdivided geodesic sphere are a degree or more apart,
        and must not be merged.
        """
        dot = np.clip(abs(np.dot(normal1, normal2)), 0.0, 1.0)
        return np.degrees(np.arccos(dot)) < max_angle_degrees
    
    def _find_coplanar_pairs(self):
        """Find pairs of triangular faces that are coplanar and share an edge"""
        coplanar_pairs = []
        
        # Calculate normals of the triangular faces
        normals = {}
        for i, face in enumerate(self.faces):
            if len(face) == 3:
                normals[i] = self._calculate_face_normal(face)
        
        # Only faces that share an edge can be merged
        adjacency = build_adjacency(self.vertices, self.faces)
        for i in sorted(normals):
            for j, _ in sorted(adjacency[i]):
                if i < j and j in normals and self._are_coplanar(normals[i], normals[j]):
                    coplanar_pairs.append((i, j))
        
        return coplanar_pairs
    
    def _determine_topology(self):
        """Determine mesh topology type"""
        face_types = self.analysis['face_types']
        coplanar_count = len(self.analysis['coplanar_pairs'])
        
        # All triangles, no coplanar pairs = pure triangular mesh
        if face_types.get(3, 0) == self.analysis['face_count'] and coplanar_count == 0:
            return 'pure_triangular'
        
        # All triangles with many coplanar pairs = triangulated quads/polygons
        if face_types.get(3, 0) == self.analysis['face_count'] and coplanar_count > 0:
            # If roughly half the triangles are in coplanar pairs, likely triangulated quads
            if coplanar_count * 2 >= self.analysis['face_count'] * 0.4:
                return 'triangulated_quads'
            else:
                return 'mixed_triangular'
        
        # Mix of face types
        if len(face_types) > 1:
            return 'mixed_polygons'
        
        # All quads
        if face_types.get(4, 0) == self.analysis['face_count']:
            return 'pure_quads'
        
        return 'unknown'
    
    def _recommend_strategy(self):
        """Recommend unfolding strategy based on topology"""
        topology = self.analysis['topology_type']
        
        strategies = {
            'pure_triangular': {
                'name': 'Steepest Edge (Standard)',
                'description': 'Pure triangular mesh - use standard Steepest Edge algorithm',
                'preprocessing': None
            },
            'triangulated_quads': {
                'name': 'Steepest Edge with Quad Merging',
                'description': 'Triangulated quads detected - merge coplanar pairs before unfolding',
                'preprocessing': 'merge_coplanar_triangles'
            },
            'mixed_triangular': {
                'name': 'Steepest Edge (Standard)',
                'description': 'Mostly triangular with some coplanar faces - standard algorithm should work',
                'preprocessing': None
            },
            'mixed_polygons': {
                'name': 'Steepest Edge with Triangulation',
                'description': 'Mixed polygon types - triangulate all faces first',
                'preprocessing': 'triangulate_all'
            },
            'pure_quads': {
                'name': 'Quad-Aware Unfolding',
                'description': 'Pure quad mesh - use quad-preserving algorithm',
                'preprocessing': 'preserve_quads'
            },
            'unknown': {
                'name': 'Steepest Edge (Fallback)',
                'description': 'Unknown topology - try standard algorithm',
                'preprocessing': None
            }
        }
        
        return strategies.get(topology, strategies['unknown'])


def smart_unfold(obj_file, verbose=True):
    """
    Intelligently unfold a mesh by analyzing topology first
    """
    if verbose:
        print(f"\n{'='*60}")
        print(f"Smart Unfolder: {Path(obj_file).name}")
        print('='*60)
    
    # Load mesh
    vertices, faces = load_obj(obj_file)
    
    # Analyze topology
    analyzer = MeshAnalyzer(vertices, faces)
    analysis = analyzer.analyze()
    
    if verbose:
        print(f"\nMesh Analysis:")
        print(f"  Vertices: {analysis['vertex_count']}")
        print(f"  Faces: {analysis['face_count']}")
        print(f"  Face types: {analysis['face_types']}")
        print(f"  Coplanar pairs: {len(analysis['coplanar_pairs'])}")
        print(f"  Topology: {analysis['topology_type']}")
        print(f"\nRecommended Strategy:")
        print(f"  {analysis['recommended_strategy']['name']}")
        print(f"  {analysis['recommended_strategy']['description']}")
        
        if analysis['recommended_strategy']['preprocessing']:
            print(f"  Preprocessing: {analysis['recommended_strategy']['preprocessing']}")
    
    # Apply preprocessing if needed
    processed_faces = faces
    preprocessing = analysis['recommended_strategy']['preprocessing']
    
    if preprocessing == 'merge_coplanar_triangles':
        if verbose:
            print(f"\nApplying preprocessing: Merging coplanar triangles...")
        processed_faces = merge_coplanar_triangles(vertices, faces, analysis['coplanar_pairs'])
    analysis['unfolded_face_count'] = len(processed_faces)
    
    # Unfold
    if verbose:
        print(f"\nUnfolding...")
    
    unfolded = steepest_edge_unfold(vertices, processed_faces)
    
    if verbose:
        placed = len(unfolded)
        total = len(processed_faces)
        success_rate = (placed / total * 100) if total > 0 else 0
        print(f"\nResult: {placed}/{total} faces placed ({success_rate:.1f}%)")
        
        if success_rate == 100:
            print("✓ Perfect unfolding!")
        elif success_rate >= 90:
            print("✓ Good unfolding (minor disconnections)")
        elif success_rate >= 50:
            print("⚠ Partial unfolding (significant disconnections)")
        else:
            print("✗ Poor unfolding (major issues)")
    
    return unfolded, analysis


def is_strictly_convex(points):
    """True if a planar polygon turns the same way, by a non-zero angle, at every corner"""
    n = len(points)
    turns = [np.cross(points[(k + 1) % n] - points[k], points[(k + 2) % n] - points[(k + 1) % n])
             for k in range(n)]
    return all(turn @ turns[0] > 1e-9 * np.linalg.norm(turn) * np.linalg.norm(turns[0])
               for turn in turns)


def merge_coplanar_triangles(vertices, faces, coplanar_pairs):
    """
    Merge coplanar triangle pairs into quads
    Returns new face list with quads where appropriate
    """
    merged = set()
    new_faces = []
    
    # Process coplanar pairs
    for i, j in coplanar_pairs:
        if i in merged or j in merged:
            continue
        
        # Get shared and unique vertices
        face_i = set(faces[i])
        face_j = set(faces[j])
        shared = face_i & face_j
        all_verts = face_i | face_j
        
        if len(shared) == 2 and len(all_verts) == 4:
            unique_i = (face_i - shared).pop()
            unique_j = (face_j - shared).pop()
            
            # Walk face i from its unshared vertex, detouring through face j's
            # unshared vertex instead of along the shared edge; this keeps
            # face i's winding
            order_i = list(faces[i])
            k = order_i.index(unique_i)
            quad = [unique_i, order_i[(k + 1) % 3], unique_j, order_i[(k + 2) % 3]]
            
            # A non-convex quad would not unfold or cut cleanly
            if not is_strictly_convex(vertices[quad]):
                continue
            
            new_faces.append(quad)
            merged.add(i)
            merged.add(j)
    
    num_quads = len(new_faces)
    
    # Add remaining triangles
    for i, face in enumerate(faces):
        if i not in merged:
            new_faces.append(list(face))
    
    print(f"  Merged {len(merged)} triangles into {num_quads} quads")
    print(f"  New face count: {len(new_faces)} ({len([f for f in new_faces if len(f)==3])} triangles, {len([f for f in new_faces if len(f)==4])} quads)")
    
    return new_faces


def main(argv=None, prog=None):
    """Test smart unfolder on all polyhedra"""
    parser = argparse.ArgumentParser(prog=prog, description="Analyse each .obj file's topology, pick an unfolding strategy and unfold it")
    parser.add_argument('-i', '--input-dir', default='polyhedra_output', help='folder of .obj files to read (default: polyhedra_output)')
    args = parser.parse_args(argv)
    print("Smart Unfolder - Topology-Aware Unfolding")
    print("="*60)
    
    obj_files = sorted(Path(args.input_dir).glob('*.obj'))
    
    if not obj_files:
        print(f"No OBJ files found in {args.input_dir}/")
        return
    
    results = {}
    for obj_file in obj_files:
        try:
            unfolded, analysis = smart_unfold(obj_file, verbose=True)
            results[obj_file.stem] = {
                'placed': len(unfolded),
                'total': analysis['unfolded_face_count'],
                'topology': analysis['topology_type'],
                'strategy': analysis['recommended_strategy']['name']
            }
        except Exception as e:
            print(f"✗ ERROR: {e}")
            import traceback
            traceback.print_exc()
    
    # Summary
    print(f"\n{'='*60}")
    print("Summary")
    print('='*60)
    for name, result in results.items():
        success = result['placed'] / result['total'] * 100
        status = "✓" if success == 100 else "⚠" if success >= 90 else "✗"
        print(f"{status} {name:20s} {result['placed']:3d}/{result['total']:3d} ({success:5.1f}%) - {result['topology']}")


if __name__ == '__main__':
    main()
