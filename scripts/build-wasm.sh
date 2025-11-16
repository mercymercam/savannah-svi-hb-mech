#!/usr/bin/env bash
set -e

echo "🦀 Building WebAssembly module..."

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust is not installed. Please install it from https://rustup.rs/"
    exit 1
fi

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "📦 Installing wasm-pack..."
    cargo install wasm-pack
fi

# Build the WASM module
cd wasm
wasm-pack build --target web --out-dir ../src/utilities/wasm-pkg

echo "✅ WebAssembly module built successfully!"
echo "📦 Output: src/utilities/wasm-pkg/"
