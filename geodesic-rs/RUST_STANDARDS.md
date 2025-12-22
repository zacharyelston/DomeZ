# Rust Standard Libraries & Best Practices

## Core Philosophy

**"Batteries included, but swappable"** - Use well-established crates from the ecosystem.

## Essential Crates (Cobra/Viper Equivalents)

### CLI Framework (Cobra → clap)
```toml
clap = { version = "4.4", features = ["derive"] }
```

**Why clap?**
- 50M+ downloads, industry standard
- Derive macros for easy CLI definition
- Auto-generated help, validation, completions
- Subcommands, flags, arguments

**Example:**
```rust
use clap::Parser;

#[derive(Parser)]
#[command(author, version, about)]
struct Cli {
    #[arg(short, long)]
    input: PathBuf,
    
    #[arg(short, long, default_value = "unfolded")]
    mode: String,
}
```

### Configuration (Viper → config/figment)

**Option 1: `config`** (Simple, like Viper)
```toml
config = "0.14"
```

**Option 2: `figment`** (More powerful)
```toml
figment = { version = "0.10", features = ["toml", "json", "yaml", "env"] }
```

**Why figment?**
- Layered config (files → env vars → CLI)
- Multiple formats (TOML, JSON, YAML)
- Type-safe extraction
- Profile support (dev, prod, test)

**Example:**
```rust
use figment::{Figment, providers::{Format, Toml, Env}};

let config: Config = Figment::new()
    .merge(Toml::file("config.toml"))
    .merge(Env::prefixed("APP_"))
    .extract()?;
```

## Production-Ready Stack

### Error Handling
```toml
anyhow = "1.0"      # Easy error propagation with ?
thiserror = "1.0"   # Custom error types with derive
```

**Pattern:**
```rust
use anyhow::{Result, Context};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum UnfoldError {
    #[error("Invalid mesh: {0}")]
    InvalidMesh(String),
    
    #[error("Layout failed: {0}")]
    LayoutFailed(String),
}

fn unfold() -> Result<()> {
    load_mesh()
        .context("Failed to load mesh")?;
    Ok(())
}
```

### Logging & Tracing
```toml
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
```

**Why tracing over log?**
- Structured logging
- Spans for timing
- Async-aware
- Better debugging

**Example:**
```rust
use tracing::{info, warn, error, instrument};

#[instrument]
fn unfold_mesh(mesh: &Mesh) -> Result<Layout> {
    info!("Starting unfold with {} faces", mesh.faces.len());
    // ... work ...
    Ok(layout)
}

// Initialize
tracing_subscriber::fmt()
    .with_env_filter("geodesic=debug")
    .init();
```

### Serialization
```toml
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
toml = "0.8"        # If using TOML configs
```

**Pattern:**
```rust
use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize)]
struct Mesh {
    vertices: Vec<Vertex>,
    faces: Vec<Face>,
}

// JSON
let json = serde_json::to_string_pretty(&mesh)?;
let mesh: Mesh = serde_json::from_str(&json)?;
```

### Parallel Processing
```toml
rayon = "1.8"
```

**Why rayon?**
- Data parallelism made easy
- Work-stealing scheduler
- Zero-cost abstraction
- Drop-in replacement for iterators

**Example:**
```rust
use rayon::prelude::*;

// Sequential
let results: Vec<_> = faces.iter()
    .map(|f| process_face(f))
    .collect();

// Parallel (just add par_)
let results: Vec<_> = faces.par_iter()
    .map(|f| process_face(f))
    .collect();
```

### Progress Indicators
```toml
indicatif = "0.17"
```

**Example:**
```rust
use indicatif::{ProgressBar, ProgressStyle};

let pb = ProgressBar::new(faces.len() as u64);
pb.set_style(ProgressStyle::default_bar()
    .template("[{elapsed_precise}] {bar:40} {pos}/{len} {msg}")?);

for face in faces {
    process_face(face);
    pb.inc(1);
}
pb.finish_with_message("Complete");
```

### File I/O
```toml
walkdir = "2.4"     # Directory traversal
glob = "0.3"        # Pattern matching
```

**Example:**
```rust
use walkdir::WalkDir;

for entry in WalkDir::new("polyhedra_output")
    .into_iter()
    .filter_map(|e| e.ok())
    .filter(|e| e.path().extension() == Some("obj".as_ref()))
{
    println!("Found: {}", entry.path().display());
}
```

## Domain-Specific Libraries

### Math & Geometry
```toml
nalgebra = "0.32"           # Linear algebra
cgmath = "0.18"             # Alternative to nalgebra
geo = "0.27"                # 2D geometry
parry3d = "0.13"            # 3D collision detection
```

**We're using nalgebra** - Good choice for geodesic math.

### CAD/Manufacturing Export
```toml
dxf = "0.6"                 # DXF format (AutoCAD)
svg = "0.13"                # SVG generation
printpdf = "0.7"            # PDF generation
gcode = "0.5"               # G-code for CNC (future)
```

### 3D Formats
```toml
obj-rs = "0.7"              # OBJ file format
gltf = "1.4"                # glTF 2.0 format
stl_io = "0.7"              # STL format
```

## Testing & Benchmarking

```toml
[dev-dependencies]
criterion = "0.5"           # Benchmarking
proptest = "1.4"            # Property-based testing
approx = "0.5"              # Float comparison
```

**Example benchmark:**
```rust
use criterion::{black_box, criterion_group, criterion_main, Criterion};

fn bench_unfold(c: &mut Criterion) {
    let mesh = load_test_mesh();
    
    c.bench_function("unfold_icosahedron_3v", |b| {
        b.iter(|| unfold(black_box(&mesh)))
    });
}

criterion_group!(benches, bench_unfold);
criterion_main!(benches);
```

## Comparison: Go vs Rust

| Feature | Go | Rust |
|---------|-----|------|
| CLI | Cobra | clap |
| Config | Viper | config/figment |
| Logging | logrus/zap | tracing |
| Errors | errors.Wrap | anyhow/thiserror |
| JSON | encoding/json | serde_json |
| HTTP | net/http | axum/actix-web |
| Async | goroutines | tokio/async-std |
| Testing | testing | cargo test |

## Project Structure

```
geodesic-rs/
├── Cargo.toml              # Dependencies
├── src/
│   ├── lib.rs              # Library code
│   ├── geometry.rs         # Geometry operations
│   ├── unfold.rs           # Unfolding algorithm
│   ├── export/
│   │   ├── mod.rs
│   │   ├── dxf.rs
│   │   └── svg.rs
│   └── bin/
│       └── main.rs         # CLI binary
├── tests/
│   └── integration_test.rs
├── benches/
│   └── unfold_bench.rs
└── examples/
    └── basic_unfold.rs
```

## Cargo Commands

```bash
# Build
cargo build                 # Debug build
cargo build --release       # Optimized build

# Run
cargo run -- --help         # Run with args
cargo run --release         # Optimized run

# Test
cargo test                  # Run tests
cargo test --release        # Optimized tests

# Benchmark
cargo bench                 # Run benchmarks

# Check
cargo check                 # Fast compile check
cargo clippy                # Linter
cargo fmt                   # Format code

# Documentation
cargo doc --open            # Generate & open docs
```

## Best Practices

### 1. Error Handling
```rust
// ✅ Good: Use ? operator with context
fn load_mesh(path: &Path) -> Result<Mesh> {
    let content = fs::read_to_string(path)
        .context("Failed to read mesh file")?;
    parse_obj(&content)
        .context("Failed to parse OBJ format")?
}

// ❌ Bad: Unwrap or expect
let content = fs::read_to_string(path).unwrap();
```

### 2. Logging
```rust
// ✅ Good: Structured logging
info!(
    mesh_faces = mesh.faces.len(),
    output_format = "dxf",
    "Starting unfold"
);

// ❌ Bad: String formatting
println!("Starting unfold with {} faces", mesh.faces.len());
```

### 3. Configuration
```rust
// ✅ Good: Layered config
let config = Figment::new()
    .merge(Toml::file("config.toml"))
    .merge(Env::prefixed("GEODESIC_"))
    .extract()?;

// ❌ Bad: Hardcoded values
const LAYOUT_WIDTH: f64 = 2.0;
```

### 4. Performance
```rust
// ✅ Good: Use iterators and parallel processing
let results: Vec<_> = faces.par_iter()
    .filter(|f| f.area > 0.1)
    .map(|f| process_face(f))
    .collect();

// ❌ Bad: Manual loops with allocations
let mut results = Vec::new();
for face in &faces {
    if face.area > 0.1 {
        results.push(process_face(face));
    }
}
```

## Recommended Reading

- **The Rust Book**: https://doc.rust-lang.org/book/
- **Rust by Example**: https://doc.rust-lang.org/rust-by-example/
- **Cargo Book**: https://doc.rust-lang.org/cargo/
- **API Guidelines**: https://rust-lang.github.io/api-guidelines/
- **Crates.io**: https://crates.io/ (search for libraries)

## Summary

**For geodesic-unfolder, we're using:**
- ✅ `clap` - CLI (like Cobra)
- ✅ `config` - Configuration (like Viper)
- ✅ `anyhow` + `thiserror` - Error handling
- ✅ `tracing` - Logging
- ✅ `serde` - Serialization
- ✅ `nalgebra` - Math
- ✅ `rayon` - Parallelism
- ✅ `indicatif` - Progress bars
- ✅ `dxf` + `svg` - Export formats

This gives us a production-ready foundation equivalent to Go's Cobra/Viper stack.
