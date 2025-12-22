#!/usr/bin/env python3
"""
Smart Unfolder - Analyzes mesh topology and selects appropriate unfolding strategy
"""

import numpy as np
from pathlib import Path
from steepest_edge_unfold import steepest_edge_unfold, load_obj, build_adjacency, calculate_dihedral_angle


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
    
    def _are_coplanar(self, normal1, normal2, threshold=0.01):
        """Check if two normals are parallel (coplanar faces)"""
        dot = np.dot(normal1, normal2)
        return abs(abs(dot) - 1.0) < threshold
    
    def _share_edge(self, face1, face2):
        """Check if two faces share an edge"""
        shared = set(face1) & set(face2)
        return len(shared) >= 2
    
    def _find_coplanar_pairs(self):
        """Find pairs of triangular faces that are coplanar and share an edge"""
        coplanar_pairs = []
        
        # Only check triangular faces
        triangular_faces = [(i, f) for i, f in enumerate(self.faces) if len(f) == 3]
        
        if len(triangular_faces) < 2:
            return coplanar_pairs
        
        # Calculate normals
        normals = {}
        for i, face in triangular_faces:
            normals[i] = self._calculate_face_normal(face)
        
        # Find coplanar pairs
        checked = set()
        for i, face1 in triangular_faces:
            for j, face2 in triangular_faces:
                if i >= j or (i, j) in checked:
                    continue
                
                checked.add((i, j))
                
                if self._are_coplanar(normals[i], normals[j]) and \
                   self._share_edge(face1, face2):
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
            # Valid quad - order vertices properly
            shared_list = list(shared)
            unique_i = list(face_i - shared)[0]
            unique_j = list(face_j - shared)[0]
            
            # Build quad in order: unique_i -> shared[0] -> unique_j -> shared[1]
            quad = [unique_i, shared_list[0], unique_j, shared_list[1]]
            new_faces.append(quad)
            merged.add(i)
            merged.add(j)
    
    # Add remaining triangles
    for i, face in enumerate(faces):
        if i not in merged:
            new_faces.append(list(face))
    
    print(f"  Merged {len(merged)} triangles into {len(coplanar_pairs)} quads")
    print(f"  New face count: {len(new_faces)} ({len([f for f in new_faces if len(f)==3])} triangles, {len([f for f in new_faces if len(f)==4])} quads)")
    
    return new_faces


def main():
    """Test smart unfolder on all polyhedra"""
    print("Smart Unfolder - Topology-Aware Unfolding")
    print("="*60)
    
    obj_files = sorted(Path('polyhedra_output').glob('*.obj'))
    
    if not obj_files:
        print("No OBJ files found in polyhedra_output/")
        return
    
    results = {}
    for obj_file in obj_files:
        try:
            unfolded, analysis = smart_unfold(obj_file, verbose=True)
            results[obj_file.stem] = {
                'placed': len(unfolded),
                'total': analysis['face_count'],
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
