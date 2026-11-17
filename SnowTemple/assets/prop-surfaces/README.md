# SnowTemple prop surfaces

The stone, bronze, snow, straw, bark and needle textures were authored for SnowTemple. Each tile has a color, tangent normal and packed roughness/metallic map derived from the same surface. The maps are generated with `node tools/prop-surfaces.mjs` from the game directory and require only Node.js.

The team uses 128-pixel material tiles in the low model tier and 256-pixel tiles in the other tiers. Texture data is shared by the stone lanterns, bronze censer, stone lions, hay stacks and pines. The source meshes carry surface IDs and the renderer keeps their existing lighting, shadows and foliage fading.
