# 参与维护 · Contributing

欢迎提交问题、讨论和代码贡献。报告问题时请注明游戏目录、浏览器、触发步骤和预期结果。涉及画面或性能的问题可附截图及设备信息。

Bug reports, discussions, and pull requests are welcome. For a bug, include the game folder, browser, steps to reproduce, and expected result. Screenshots and device details can help with rendering or performance issues.

提交改动时，把游戏代码、资源、文档和测试放在对应游戏目录。改动玩法或渲染时，请在 PR 中写明如何复跑。新增素材请附来源和适用的版权声明。

Keep game code, assets, documentation, and tests in the relevant game folder. For gameplay or rendering changes, include verification steps in your pull request. Include the source and applicable copyright notices for any new assets.

展示站从 `showcase/games.js` 读取案例。新增游戏时，在文件里加一条记录，填写中英文标题、简介、2D 或 3D 分类，以及至少三项能从游戏源码核实的引擎能力。把一张实机封面和两张场景截图放进 `showcase/media/<游戏 id>/`，文件名为 `cover.webp`、`detail-1.webp`、`detail-2.webp`（宽度不超过 1600 像素），再给每张图写中英文说明。首页和详情页会自动纳入该案例。

The showcase reads its catalog from `showcase/games.js`. Add an entry with Chinese and English titles and summaries, a 2D or 3D category, and at least three engine capabilities with links to their implementation files. Put the gameplay cover and two scene captures in `showcase/media/<game id>/` as `cover.webp`, `detail-1.webp` and `detail-2.webp` (at most 1600 pixels wide), and write a caption in both languages for each. The directory and case page use this entry automatically.

提交前运行 `npm run check:showcase` 检查案例、源码路径、能力矩阵和图片。 Run `npm run check:showcase` to verify the catalog, source paths, matrix and images.

## 工程标准 · Game project standard

每个游戏目录按 [docs/GAME-STANDARD.md](docs/GAME-STANDARD.md) 组织：README 的九节、ENGINE-NOTES、QUALITY、Node 测试、浏览器验收和截图基线、引擎副本。新游戏用 `npm run create -- <目录名> --title "中文名 · English name"` 从模板开始；`node tools/check-standard.mjs` 检查全部游戏，现状见 [docs/STANDARD-STATUS.md](docs/STANDARD-STATUS.md)。

Every game folder follows [docs/GAME-STANDARD.md](docs/GAME-STANDARD.md): the nine README sections, ENGINE-NOTES,
QUALITY, Node tests, browser acceptance with screenshot baselines, and the engine copy. Start a new game from the
template with `npm run create -- <folder> --title "中文名 · English name"`; `node tools/check-standard.mjs` checks every
game, and [docs/STANDARD-STATUS.md](docs/STANDARD-STATUS.md) shows where each one stands.
