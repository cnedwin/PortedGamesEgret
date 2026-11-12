# 7-Zip WebAssembly browser dependency

This directory contains the unmodified browser JavaScript and WebAssembly from `sevenzip-wasm` 26.3.0. The package was checked against the npm registry SHA-512 integrity value.

- [Package build source and patches](sevenzip-wasm-source.tar.gz), commit `b4406198ad5399dc277cc13ab288f54b676aa411`.
- [7-Zip source used by that build](7zip-source.tar.gz), commit `0766b733fe3e06dd2a7f9a3cfbf2108ac73abd17`.
- [Distribution terms and unRAR restriction](LICENSE) and [GNU LGPL 2.1 text](LGPL-2.1.txt).
- [Package and file checksums](source-receipt.json).

The upstream build uses the wrapper repository and its `7zip` submodule at the commits above. Its `build.sh` applies `7zip-26.03.patch` and builds the Alone2 bundle with Emscripten. The game calls the resulting module from an independent worker.
