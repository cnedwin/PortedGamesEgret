# Station visual assets

The GLB models in this directory were generated with Tripo Studio for Operation Cutoff and prepared for Egret World3D. They include embedded textures, reduced geometry and corrections for the game's visual attachment points.

`index.json` maps a visual role to a file. Several compatible roles share a file. Each character uses its complete continuous surface, original UVs and PBR maps. The game binds a sixteen-bone Egret skin and drives it with its existing procedural motion and falling simulation; these static source models do not contain motion capture. First-person entries keep separate reload and recoil pivots. Repeated scene props use shared geometry and instanced draws.

Each complete figure and weapon uses one uniform scale across its visual parts. Joint offsets, sights, magazines and handles use the same authored coordinates. Whole props preserve their aspect ratios. Long containers and cover repeat their original centre panels; architectural reliefs repeat at a fixed scale around actual door openings. Geometry preparation preserves the source UVs, normals and PBR slots instead of reprojecting colour onto an aggressively reduced mesh.

Hard-surface preparation in this batch limits geometric simplification error to 0.003. Face counts vary with the shape. Check native PBR close views and face/normal agreement when replacing these assets; intact UVs alone do not prove that the shape survived reduction.

Detailed visible meshes remain intact in both the main view and wet-ground reflections. Rigid models cast source-fitted depth silhouettes shared through native shadow passes; continuous character skins keep their original shadows. The depth silhouettes follow the same pivots and instance matrices, use no colour textures and stay out of camera and mirror layers. `?modelShadows=full` selects full caster geometry for diagnostic comparison.

The generated art is separate from the engine runtime's Apache-2.0 license. Distribution of these model files is subject to the applicable Tripo account and output terms. No third-party game models are included in this directory.

Original high-resolution exports and preparation intermediates are retained outside the game directory. Only the prepared GLBs are requested by the game.

The normal game waits for every required visual role before displaying its title. A failed or incomplete download shows a retry message rather than silently mixing in the previous procedural appearance. Application modules, the manifest and the GLBs share an explicit release query version. The separate `?art=original` developer benchmark intentionally uses procedural art and is not a loading fallback.
