# Rust Installation Issue - Solution

## Problem
Your Rust installation appears to be corrupted. The `wasm32-unknown-unknown` target claims to be installed but the files don't exist in the expected location.

## Root Cause
The Rust installation from winget has issues with the sysroot path containing spaces:
```
C:\Program Files\Rust stable MSVC 1.91
```

This can cause compilation failures.

## Solution: Reinstall Rust Properly

### Step 1: Uninstall Current Rust
```powershell
# Uninstall via winget
winget uninstall Rustlang.Rust.MSVC

# Or manually remove
# Delete: C:\Program Files\Rust stable MSVC 1.91
# Remove from PATH if needed
```

### Step 2: Install Rust via rustup (Recommended Method)
```powershell
# Download and run rustup-init
Invoke-WebRequest -Uri https://win.rustup.rs -OutFile rustup-init.exe
.\rustup-init.exe

# Follow the prompts (press 1 for default installation)
# This will install Rust to: C:\Users\<username>\.rustup
```

### Step 3: Add WASM Target
```powershell
rustup target add wasm32-unknown-unknown
```

### Step 4: Verify Installation
```powershell
rustc --version
cargo --version
rustup target list --installed
```

You should see:
```
wasm32-unknown-unknown
x86_64-pc-windows-msvc
```

### Step 5: Build WASM Module
```powershell
.\scripts\build-wasm.ps1
```

## Alternative: Use Docker/WSL

If you prefer not to reinstall Rust on Windows, you can build in WSL or Docker:

### WSL Option
```bash
# In WSL
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
cd /mnt/c/Users/zammc/savannah-svi-hb-mech
./scripts/build-wasm.sh
```

### Docker Option
```powershell
# Create a build container
docker run --rm -v ${PWD}:/project -w /project rust:latest bash -c "
  cargo install wasm-pack && 
  cd wasm && 
  wasm-pack build --target web --out-dir ../src/utilities/wasm-pkg
"
```

## Option: Skip WASM for Now

Remember, WASM is **optional**! The app works perfectly fine without it:

1. Don't worry about the WASM build
2. The app will automatically use JavaScript fallback
3. It's still very fast (1.8 seconds for extreme cases)
4. Come back to WASM later when you have time

Just skip the WASM integration steps and the app will work normally!

## Next Steps After Fix

Once Rust is properly installed:
1. Run `.\scripts\build-wasm.ps1`
2. Follow WASM_STATUS.md for integration steps
3. Enjoy 10-100x faster calculations!
