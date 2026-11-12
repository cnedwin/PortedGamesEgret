# JY · 金庸群侠传致敬 Demo

JY 是基于[新白鹭引擎 Egret Rebuild](https://github.com/cnedwin/Egret_rebuild)独立开发的武侠网页游戏 Demo，向《金庸群侠传》、智冠公司和金庸先生致敬。试玩包含地图探索、剧情对白、队友招募、组队战斗和浏览器存档。

JY is an independently developed wuxia browser game demo built with [Egret Rebuild](https://github.com/cnedwin/Egret_rebuild). It pays tribute to *Heroes of Jin Yong*, Soft-World, and Jin Yong. The demo features exploration, story dialogue, companion recruitment, party combat, and browser saves.

## 浏览器完整版 · Full browser game

1. 打开[试玩页](https://cnedwin.github.io/PortedGamesEgret/JY/)。
2. 选择玩家自备的 4in1 `.7z` 压缩包，或选择解压后的 `game` 文件夹。
3. 导入完成后点「进入完整版」。资源和存档保存在当前浏览器，无需安装软件或启动本地服务。

1. Open the [play page](https://cnedwin.github.io/PortedGamesEgret/JY/).
2. Select your own 4in1 `.7z` archive or the extracted `game` folder.
3. Select **进入完整版** after the import finishes. Game data and saves stay in the current browser. No local service or additional software is required.

## 运行与开发 · Run and develop

游戏使用白鹭原生 World3D 和 WebGL2。角色移动、剧情事件、战斗和存档使用同一套游戏状态。项目内的 `web/` 是浏览器客户端，`src/` 是游戏规则，`tools/` 负责本地资源读取和启动。

The game uses Egret World3D and WebGL2. Movement, story events, combat, and saves share the same game state. The browser client lives in `web/`, the game rules in `src/`, and local launch and data tools in `tools/`.

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
