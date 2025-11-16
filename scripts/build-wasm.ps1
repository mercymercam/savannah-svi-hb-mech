# Build WebAssembly module
Write-Host "Building WebAssembly module..." -ForegroundColor Cyan

# Check if Rust is installed
$rustc = Get-Command rustc -ErrorAction SilentlyContinue
if (-not $rustc) {
    Write-Host "Rust is not installed. Please install it from https://rustup.rs/" -ForegroundColor Red
    exit 1
}

# Check if wasm-pack is installed
$wasmPack = Get-Command wasm-pack -ErrorAction SilentlyContinue
if (-not $wasmPack) {
    Write-Host "Installing wasm-pack..." -ForegroundColor Yellow
    cargo install wasm-pack
}

# Build the WASM module
Push-Location wasm
wasm-pack build --target web --out-dir ../src/utilities/wasm-pkg
Pop-Location

Write-Host "WebAssembly module built successfully!" -ForegroundColor Green
Write-Host "Output: src/utilities/wasm-pkg/" -ForegroundColor Cyan
