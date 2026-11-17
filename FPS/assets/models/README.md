# Station visual assets

The GLB models in this directory were generated with Tripo Studio for Operation Cutoff and prepared for Egret World3D. They include embedded textures, reduced geometry and corrections for the game's visual attachment points.

`index.json` maps a visual role to a file. Several compatible roles share a file. Character entries select named rigid parts so existing game joints drive movement and falling. First-person entries keep the existing reload and recoil pivots. Repeated scene props use shared geometry and instanced draws.

Each complete figure and weapon uses one uniform scale across its visual parts. Joint offsets, sights, magazines and handles use the same authored coordinates. Whole props preserve their aspect ratios. Long containers and cover repeat their original centre panels, while wall skins fit the modular building surfaces.

The generated art is separate from the engine runtime's Apache-2.0 license. Distribution of these model files is subject to the applicable Tripo account and output terms. No third-party game models are included in this directory.

Original high-resolution exports and preparation intermediates are retained outside the game directory. Only the prepared GLBs are requested by the game.
