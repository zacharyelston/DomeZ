//! Geometric operations for geodesic generation

use crate::{Vec3, GeodesicMesh, Vertex, Edge, Face, VertexId, EdgeId, FaceId};
use nalgebra::Vector3;
use std::collections::HashMap;

/// Subdivide a triangle into smaller triangles
pub fn subdivide_triangle(
    v1: &Vec3,
    v2: &Vec3,
    v3: &Vec3,
    frequency: usize,
    radius: f64,
) -> Vec<(Vec3, Vec3, Vec3)> {
    let mut triangles = Vec::new();
    let mut points = HashMap::new();

    // Generate grid of points
    for i in 0..=frequency {
        for j in 0..=(frequency - i) {
            let k = frequency - i - j;
            let u = i as f64 / frequency as f64;
            let v = j as f64 / frequency as f64;
            let w = k as f64 / frequency as f64;

            let p = v1 * w + v2 * u + v3 * v;
            let normalized = p.normalize() * radius;
            points.insert((i, j), normalized);
        }
    }

    // Generate triangles
    for i in 0..frequency {
        for j in 0..(frequency - i) {
            let p1 = points[&(i, j)];
            let p2 = points[&(i + 1, j)];
            let p3 = points[&(i, j + 1)];
            triangles.push((p1, p2, p3));

            if j < frequency - i - 1 {
                let p1 = points[&(i + 1, j)];
                let p2 = points[&(i + 1, j + 1)];
                let p3 = points[&(i, j + 1)];
                triangles.push((p1, p2, p3));
            }
        }
    }

    triangles
}

/// Calculate face normal
pub fn face_normal(v1: &Vec3, v2: &Vec3, v3: &Vec3) -> Vec3 {
    let edge1 = v2 - v1;
    let edge2 = v3 - v1;
    edge1.cross(&edge2).normalize()
}

/// Calculate face area
pub fn face_area(v1: &Vec3, v2: &Vec3, v3: &Vec3) -> f64 {
    let edge1 = v2 - v1;
    let edge2 = v3 - v1;
    edge1.cross(&edge2).magnitude() * 0.5
}

/// Calculate dihedral angle between two faces
pub fn dihedral_angle(n1: &Vec3, n2: &Vec3) -> f64 {
    let dot = n1.dot(n2).clamp(-1.0, 1.0);
    dot.acos()
}

/// Build edge connectivity map
pub fn build_edge_map(mesh: &GeodesicMesh) -> HashMap<(VertexId, VertexId), EdgeId> {
    let mut edge_map = HashMap::new();
    
    for edge in &mesh.edges {
        let key1 = (edge.v1, edge.v2);
        let key2 = (edge.v2, edge.v1);
        edge_map.insert(key1, edge.id);
        edge_map.insert(key2, edge.id);
    }
    
    edge_map
}

/// Build face adjacency map
pub fn build_adjacency_map(mesh: &GeodesicMesh) -> HashMap<FaceId, Vec<FaceId>> {
    let mut adjacency = HashMap::new();
    let edge_map = build_edge_map(mesh);
    
    // Map edges to faces
    let mut edge_to_faces: HashMap<EdgeId, Vec<FaceId>> = HashMap::new();
    for face in &mesh.faces {
        for &edge_id in &face.edges {
            edge_to_faces.entry(edge_id).or_insert_with(Vec::new).push(face.id);
        }
    }
    
    // Build adjacency from shared edges
    for face in &mesh.faces {
        let mut neighbors = Vec::new();
        for &edge_id in &face.edges {
            if let Some(faces) = edge_to_faces.get(&edge_id) {
                for &other_face in faces {
                    if other_face != face.id && !neighbors.contains(&other_face) {
                        neighbors.push(other_face);
                    }
                }
            }
        }
        adjacency.insert(face.id, neighbors);
    }
    
    adjacency
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_subdivide_triangle() {
        let v1 = Vector3::new(1.0, 0.0, 0.0);
        let v2 = Vector3::new(0.0, 1.0, 0.0);
        let v3 = Vector3::new(0.0, 0.0, 1.0);
        
        let triangles = subdivide_triangle(&v1, &v2, &v3, 2, 1.0);
        assert_eq!(triangles.len(), 4); // 2^2 = 4 triangles
    }

    #[test]
    fn test_face_normal() {
        let v1 = Vector3::new(0.0, 0.0, 0.0);
        let v2 = Vector3::new(1.0, 0.0, 0.0);
        let v3 = Vector3::new(0.0, 1.0, 0.0);
        
        let normal = face_normal(&v1, &v2, &v3);
        assert!((normal.z - 1.0).abs() < 1e-6);
    }
}
