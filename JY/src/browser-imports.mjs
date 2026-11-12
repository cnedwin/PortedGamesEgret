export const musicPackages = ['spessasynth_lib', 'spessasynth_core', 'fflate', 'stb-vorbis'];
export const enginePackages = ['engine', 'runtime', 'contracts', 'robust-predicates'];

// The browser build and local launcher use the same package export map.
export function makeGameImports(manifests, vendorUrl, musicUrl) {
  const imports = Object.fromEntries(musicPackages.map(name => [name, musicUrl(name)]));
  for (const [folder, manifest] of manifests) {
    const url = target => vendorUrl(folder, target.slice(2));
    if (typeof manifest.exports === 'string') imports[manifest.name] = url(manifest.exports);
    else for (const [key, entry] of Object.entries(manifest.exports)) {
      if (entry.import) imports[manifest.name + (key === '.' ? '' : key.slice(1))] = url(entry.import);
    }
    for (const [key, entry] of Object.entries(manifest.imports ?? {})) {
      if (entry.import) imports[key] = url(entry.import);
    }
  }
  return imports;
}
