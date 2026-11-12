# sevenzip-wasm [![npm version](https://img.shields.io/npm/v/sevenzip-wasm.svg)](https://www.npmjs.com/package/sevenzip-wasm)

Just another npm package with 7-Zip compiled for WebAssembly, inspired by similar packages out there.

## Installation

Install with npm or equivalent:

```bash
npm i sevenzip-wasm
```

Or use directly in a browser:

```html
<script src="https://cdn.jsdelivr.net/npm/sevenzip-wasm/sevenzip-wasm.min.js"></script>
```

## Usage

The 7-Zip executable compiled to WebAssembly is the "Alone2" bundle, which supports most archive formats. Use it as you would the native executable. The most important differences are around filesystems. Emscripten's MEMFS, NODEFS (Node.js only), and WORKERFS have been compiled in. See [File System API](https://emscripten.org/docs/api_reference/Filesystem-API.html) for details.

Once imported, SevenZipWasm can be initialized like so:

```js
const sevenZip = await SevenZipWasm();
```

To redirect stdout/stderr, the initialization can be modified as follows:

```js
const sevenZip = await SevenZipWasm({
	print: (line) => console.log(line),
	printErr: (line) => console.log(line),
});
```

For more control, including stdin, use `FS.init()`, as [documented here](https://emscripten.org/docs/api_reference/Filesystem-API.html#setting-up-standard-i-o-devices).

To actually execute 7-Zip, use the `callMain()` function:

```js
const sevenZip = await SevenZipWasm();
sevenZip.callMain(['i']);
```

By default, MEMFS is mounted at `/`. Use the FS functions in the aforementioned documentation to read and write in the virtual filesystem. For example, to see all entries in the root filesystem, do the following:

```js
const sevenZip = await SevenZipWasm();
console.log(sevenZip.FS.readdir('/'));
```

For further examples of working with MEMFS and NODEFS, take a look at the included tests.

## Changelog

### 26.3.0

- Update upstream to 26.03

### 26.2.0

- Update upstream to 26.02
- Update Emscripten to 6.0.1, possibly breaking compatibility with very old browsers

### 26.1.0

- Update upstream to 26.01
- Rework versioning

### 0.1.9

- Update upstream to 26.00

### 0.1.8

- Update upstream to 25.01
- Remove additional compilation fix
- Update dependencies

### 0.1.7

- Update upstream to 25.00
- Add compilation fix
- Add more tests

### 0.1.6

- Initial public release
