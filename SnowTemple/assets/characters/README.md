# Character art provenance

林冲（`hero`）、陆谦（`lu`）、刀兵（`blade`）、盾兵（`shield`）和弓兵（`bow`）以本项目制作的角色参考图为输入，在已有付费权益的 Tripo Studio 中生成。交付的 GLB 经过本地减面、贴图缩放和蒙皮调整。五名角色沿用项目原有的手部网格、骨架与装备接点。各档模型由 `index.json` 列出。

Lin Chong, Lu Qian, the saber guard, the shield guard, and the archer were generated in Tripo Studio under existing paid entitlements from reference images created for this project. The game assets were simplified, texture-resized, and rebound locally using the existing game rig. The existing hand meshes and equipment attachment points are retained. [Tripo Studio terms, section 5.2.2](https://www.tripo3d.ai/terms)

The local reduction tool was [gltfpack 1.1](https://github.com/zeux/meshoptimizer/releases/tag/v1.1) from the MIT-licensed meshoptimizer release. The game GLBs carry plain glTF geometry and embedded PNG/JPEG textures. The project serves those optimized assets as part of the game demo.
