import {
  Mesh3D, Object3D, colorFromHex, createCustomShader3D, createGeometry3D, createStandardMaterial3D,
} from '@egret/engine/world3d';
import { submapEarthKind } from './submap-layout.mjs';

export const submapElevation = raw => Math.max(0, raw) / (18 * Math.sqrt(1.5));
export const submapPicture = raw => Math.trunc(raw / 2);
export const submapVariation = (x, y, id) => ((Math.imul(x + 7, 1597334677) ^ Math.imul(y + 13, 3812015801)
  ^ Math.imul(id, 1597334677)) >>> 0) / 4294967296;

const floorStyle = {
  grass: ['grass', 0x7d9a62, 5.5], dirt: ['grass', 0xba966b, 4.9], sand: ['rock', 0xdac096, 5.5],
  stone: ['paving', 0xc5c0af, 2.35], wood: ['wood', 0xc1a181, 3.2], carpet: ['wood', 0xb76c57, 3.4],
  snow: ['rock', 0xe4efed, 7.3], cave: ['paving', 0xa59583, 2.8],
  water: ['water', 0x6d9d9a, 4.2], swamp: ['water', 0x97936c, 4.2],
};
const outdoor = ['grass', 'dirt', 'sand', 'snow'];
const corners = [[-.5, -.5], [.5, -.5], [.5, .5], [-.5, .5]];
const edges = [[0, -1, 0, 1], [1, 0, 1, 2], [0, 1, 2, 3], [-1, 0, 3, 0]];

const grainShader = `vec4 customFragment(vec4 color, vec3 position, vec3 normal, vec2 uv) {
  float shade = dot(texture(uEmissiveMap, uv).rgb, vec3(.26, .65, .09));
  color.rgb *= mix(1.0, .72 + .51 * sqrt(clamp(shade, 0.0, 1.0)), uCustom[0].x);
  return color;
}`;

export function createNativeSubmapTerrain(textures) {
  const root = new Object3D(), geometries = [];
  const styles = new Map(Object.entries(floorStyle).map(([kind, [texture, hex, repeat]]) => {
    const outside = outdoor.includes(kind);
    const material = createStandardMaterial3D({ vertexColors: true, roughness: texture === 'water' ? .50 : .91,
      ...(outside ? { emissiveMap: textures[texture] } : { map: textures[texture] }) });
    if (outside) material.shader = createCustomShader3D({ key: 'kys-submap-ground-grain', glsl: grainShader,
      uniforms: [kind === 'snow' ? .10 : .31] });
    return [kind, { material, color: colorFromHex(new Float32Array(3), hex), repeat }];
  }));

  function clear() {
    root.removeChildren();
    for (const geometry of geometries.splice(0)) geometry.dispose();
  }

  function add(material, positions, uvs, colors, indices) {
    const geometry = createGeometry3D({ positions, uvs, colors, indices });
    geometries.push(geometry);
    const mesh = root.addChild(new Mesh3D(geometry, material));
    mesh.castShadow = false;
    return mesh;
  }

  function build(map, tiles, coverage, cave) {
    clear();
    const { width, height, layers } = map;
    const cellAt = (x, y) => x >= 0 && y >= 0 && x < width && y < height ? y * width + x : -1;
    let groundBlend;
    if (map.blendOutdoorGround) {
      groundBlend = new Float32Array((width + 1) * (height + 1));
      const kinds = Array.from(layers.earth, raw => submapEarthKind(submapPicture(raw)));
      for (let y = 0; y <= height; y++) for (let x = 0; x <= width; x++) {
        let grass = 0, dirt = 0;
        for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) {
          const kind = kinds[cellAt(x + dx, y + dy)];
          if (kind === 'grass') grass++;
          if (kind === 'dirt') dirt++;
        }
        groundBlend[y * (width + 1) + x] = grass + dirt ? dirt / (grass + dirt) : 0;
      }
    }

    const outside = outdoor.reduce((best, kind) => (coverage.get(kind) ?? 0) > (coverage.get(best) ?? 0) ? kind : best, 'grass');
    if (!cave && (coverage.get(outside) ?? 0) > 480) {
      const { material, color, repeat } = styles.get(outside);
      const lo = -10, hiX = width + 9, hiY = height + 9;
      const backdrop = add(material, [lo, -.025, lo, hiX, -.025, lo, lo, -.025, hiY, hiX, -.025, hiY],
        [lo / repeat, lo / repeat, hiX / repeat, lo / repeat, lo / repeat, hiY / repeat, hiX / repeat, hiY / repeat],
        [...color, ...color, ...color, ...color], [0, 2, 1, 1, 2, 3]);
      backdrop.name = 'submap-outdoor-backdrop';
    }

    for (const [kind, cells] of tiles) {
      const { material, color, repeat } = styles.get(kind) ?? styles.get('stone');
      const positions = [], uvs = [], colors = [], indices = [];
      const blend = groundBlend && (kind === 'grass' || kind === 'dirt');
      const grass = styles.get('grass').color, dirt = styles.get('dirt').color;
      for (const [x, y, yWorld, id] of cells) {
        const next = positions.length / 3;
        const intensity = outdoor.includes(kind) ? 1 : .94 + submapVariation(x, y, id) * .10;
        for (const [dx, dz] of corners) {
          positions.push(x + dx, yWorld, y + dz);
          if (blend) {
            const corner = (y + dz + .5) * (width + 1) + x + dx + .5;
            const amount = groundBlend[corner];
            const light = .95 + .045 * Math.sin(x * .63 + y * .52) * Math.sin(y * .39 - x * .18);
            uvs.push((x + dx) / 5.5, (y + dz) / 5.5);
            for (let i = 0; i < 3; i++) colors.push((grass[i] * (1 - amount) + dirt[i] * amount) * light);
          } else {
            uvs.push((x + dx) / repeat, (y + dz) / repeat);
            colors.push(color[0] * intensity, color[1] * intensity, color[2] * intensity);
          }
        }
        indices.push(next, next + 3, next + 1, next + 1, next + 3, next + 2);
        if (yWorld < .14) continue;
        for (const [dx, dy, a, b] of edges) {
          const neighbor = cellAt(x + dx, y + dy);
          const lower = neighbor < 0 ? 0 : submapElevation(layers.buildingHeight[neighbor]);
          if (lower >= yWorld - .03) continue;
          const start = positions.length / 3;
          for (const [corner, vertical] of [[a, yWorld], [b, yWorld], [a, lower], [b, lower]]) {
            const xx = positions[(next + corner) * 3], zz = positions[(next + corner) * 3 + 2];
            positions.push(xx, vertical, zz);
            uvs.push((dx ? zz : xx) / repeat, vertical / repeat);
            colors.push(color[0] * .75, color[1] * .75, color[2] * .75);
          }
          indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2);
        }
      }
      const mesh = add(material, positions, uvs, colors, indices);
      mesh.name = `submap-floor-${kind}`;
    }
  }

  return { root, build, dispose() {
    clear();
    for (const { material } of styles.values()) material.dispose();
    root.removeFromParent();
  } };
}
