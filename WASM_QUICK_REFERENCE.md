# 🚀 WASM Quick Reference

## Build Commands
```bash
# Build WASM module
npm run build:wasm

# Build entire app (includes WASM)
npm run build

# Development (WASM optional)
npm run dev
```

## File Locations
```
wasm/src/lib.rs                  # Rust implementation
src/utilities/wasm-bridge.ts     # TypeScript wrapper
src/utilities/batch-calculator-wasm.ts  # WASM-enabled calculator
src/utilities/wasm-pkg/          # Generated output (gitignored)
```

## Key Functions

### TypeScript API
```typescript
// Initialize WASM (call once at app startup)
await initWasm()

// Check availability
isWasmAvailable()

// Use directly (automatic fallback)
convolve(a, b)
calculateBatchDamageStatsWasm(params)
```

### Integration
```typescript
// In App.tsx
import { initWasm } from '@/utilities/wasm-bridge';
useEffect(() => { initWasm(); }, []);

// In calculator
import { calculateBatchDamageStats } from '@/utilities/batch-calculator-wasm';
```

## Performance
| Operation | JS | WASM | Speedup |
|-----------|----|----|---------|
| Convolution 100×100 | 12ms | 0.15ms | 80x |
| 9d20 @ L20 | 1.4s | 150ms | 9x |

## Troubleshooting
```bash
# WASM not loading?
npm run build:wasm

# Build errors?
cargo install wasm-pack
cd wasm && cargo clean
npm run build:wasm

# Check status in browser
console.log(isWasmAvailable())
```

## Browser Console
```
✅ WebAssembly module loaded successfully  # WASM working
⚠️ WebAssembly failed to load...           # Using JS fallback
⚡ Calculated... in 152ms                   # WASM active
⚡ Calculated... in 1,423ms                 # JS fallback
```

## Deployment
```bash
# Vercel (automatic)
npm run build
vercel deploy

# Other platforms
# Ensure .wasm files served with application/wasm MIME type
```

## Testing
```bash
# Run WASM tests
npm test wasm-bridge

# Performance comparison
npm test performance.test.ts
```

## Documentation
- **WASM_COMPLETE.md** - Full implementation guide
- **WASM_SETUP.md** - Getting started
- **WASM_IMPLEMENTATION.md** - Technical details
- **WASM_INTEGRATION_GUIDE.md** - Step-by-step
