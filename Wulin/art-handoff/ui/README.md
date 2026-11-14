# 武林天下界面样板

打开 `index.html` 可查看山门。使用静态服务器打开时，界面读取上一级的 `manifest.json`，可完整预览立绘和场景。浏览器直接打开本地文件时，页面使用约定的素材路径。

## 可预览界面

| 页面参数 | 页面 | 对应现有游戏 |
|---|---|---|
| `?view=title` | 标题 | `titleView` |
| `?view=sects` | 十二门派选择 | `titleView` 内门派选择 |
| `?view=seat` | 山门与建筑管理 | `sectView`、山门 `#stage` |
| `?view=disciples` | 弟子表、筛选和批量改派 | `peopleView` |
| `?view=world` | 舆图、据点、关系和出兵 | `worldView` |
| `?view=battle` | 战斗镜头与指令 | `hudView`、`fightSheet` |
| `?view=chronicle` | 纪事 | `logView` |
| `?view=saves` | 存档、导入、导出 | `saveView` |
| `?view=arts` | 武学名录 | 使用现有 `ARTS` 的独立展示 |

设置内可以打开修改器，也可连按两次 F8 或连续点击顶栏日期五次。江湖页的奇遇弹窗用宋折汐示范人物事件。批量改派与奇遇按钮的行为为样板逻辑。

## 接入方式

- `tokens.css` 提供底色、文字、强调色、边框和字体。`style.css` 提供各页面布局与通用控件，包含窄屏底部导航。
- `app.js` 中的 `*Screen` 函数可作为现有 `src/main.mjs` 页面结构的参考。对接时以现有 `src/core` 的规则与存档为准。样板的按钮使用 `data-act` 事件代理。
- 山门、战斗和地图的 `.scene-image` 使用静态构图作演示。实际山门和战斗可在对应位置使用已有 3D 画布，保留叠加的 HUD、标签、操作区和替代文字面板。地图道路与位置取自现有据点数据。
- 门派卡片、列表和战斗队伍使用 `bust`，全身人物选派与奇遇使用 `full`。掌门示例以 `leader-{sectId}` 找图，长老、奇人使用清单中的人物 ID。
- 样板的本地存档键是 `wulin-art-preview-v1`。原游戏继续使用自己的存档系统。`preview-data.js` 是独立预览所用的数据快照。
