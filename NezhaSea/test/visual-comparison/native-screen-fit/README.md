# 多屏验收证据 · Screen verification evidence

同一冻结版运行文件的官方屏幕检查。红带表示引擎注入的模拟安全区（非真实刘海）。每张联系图按照以下顺序从左到右排列：

- 第一排 / top: phone-small 375×667, phone-notch 393×852, phone-notch-wide 852×393, phone-tall 360×800
- 第二排 / bottom: tablet 768×1024, tablet-wide 1024×768, foldable 884×1104, desktop 1920×1080

All contact sheets come from actual checker screenshots, not generated mockups. Red marks are simulated covered areas. Order is shown above.

| 界面 · State | 旧源码 · Old source | 新中文 · Final Chinese | 新英文 · Final English |
|---|---|---|---|
| 标题 · Title | [baseline](baseline-title.jpg) | [zh](zh-title.jpg) | [en](en-title.jpg) |
| 战斗 · Battle | [baseline](baseline-battle.jpg) | [zh](zh-battle.jpg) | [en](en-battle.jpg) |
| 集市 · Market | [baseline](baseline-shop.jpg) | [zh](zh-shop.jpg) | [en](en-shop.jpg) |
| 确认 · Confirm | [baseline](baseline-confirm.jpg) | [zh](zh-confirm.jpg) | [en](en-confirm.jpg) |
| 暂停 · Pause | [baseline](baseline-pause.jpg) | [zh](zh-pause.jpg) | [en](en-pause.jpg) |

[平板实际操作三图 · Tablet interaction sequence](tablet-market-journey.jpg) · [正式入口八屏 · Direct entry](direct-title.jpg) · [各屏原生检查汇总 · Per-screen native findings](summary.json)

旧源码 40/40、7 条 fills 警告；最终双语 80/80、0 错误、0 警告。普通测试场景的确认在中英文与可用宽度间会选用引擎原生 confirm 或同一引擎的换行视图。联系图经过缩小以减少包体；逐张原始截图由 test/verify-screens.mjs 复跑输出。

The old source passes 40/40 with seven fill warnings. The final bilingual run passes 80/80 without errors or warnings. Confirmation uses the native default or a wrapped Egret view depending on text width. Individual full-resolution screenshots can be reproduced with the script; these smaller sheets keep evidence portable.
