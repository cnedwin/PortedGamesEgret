# Station visual assets

The GLB models in this directory were generated with Tripo Studio for Operation Cutoff and prepared for Egret World3D. They include embedded textures, reduced geometry and corrections for the game's visual attachment points.

`index.json` maps a visual role to a file. Several compatible roles share a file. Each character uses its complete continuous surface, original UVs and PBR maps. The game binds a sixteen-bone Egret skin and drives it with its existing procedural motion and falling simulation; these static source models do not contain motion capture. First-person entries keep separate reload and recoil pivots. Repeated scene props use shared geometry and instanced draws.

Each complete figure and weapon uses one uniform scale across its visual parts. Joint offsets, sights, magazines and handles use the same authored coordinates. Whole props preserve their aspect ratios. Long containers and cover repeat their original centre panels; architectural reliefs repeat at a fixed scale around actual door openings. Geometry preparation preserves the source UVs, normals and PBR slots instead of reprojecting colour onto an aggressively reduced mesh.

Hard-surface preparation in this batch limits geometric simplification error to 0.003. Face counts vary with the shape. Check native PBR close views and face/normal agreement when replacing these assets; intact UVs alone do not prove that the shape survived reduction.

Detailed visible meshes remain intact in both the main view and wet-ground reflections. Rigid models cast source-fitted depth silhouettes shared through native shadow passes; continuous character skins keep their original shadows. The depth silhouettes follow the same pivots and instance matrices, use no colour textures and stay out of camera and mirror layers. `?modelShadows=full` selects full caster geometry for diagnostic comparison.

The generated art is separate from the engine runtime's Apache-2.0 license. Distribution of these model files is subject to the applicable Tripo account and output terms. No third-party game models are included in this directory.

Original high-resolution exports and preparation intermediates are retained outside the game directory. Only the prepared GLBs are requested by the game.

The normal game waits for every required visual role before displaying its title. A failed or incomplete download shows a retry message rather than silently mixing in the previous procedural appearance. Application modules, the manifest and the GLBs share an explicit release query version. The separate `?art=original` developer benchmark intentionally uses procedural art and is not a loading fallback.

## Environment art · 场景美术（2026-11-28）

The seven environment GLBs are project-authored Tripo v3.1 outputs: broadleaf oak, fir, bunk bed, archive shelving, workbench, desktop accessories and worker locker. Original near geometry and embedded PBR material channels are retained; textures are locally resized (base ≤ 1024, normal ≤ 768, ORM ≤ 512); oak/fir base-colour maps are separately graded to a muted wet-woodland palette with the original alpha and other binary channels unchanged. The 45 far tree instances use three masked planes baked from the **same Tripo model** in `TreeFar`; the eight playable-area tree instances use the full `TreeNear` geometry. Both share a grounded frame. The source roles are required in the normal game; only the explicit original-art diagnostic uses the previous procedural trees. The complete new asset set is 9,268,700 bytes versus 56,101,880 raw bytes (83.5% size reduction), with no external texture fetches. See [scene-art-provenance.json](scene-art-provenance.json) for generation/task IDs, geometry, dimensions, texture and binary hashes.

本组七项为项目自制 Tripo v3.1 模型：阔叶树、杉树、双层床、档案架、工作台、桌面电脑组合及储物柜。近景几何保持原生成数据，PBR 三类贴图本地压缩；树木仅对底色贴图做自然色调调整，原透明度、几何、法线及 ORM 数据保持不变。近处八棵用完整模型，外侧四十五棵用同一模型烘焙的近似轮廓，保留原位置、尺寸、投影及反射。七个发布 GLB 共 9,268,700 字节，约比 56,101,880 字节原导出减少 83.5%，所有贴图内嵌。正常启动必须完整加载新美术，失败进入重试，不暗中显示旧程序化模型。本组使用适用的 Tripo 输出授权，独立于引擎许可；具体生成来源与校验见上述 JSON。
