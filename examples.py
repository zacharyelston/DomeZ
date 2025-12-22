#!/usr/bin/env python3
"""
Example usage scripts for geodesic dome generator
"""

from dome_generator import GeodesicDome
from pathlib import Path


def example_basic():
    """Basic dome generation"""
    print("Example 1: Basic Hemisphere")
    print("-" * 40)
    
    dome = GeodesicDome(frequency=3, radius=5.0)
    dome.generate()
    dome.cut_to_partial(0.5)
    dome.to_obj('dome_output/basic_hemisphere.obj')
    print()


def example_greenhouse():
    """Greenhouse dome (7/12 sphere)"""
    print("Example 2: Greenhouse Dome")
    print("-" * 40)
    
    dome = GeodesicDome(frequency=3, radius=3.5, base='icosahedron')
    dome.generate()
    dome.cut_to_partial(7/12)  # 7/12 sphere gives good headroom
    dome.to_obj('dome_output/greenhouse.obj')
    print()


def example_planetarium():
    """Full sphere for planetarium"""
    print("Example 3: Planetarium (Full Sphere)")
    print("-" * 40)
    
    dome = GeodesicDome(frequency=4, radius=8.0)
    dome.generate()
    # No cut_to_partial = full sphere
    dome.to_obj('dome_output/planetarium.obj')
    print()


def example_event_dome():
    """Large event dome with high detail"""
    print("Example 4: Large Event Dome")
    print("-" * 40)
    
    dome = GeodesicDome(frequency=5, radius=10.0)
    dome.generate()
    dome.cut_to_partial(0.5)
    dome.to_obj('dome_output/event_dome.obj')
    print()


def example_batch_generation():
    """Generate multiple domes with different frequencies"""
    print("Example 5: Batch Generation (Different Frequencies)")
    print("-" * 40)
    
    for freq in [2, 3, 4, 5]:
        print(f"  Generating {freq}V dome...")
        dome = GeodesicDome(frequency=freq, radius=5.0)
        dome.generate()
        dome.cut_to_partial(0.5)
        dome.to_obj(f'dome_output/hemisphere_{freq}v.obj')
    print()


def example_custom_sizes():
    """Generate domes of various sizes"""
    print("Example 6: Various Sizes")
    print("-" * 40)
    
    sizes = [
        (2.0, "tiny_shelter"),
        (5.0, "standard_dome"),
        (10.0, "large_structure"),
    ]
    
    for radius, name in sizes:
        print(f"  Generating {name} (radius={radius}m)...")
        dome = GeodesicDome(frequency=3, radius=radius)
        dome.generate()
        dome.cut_to_partial(0.5)
        dome.to_obj(f'dome_output/{name}.obj')
    print()


def example_partial_variations():
    """Generate domes with different partial cuts"""
    print("Example 7: Partial Sphere Variations")
    print("-" * 40)
    
    partials = [
        (0.25, "quarter_sphere"),
        (0.5, "hemisphere"),
        (0.75, "three_quarter"),
        (1.0, "full_sphere"),
    ]
    
    for partial, name in partials:
        print(f"  Generating {name} (partial={partial})...")
        dome = GeodesicDome(frequency=3, radius=5.0)
        dome.generate()
        dome.cut_to_partial(partial)
        dome.to_obj(f'dome_output/{name}.obj')
    print()


def example_statistics():
    """Show dome statistics"""
    print("Example 8: Dome Statistics")
    print("-" * 40)
    
    for freq in [2, 3, 4, 5, 6]:
        dome = GeodesicDome(frequency=freq, radius=5.0)
        dome.generate()
        dome.cut_to_partial(0.5)
        
        print(f"  {freq}V Hemisphere:")
        print(f"    Vertices: {len(dome.vertices)}")
        print(f"    Faces: {len(dome.faces)}")
        print(f"    Approx Edges: {len(dome.faces) * 3 // 2}")
    print()


def main():
    """Run all examples"""
    print("=" * 60)
    print("Geodesic Dome Generator - Examples")
    print("=" * 60)
    print()
    
    # Create output directory
    Path('dome_output').mkdir(exist_ok=True)
    
    # Run examples
    example_basic()
    example_greenhouse()
    example_planetarium()
    example_event_dome()
    example_batch_generation()
    example_custom_sizes()
    example_partial_variations()
    example_statistics()
    
    print("=" * 60)
    print("All examples complete!")
    print("Check dome_output/ directory for generated .obj files")
    print("=" * 60)


if __name__ == '__main__':
    main()
