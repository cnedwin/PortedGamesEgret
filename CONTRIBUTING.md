# 参与维护 · Contributing

欢迎提交问题、讨论和代码贡献。报告问题时请注明游戏目录、浏览器、触发步骤和预期结果。涉及画面或性能的问题可附截图及设备信息。

Bug reports, discussions, and pull requests are welcome. For a bug, include the game folder, browser, steps to reproduce, and expected result. Screenshots and device details can help with rendering or performance issues.

提交改动时，把游戏代码、资源、文档和测试放在对应游戏目录。改动玩法或渲染时，请在 PR 中写明如何复跑。新增素材请附来源和适用的版权声明。

Keep game code, assets, documentation, and tests in the relevant game folder. For gameplay or rendering changes, include verification steps in your pull request. Include the source and applicable copyright notices for any new assets.

展示站（仓库根目录的 `index.html` 与 `showcase/`）列出了每个游戏。新增或大改一个游戏时，请同步更新 `showcase/games.js` 里的名称、介绍和资料，并把封面与截图放进 `showcase/media/<游戏 id>/`（WebP，宽度不超过 1600 像素）。

The showcase site (`index.html` and `showcase/` at the repository root) lists every game. When adding a game or changing one substantially, update its names, introduction and facts in `showcase/games.js`, and put its cover and screenshots in `showcase/media/<game id>/` (WebP, at most 1600 pixels wide).

## 工程标准 · Game project standard

每个游戏目录按 [docs/GAME-STANDARD.md](docs/GAME-STANDARD.md) 组织：README 的九节、ENGINE-NOTES、QUALITY、Node 测试、浏览器验收和截图基线、引擎副本。新游戏用 `npm run create -- <目录名> --title "中文名 · English name"` 从模板开始；`node tools/check-standard.mjs` 检查全部游戏，现状见 [docs/STANDARD-STATUS.md](docs/STANDARD-STATUS.md)。

Every game folder follows [docs/GAME-STANDARD.md](docs/GAME-STANDARD.md): the nine README sections, ENGINE-NOTES,
QUALITY, Node tests, browser acceptance with screenshot baselines, and the engine copy. Start a new game from the
template with `npm run create -- <folder> --title "中文名 · English name"`; `node tools/check-standard.mjs` checks every
game, and [docs/STANDARD-STATUS.md](docs/STANDARD-STATUS.md) shows where each one stands.
