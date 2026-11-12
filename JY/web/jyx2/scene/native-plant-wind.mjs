export const plantWindVertex = `vec3 customVertex(vec3 world, vec3 local, vec3 normal, vec2 uv, vec4 color) {
  vec4 plant = uCustom[0]; // time, bend, flutter, inverse source height
  vec2 motion = uCustom[1].xy; // plant height and enabled flag
  float bend = smoothstep(.08, 1.0, clamp((local.y - uCustom[1].z) * plant.w, 0.0, 1.0));
  float phase = dot(world.xz, vec2(.24, .16));
  float along = .40 * sin(plant.x * .73 + phase * 2.3) + .46 * sin(plant.x * 1.13 - phase)
              + .14 * sin(plant.x * 1.92 + phase * .57);
  float across = .38 * sin(plant.x * 1.35 + phase * 1.37);
  float flutter = sin(plant.x * 3.8 + dot(world, vec3(2.1, 3.4, -2.8)));
  vec2 v = vec2(.82, .572);
  vec2 crossWind = vec2(-v.y, v.x);
  vec2 offset = (v * along + crossWind * across) * bend * plant.y + crossWind * flutter * bend * bend * plant.z;
  return world + vec3(offset.x, 0.0, offset.y) * motion.x * motion.y;
}`;
