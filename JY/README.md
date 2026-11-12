# JY · 金庸群侠传致敬 Demo

JY 是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的武侠网页游戏 Demo，向《金庸群侠传》、智冠公司和金庸先生致敬。游戏包含地图探索、剧情对白、队友招募、经典回合制战斗和浏览器存档。

JY is an independently developed wuxia browser game demo built with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). It pays tribute to *Heroes of Jin Yong*, Soft-World, and Jin Yong. The game features exploration, story dialogue, companion recruitment, classic turn-based combat, and browser saves.

## 浏览器完整版 · Full browser game

打开[试玩页](https://cnedwin.github.io/PortedGamesEgret/JY/)后，点「进入完整版」即可使用站点提供的数据或当前浏览器已有的数据游玩。首次在线加载时，网页会下载并检查原版游戏数据，完成后自动进入游戏。若站点暂未提供在线数据，可从本机导入自备的 4in1 `.7z` 压缩包或其中的 `game` 文件夹。游戏数据和存档保存在当前浏览器，无需安装软件或启动本地服务。

Open the [play page](https://cnedwin.github.io/PortedGamesEgret/JY/) and select **进入完整版** to play with the hosted data or data already saved in your browser. The first online launch downloads and validates the original game data before opening the game automatically. If the site has no hosted data, import your own 4in1 `.7z` archive or the extracted `game` folder. Game data and saves stay in your browser. No local service or additional software is required.

当前公开部署使用本机导入。

The current public deployment uses local imports.

[原项目的 4in1 资源说明 · Original 4in1 resource information](https://github.com/scarsty/kys-cpp#readme)

## 运行与开发 · Run and develop

游戏使用白鹭原生 World3D 和 WebGL2。角色移动、剧情事件、战斗和存档使用同一套游戏状态。项目内的 `web/` 是浏览器客户端，`src/` 是游戏规则，`tools/` 负责本地资源读取和启动。

The game uses Egret World3D and WebGL2. Movement, story events, combat, and saves share the same game state. The browser client lives in `web/`, the game rules in `src/`, and local launch and data tools in `tools/`.

大地图的远景镜头使用随高度变化的雾效。

The world map overview uses height-dependent haze.

### 部署在线游戏数据 · Deploy hosted game data

使用有公开分发授权的原版运行数据制作 `.7z`，保留 `game/` 顶层目录。原版需要 `game/` 下的配置、资源、事件脚本、音乐、音效、清单和初始存档 `save/0.zip`。把 `data/full-game.json` 放进 JY 的站点部署产物。下面的 `bytes` 必须填入归档文件的实际字节数，可以用 `node -p "require('node:fs').statSync(process.argv[1]).size" path/to/jy-original.7z` 获取。

Build a `.7z` archive from original game data licensed for public distribution, preserving its top-level `game/` directory. Include the runtime configuration, resources, event scripts, music, sound effects, lists, and the initial save `save/0.zip` within `game/`. Publish `data/full-game.json` with the JY site. Set `bytes` to the exact archive size in bytes, which the command above prints.

```json
{
  "version": 1,
  "enabled": true,
  "archive": "./jy-original.7z",
  "bytes": 123456789
}
```

`archive` 可以是相对于清单的路径，也可以是允许本站跨域读取的 HTTPS 地址。归档地址须直接返回文件，无需登录且无需重定向。将 `enabled` 设为 `false` 时，公开站点使用本机导入。

Set `archive` to a path relative to the manifest or a direct HTTPS URL whose CORS policy allows the game site. The URL must return the file without authentication or redirects. Set `enabled` to `false` for a local-import-only deployment.

### 本地试玩 · Local play

使用支持 WebGL2 的浏览器和 Node.js 24 或更新版本。在 `JY/` 目录中运行下列命令，传入你有权使用的 4in1 `game` 目录。

Use a WebGL2 browser and Node.js 24 or later. Run the following command from `JY/` and pass the path to a 4in1 `game` directory you are entitled to use.

```sh
node tools/launch.mjs /path/to/4in1/game --no-browser
```

打开终端显示的本地地址。存档保存在浏览器中，继续游戏时请使用相同的浏览器和地址。

Open the local URL printed in the terminal. Continue with the same browser and URL to access your saves.

### 测试 · Tests

```sh
node --test
```

## 资源与版权 · Assets and credits

游戏相关原作和美术的权利归各自权利人所有。随项目分发的美术、引擎和第三方组件各自保留版权及许可文件。

Rights to the original works and artwork belong to their respective holders. Distributed artwork, engine files, and third-party components retain their copyright and license notices.

[素材来源与许可 · Asset sources and licenses](ASSETS.md)
