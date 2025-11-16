# WebAssembly Setup Guide

This guide will help you set up the WebAssembly acceleration for maximum performance.

## Quick Start (Development)

### Step 1: Install Rust
```bash
# Windows (PowerShell)
winget install Rustlang.Rust.MSVC

# Or use rustup (all platforms)
# Visit: https://rustup.rs/
```

### Step 2: Build WASM Module
```powershell
# Windows
.\scripts\build-wasm.ps1

# Linux/Mac
chmod +x scripts/build-wasm.sh
./scripts/build-wasm.sh
```

### Step 3: Run the App
```bash
npm run dev
```

Check the console for: `✅ WebAssembly module loaded successfully`

## Without WASM (Fallback Mode)

Don't want to install Rust? No problem!

The app works perfectly fine without WASM:
- All calculations still work
- Slightly slower (2-10x), but still very fast
- No setup required

Just run:
```bash
npm run dev
```

You'll see: `ℹ️ WebAssembly failed to load, falling back to JavaScript`

## Production Build

### With WASM (Recommended)
```bash
npm run build:wasm
npm run build
```

### Without WASM (Fallback)
```bash
# Just skip the WASM build
npm run build
```

The app will detect WASM availability at runtime and use the best available option.

## Troubleshooting

### Rust Installation Issues
- **Windows**: Use `winget` or download from [rust-lang.org](https://www.rust-lang.org/tools/install)
- **Linux**: `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
- **Mac**: `brew install rust` or use rustup

### wasm-pack Not Found
```bash
cargo install wasm-pack
```

### Build Errors
```bash
# Clear cache and rebuild
cd wasm
cargo clean
cd ..
npm run build:wasm
```

### Still Having Issues?
Just run without WASM! The JavaScript fallback is production-ready and well-tested.

## Performance Comparison

| Scenario | With WASM | Without WASM |
|----------|-----------|--------------|
| Small dice (1d6+3) | ~0.5ms | ~2.5ms |
| Medium dice (2d8+5) | ~1ms | ~3.5ms |
| Large dice (9d20) @ L20 | ~150ms | ~1,400ms |

Both are fast enough for smooth UX!
