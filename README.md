# Savannah SVI Homebrew Mechanic Analyzer

A high-performance web application for analyzing D&D 5e homebrew mechanics using **exact probability calculations** with optional **WebAssembly acceleration**.

## Features

- 🎲 Exact probability-based damage calculations (not simulation!)
- ⚡ Optional WebAssembly acceleration (10-100x faster)
- 📊 Interactive charts with Apache ECharts
- 📈 Detailed statistical tables with TanStack Table
- 🎯 Support for complex dice expressions (e.g., `9d20+5`)
- ✨ Advantage/disadvantage mechanics
- 💾 Smart caching for instant re-calculations
- 🎨 Modern UI with shadcn/ui components

## Quick Start

### Without WASM (Easy Setup)
```bash
npm install
npm run dev
```

### With WASM (Maximum Performance)
See [WASM_SETUP.md](./WASM_SETUP.md) for detailed instructions.

```bash
# 1. Install Rust from https://rustup.rs/
# 2. Build WASM module
npm run build:wasm

# 3. Run the app
npm run dev
```

## Performance

| Feature | Implementation | Speed |
|---------|---------------|-------|
| Exact probability calculations | TypeScript + RangeDist | Fast |
| WASM acceleration (optional) | Rust | 10-100x faster |
| Result caching | localStorage | Instant |
| Web Workers | Background thread | UI stays responsive |

**Example:** Calculating 9d20 damage @ Level 20
- JavaScript: ~1,400ms
- WebAssembly: ~150ms ⚡

## Documentation

- [WASM Setup Guide](./WASM_SETUP.md) - How to enable WebAssembly
- [WASM Implementation](./WASM_IMPLEMENTATION.md) - Technical details
- [Performance Optimization](./PERFORMANCE_OPTIMIZATION.md) - Optimization history
- [Cache Implementation](./CACHE_IMPLEMENTATION.md) - Caching strategy

## Deploy Your Own

Deploy your own Vite project with Vercel.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/vercel/examples/tree/main/framework-boilerplates/vite-react&template=vite-react)

_Live Example: https://vite-react-example.vercel.app_

### Deploying From Your Terminal

You can deploy your new Vite project with a single command from your terminal using [Vercel CLI](https://vercel.com/download):

```shell
$ vercel
```
