# Unfolding Algorithm Research Findings

## Critical Issue Identified: Edge Sharing vs Vertex Touching

### The Problem

Our current implementation has faces touching only at vertices, not sharing full edges. This creates an invalid net that cannot be folded back into the original polyhedron.

**Invalid (Current):**
```
    △
   / \
  △   △  ← Triangles only touch at single points
```

**Valid (Required):**
```
  △─△─△  ← Triangles share complete edges
```

## Key Research Paper: "Unfolding via Progressive Mesh Approximation" (2024)

**Authors:** Lars Zawallich, Renato Pajarola (University of Zurich)  
**Source:** arXiv:2405.07922v1 [cs.GR] 13 May 2024

### Core Concepts from Paper

#### 1. Edge Unfolding Definition

**Edge unfolding** means cutting along edges of the polyhedron and unfolding such that:
- All faces end up in a single common plane
- **No faces change shape or size** (distortionless operation)
- Faces remain **connected along shared edges**
- The result is **overlap-free**

#### 2. Unfold-Tree Structure

The paper defines unfolding using an **unfold-tree** - a spanning tree over the dual graph where:
- Each node represents a face
- Each edge represents a shared boundary between faces
- Each node holds a **local transformation** rotating the face into the plane of its parent **along their shared edge**

**Critical Quote from Paper:**
> "Each node only needs to hold a local transformation rotating the face it represents into the plane of its parent along their shared edge."

#### 3. The Transformation Process

From the paper's methodology:

1. **Traverse the unfold-tree** (post-order or breadth-first)
2. For each child face:
   - Find the **shared edge** with parent
   - Apply **rotation transformation** around the shared edge
   - **Unfold to 180°** dihedral angle (flat)
   - Result: Child face is **coplanar** with parent, **sharing the complete edge**

#### 4. Key Mathematical Insight

The paper emphasizes that unfolding is **distortionless**:
- Edge lengths must be preserved exactly
- Faces maintain their original shape
- Shared edges must align perfectly (both vertices match)

### What We're Doing Wrong

Our current implementation:

```python
# Current (WRONG):
child_2d_translated = child_2d - child_edge_p1  # Translate to align v1
rotation_angle = angle_parent - angle_child + np.pi  # Rotate + flip
child_2d_rotated = child_2d_translated @ rotation_matrix.T
child_2d_final = child_2d_rotated + edge_2d_p1  # Translate back
```

**Problems:**
1. Only ensures v1 aligns (single point)
2. Doesn't verify v2 aligns
3. Edge lengths may not match due to projection errors
4. No guarantee that the shared edge is actually shared

### Correct Approach from Literature

#### Method 1: Rigid Transformation with Edge Alignment

```python
def align_faces_along_shared_edge(parent_2d, child_2d, shared_edge_indices):
    """
    Align child face to parent by ensuring BOTH vertices of shared edge match
    """
    # Get shared edge in parent (already placed)
    p1_parent = parent_2d[shared_edge_indices[0]]
    p2_parent = parent_2d[shared_edge_indices[1]]
    
    # Get shared edge in child (to be placed)
    p1_child = child_2d[shared_edge_indices[0]]
    p2_child = child_2d[shared_edge_indices[1]]
    
    # Step 1: Translate child so p1 aligns
    translation1 = p1_parent - p1_child
    child_translated = child_2d + translation1
    
    # Step 2: Rotate around p1 to align p2
    # Vector from p1 to p2 in parent
    parent_vec = p2_parent - p1_parent
    # Vector from p1 to p2 in child (after translation)
    child_vec = child_translated[shared_edge_indices[1]] - p1_parent
    
    # Calculate rotation angle
    angle_parent = np.arctan2(parent_vec[1], parent_vec[0])
    angle_child = np.arctan2(child_vec[1], child_vec[0])
    rotation_angle = angle_parent - angle_child
    
    # Rotate child around p1
    child_centered = child_translated - p1_parent
    rotation_matrix = np.array([
        [np.cos(rotation_angle), -np.sin(rotation_angle)],
        [np.sin(rotation_angle), np.cos(rotation_angle)]
    ])
    child_rotated = child_centered @ rotation_matrix.T
    child_aligned = child_rotated + p1_parent
    
    # Step 3: Flip across shared edge (for dihedral angle = 180°)
    # Reflect across the line defined by p1_parent -> p2_parent
    edge_vec = p2_parent - p1_parent
    edge_len = np.linalg.norm(edge_vec)
    edge_unit = edge_vec / edge_len
    
    # For each vertex, reflect across the edge
    child_final = []
    for vertex in child_aligned:
        # Vector from p1 to vertex
        v = vertex - p1_parent
        # Project onto edge
        proj = np.dot(v, edge_unit) * edge_unit
        # Perpendicular component
        perp = v - proj
        # Reflect
        reflected = proj - perp + p1_parent
        child_final.append(reflected)
    
    return np.array(child_final)
```

#### Method 2: Direct Edge Matching (Simpler)

```python
def place_face_along_edge(parent_2d, child_2d, parent_edge_idx, child_edge_idx):
    """
    Place child face by directly matching edge vertices
    """
    # Parent edge (already correctly placed)
    p1 = parent_2d[parent_edge_idx[0]]
    p2 = parent_2d[parent_edge_idx[1]]
    
    # Child edge (needs to match parent edge exactly)
    c1_idx = child_edge_idx[0]
    c2_idx = child_edge_idx[1]
    
    # Build transformation matrix
    # We want: child[c1_idx] -> p1, child[c2_idx] -> p2
    
    # Get child edge vector in local coordinates
    child_edge_vec = child_2d[c2_idx] - child_2d[c1_idx]
    child_edge_len = np.linalg.norm(child_edge_vec)
    
    # Parent edge vector
    parent_edge_vec = p2 - p1
    parent_edge_len = np.linalg.norm(parent_edge_vec)
    
    # Scale factor (should be 1.0 if projection is correct)
    scale = parent_edge_len / child_edge_len
    
    # Rotation angle
    angle_child = np.arctan2(child_edge_vec[1], child_edge_vec[0])
    angle_parent = np.arctan2(parent_edge_vec[1], parent_edge_vec[0])
    rotation = angle_parent - angle_child
    
    # Apply transformation to all child vertices
    result = []
    for i, vertex in enumerate(child_2d):
        # Translate to origin (relative to c1)
        v = vertex - child_2d[c1_idx]
        # Scale
        v = v * scale
        # Rotate
        cos_r = np.cos(rotation)
        sin_r = np.sin(rotation)
        v_rot = np.array([
            v[0] * cos_r - v[1] * sin_r,
            v[0] * sin_r + v[1] * cos_r
        ])
        # Translate to final position
        v_final = v_rot + p1
        result.append(v_final)
    
    # Flip to other side of edge (dihedral = 180°)
    # Reflect across parent edge line
    result_flipped = []
    edge_unit = parent_edge_vec / parent_edge_len
    for vertex in result:
        v = vertex - p1
        proj = np.dot(v, edge_unit) * edge_unit
        perp = v - proj
        reflected = proj - perp + p1
        result_flipped.append(reflected)
    
    return np.array(result_flipped)
```

### Edge Length Preservation

From the paper's emphasis on distortionless unfolding:

**The 3D edge length MUST equal the 2D edge length:**

```python
def verify_edge_preservation(vertices_3d, face_3d, vertices_2d):
    """Verify that 2D projection preserves edge lengths"""
    for i in range(len(face_3d)):
        v1_3d = vertices_3d[face_3d[i]]
        v2_3d = vertices_3d[face_3d[(i+1) % len(face_3d)]]
        edge_len_3d = np.linalg.norm(v2_3d - v1_3d)
        
        edge_len_2d = np.linalg.norm(vertices_2d[(i+1) % len(face_3d)] - vertices_2d[i])
        
        error = abs(edge_len_3d - edge_len_2d)
        if error > 1e-6:
            print(f"WARNING: Edge length mismatch: 3D={edge_len_3d:.6f}, 2D={edge_len_2d:.6f}")
```

## Additional Literature References

### Classic References (from paper bibliography)

1. **Demaine & O'Rourke (2007):** "Geometric Folding Algorithms: Linkages, Origami, Polyhedra"
   - Definitive textbook on unfolding
   - Chapter 22: Unfolding polyhedra
   - Proves some non-convex polyhedra cannot be edge-unfolded

2. **Schlickenrieder (1997):** "Nets of Polyhedra"
   - Original work on unfold-trees
   - Defines cut-trees and spanning trees

3. **Takahashi et al. (2011):** "Optimized topological surgery for unfolding 3D meshes"
   - Genetic algorithm approach
   - Merges triangles to create single-patched unfolding

4. **Zawallich (2023):** "Unfolding Polyhedra via Tabu Search"
   - Tabu search for overlap removal
   - Robust mesh unfolding approach

### Key Insights from Literature

#### On Edge Sharing

**All papers agree:**
- Unfolding must preserve connectivity along edges
- Faces share complete edges, not just vertices
- Edge lengths must be preserved exactly
- Transformation is rigid (no stretching/shearing)

#### On Transformation

**Correct sequence:**
1. Project face to local 2D plane (preserving edge lengths)
2. Find shared edge with already-placed parent
3. Align shared edge vertices (both v1 AND v2)
4. Flip across shared edge (reflection for dihedral = 180°)
5. Verify no overlaps with other faces

#### On Numerical Precision

**Critical for manufacturing:**
- Floating point errors accumulate
- Edge lengths must match within tolerance (< 1e-6)
- Use double precision (float64)
- Verify alignment after each placement

## Recommendations for Fix

### Immediate Actions

1. **Fix `project_face_to_2d` function**
   - Ensure it preserves edge lengths exactly
   - Use law of cosines correctly
   - Verify all edges after projection

2. **Fix transformation in `steepest_edge_unfold`**
   - Align BOTH vertices of shared edge
   - Add edge length verification
   - Implement proper reflection across edge

3. **Add validation**
   - Check that shared edges actually share (both vertices match)
   - Verify edge lengths are preserved
   - Detect gaps between faces

### Testing Strategy

1. Start with simple cases (tetrahedron - 4 faces)
2. Verify each face shares edges with neighbors
3. Measure edge lengths in 3D vs 2D
4. Check for gaps between faces
5. Validate with icosahedron (20 faces)

## Conclusion

The core issue is that our transformation only ensures one vertex aligns, not the entire shared edge. The literature is clear: **edge unfolding means faces share complete edges, not just touch at vertices**.

The fix requires:
1. Proper edge alignment (both vertices)
2. Edge length preservation verification
3. Correct reflection across shared edge for flipping

This is a fundamental geometric constraint that all unfolding algorithms must satisfy for the result to be a valid net.
