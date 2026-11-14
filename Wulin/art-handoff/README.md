# 武林天下美术和界面交接

解压后把 `art-handoff/` 放进 `Wulin/`。从 `Wulin` 目录启动静态服务，例如 `python -m http.server 4173`。打开 `/art-handoff/ui/` 预览界面，打开 `/art-handoff/gallery/` 检查角色。两者都从同一个 `manifest.json` 读取图片，可随项目放进任意静态站点子路径。

## 界面预览入口

- 游戏首页 `/art-handoff/ui/?view=title`
- 选派 `/art-handoff/ui/?view=sects`
- 江湖大地图 `/art-handoff/ui/?view=world`
- 山门 `/art-handoff/ui/?view=seat`
- 弟子 `/art-handoff/ui/?view=disciples`
- 战阵 `/art-handoff/ui/?view=battle`
- 武学 `/art-handoff/ui/?view=arts`
- 纪事 `/art-handoff/ui/?view=chronicle`
- 存档 `/art-handoff/ui/?view=saves`

设置内有修改器入口。弟子名册包含搜索、筛选、单人差事和批量改派。`ui/tokens.css` 提供界面颜色、字体和基础间距，`ui/style.css` 提供页面和组件样式。

## 角色资源

- 12 位掌门沿用游戏数据里的姓名和门派。`leader-<sectId>` 是素材编号。用开局掌门的门派、出处和姓名识别，或写入明确的 `portraitId`。
- 24 位长老与 30 位江湖奇人使用原创提案。造型和命名在 `character-designs.json`。接入角色时保存对应的 `portraitId`。
- 普通弟子按既有姓名与 ID 选用通用立绘。自立门户的掌门、序章角色有专用立绘。晋升或接任不改变人物立绘。
- `full` 适合选派、人物详情和大幅对话。`bust` 适合档案、名册和头像裁切。`expressions` 提供 `happy`、`determined`、`worried`。表情缺省时使用半身像。
- 所有路径以 `manifest.json` 所在目录为基准。WebP 带透明背景，可用 `object-fit: contain`。按页面和角色按需加载。

## 浏览器调用示例

```js
import { loadArt, portraitUrl, artUrl } from './art-handoff/assets.mjs';

const art = await loadArt();
const portrait = portraitUrl(art, person, { view: 'bust', expression: 'determined' });
const seatBackdrop = artUrl(art.assets.seat);
```

调用路径可按模块位置调整。返回 `undefined` 时使用游戏已有的头像。

## 界面对接

| 样板区域 | 现有入口 |
| --- | --- |
| 标题与选派 | `titleView` |
| 顶栏资源和时间控制 | `barView` |
| 山门和据点经营 | `sectView` |
| 弟子名册、筛选和详情 | `peopleView` |
| 江湖沙盘与据点详情 | `worldView` |
| 战斗与观战控件 | `fightSheet`、`hudView` |
| 武学图谱与江湖纪事 | 样板页，后续绑定对应玩法数据 |
| 存档和修改器 | `saveView`、`editorSheet` |

上述入口位于 `../src/main.mjs`。样板用展示数据演示交互。接入时将控件绑定现有行动处理，资源和人物面板改读游戏状态。山门、江湖和战斗的画布占位可接现有 `#stage`，保留 WebGL 交互和文字后备界面。场景插画也可作启动加载画面或静态后备。江湖场景图的山势为美术示意，运行时据点和道路以游戏数据为准。对接存读档、战斗和修改器时沿用现有状态及业务逻辑。

## 素材规格

当前图鉴包括 86 张全身图、86 张半身图、198 张表情图，以及 7 张场景图。共 377 张 WebP。参见 [美术体系](ART-DIRECTION.md)。

美术以硬朗墨线、赛璐璐阴影和矿物色区分身份与门派。场景插画与 UI 文案分层。界面字体和文字在浏览器中渲染，可正常调整字号、换行和触屏。`assets/scenes/scene-prompts.json` 与 `portrait-prompts.json` 记录绘制提示。角色和场景图由内置图像生成工具绘制。
