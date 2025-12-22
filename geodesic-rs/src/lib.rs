//! Geodesic Dome and Polyhedra Generator
//! 
//! High-performance Rust library for generating geodesic domes with multiple output modes:
//! - Base: Vertices only
//! - Framework: Edges/struts
//! - Scheme: Colored face diagram
//! - Cover: Surface panels
//! - Tent: Fabric pattern
//! - Unfolded: Spiral unfolding from center for manufacturing

pub mod geometry;

use nalgebra::{Vector3, Point3};

pub type Vec3 = Vector3<f64>;
pub type Pt3 = Point3<f64>;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct VertexId(pub usize);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct EdgeId(pub usize);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct FaceId(pub usize);

#[derive(Debug, Clone)]
pub struct Vertex {
    pub id: VertexId,
    pub position: Vec3,
}

#[derive(Debug, Clone)]
pub struct Edge {
    pub id: EdgeId,
    pub v1: VertexId,
    pub v2: VertexId,
    pub length: f64,
}

#[derive(Debug, Clone)]
pub struct Face {
    pub id: FaceId,
    pub vertices: Vec<VertexId>,
    pub edges: Vec<EdgeId>,
    pub normal: Vec3,
    pub area: f64,
}

#[derive(Debug, Clone)]
pub struct GeodesicMesh {
    pub vertices: Vec<Vertex>,
    pub edges: Vec<Edge>,
    pub faces: Vec<Face>,
    pub frequency: usize,
    pub radius: f64,
}

impl GeodesicMesh {
    pub fn new(frequency: usize, radius: f64) -> Self {
        Self {
            vertices: Vec::new(),
            edges: Vec::new(),
            faces: Vec::new(),
            frequency,
            radius,
        }
    }
    
    pub fn vertex_count(&self) -> usize {
        self.vertices.len()
    }
    
    pub fn edge_count(&self) -> usize {
        self.edges.len()
    }
    
    pub fn face_count(&self) -> usize {
        self.faces.len()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OutputMode {
    Base,       // Vertices only
    Framework,  // Edges/struts
    Scheme,     // Colored face diagram
    Cover,      // Surface panels
    Tent,       // Fabric pattern
    Unfolded,   // Spiral unfolding
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PolyhedronType {
    Tetrahedron,
    Cube,
    Octahedron,
    Dodecahedron,
    Icosahedron,
    StellaOctangula,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mesh_creation() {
        let mesh = GeodesicMesh::new(3, 1.0);
        assert_eq!(mesh.frequency, 3);
        assert_eq!(mesh.radius, 1.0);
    }
}
