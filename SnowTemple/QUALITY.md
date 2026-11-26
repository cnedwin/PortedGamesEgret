# 品质验收 · Quality — Snow at the Mountain Temple · 风雪山神庙

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs SnowTemple` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs SnowTemple`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 2026-11-26：引擎 `8e70dcb3` 实机回归 · Engine refresh on physical devices

官方引擎工具生成 306 个文件，逻辑、数值、模型、动画、音频与原主干一致。适配原生自动实例化预热，去掉已不需要的特定硬件阴影禁用，保留有效像素比的动态调节及旧档读取容错。Node 回归 92/92 通过。 · The official vendor tool generated 306 files. Rules, balance, models, animation and audio are unchanged. Auto-instancing program preparation uses the native option, the obsolete adapter-specific shadow disable is removed, and effective render-density control and legacy-save fallback are retained. All 92 Node tests passed.

### 实际 PC · Physical PC

Windows Edge 158.0.4370.33、RTX 5090 Laptop GPU (ANGLE/D3D11)、WebGL2，实际浏览器键鼠事件。新档从标题和雪路打到草料场两波、山门、陆谦两阶段，结算甲等，未倒地；完整流程、设置按键取消/Tab、暂停、性能读数、重战及刷新读档通过。实时阴影开启、没有上下文丢失，五个高档角色均加载成功且无错误。正常获得的 `open:2` 和第一重甲等记录在刷新后保留。 · Real Windows Edge with hardware WebGL2 and browser keyboard/mouse input completed the chapter. Settings, pause, performance readout, rematch and reload passed. Shadows remained enabled, the WebGL context remained valid and all five high-detail characters loaded. The naturally earned second tier and first-tier A mark survive reload.

| 场景 · Scene | P95 帧间隔 · Frame interval | Max |
| --- | ---: | ---: |
| 雪路开场动画 · Road cinematic | 8.2 ms | 25.1 ms |
| 雪路操作 · Road | 4.3 ms | 111.3 ms |
| 草料场 · Yard | 4.4 ms | 72.7 ms |
| 山门 · Gate | 8.3 ms | 9.0 ms |
| 首领第一阶段 · Boss I | 8.3 ms | 8.7 ms |
| 首领第二阶段 · Boss II | 8.3 ms | 10.7 ms |

PC 为高刷新率浏览器帧间隔，不等价于显示器真实呈现或 GPU 独立耗时。3.90 秒标题就绪；雪路与草料场仍有少量长帧，不能据此宣布启动卡顿完全消失。音乐层与场景对白媒体事件通过监测，未做人耳听感验收。 · PC intervals are high-refresh browser callbacks rather than measured presentation or isolated GPU time. Title ready in 3.90 s. Occasional long road/yard frames remain. Music and dialogue media events were observed; no subjective speaker listening.

雪路 111.3 ms 与一条 112.4 ms 浏览器长动画帧对齐，发生于设置操作之前；该记录无归因脚本或主线程阻塞，不能区分 GPU、音频、引擎提交或浏览器调度。草料场 72.7 ms 发生在奖励选择面板，详细追踪已结束，两者保留为后续专项复现。 · The 111.3 ms road interval aligned with a 112.4 ms browser long-animation frame before settings interaction, with no attributed script or blocking; cause remains unresolved. The 72.7 ms yard interval coincided with the reward modal outside the detailed trace window. Neither has a proven engine or application cause.

### Galaxy Z Fold7 实机 · Galaxy Z Fold7 physical device

Android 17、Chrome 157、WebGL2，873×325 CSS 横屏，DPR 2.625，实际 GL 画布 1091×406；实时阴影、分块灯光均开启。使用 CDP 真机触控，从开场正常打完整章，结算甲等 1:30，弹反 5、回马枪 9、倒地 0。重战后实际战败，演出正常；独立静音恢复、八段对白媒体事件、变幅摇杆、进度与设置刷新读回均通过。508/508 资源指纹匹配、零页面或加载错误。 · Automated CDP touch on the physical Fold7 completed the normal chapter, earned grade A in 1:30, verified rematch and defeat, independent mute, eight dialogue events, stick amplitude and progress/settings reload. All 508 expected resource fingerprints matched; no page or load errors.

| 场景 · Scene | P95 帧间隔 · Frame interval | Max | 样本 · Samples |
| --- | ---: | ---: | ---: |
| 雪路 · Road | 17.3 ms | 19.2 ms | 808 |
| 草料场 · Yard | 17.2 ms | 37.0 ms | 1814 |
| 山门 · Gate | 17.4 ms | 26.0 ms | 316 |
| 首领第一阶段 · Boss I | 17.2 ms | 22.4 ms | 1193 |
| 首领第二阶段 · Boss II | 17.3 ms | 21.9 ms | 1125 |

实测章节样本内没有超过 50 ms 的帧间隔。手机测试环境、方向和连接已恢复；不把自动注入触摸称为真人操作，也未覆盖低端手机、多种硬件或扬声器实听。 · No interval over 50 ms in the recorded chapter. Test-device settings and connections were restored. This is physical-device automation, not human-finger or speaker acceptance, nor broad hardware qualification.

### 可重复浏览器验收 · Repeatable browser acceptance

新增 `node test/accept.mjs`：固定种子 7、低档画质和模型、640×360 无头 Chromium／SwiftShader，验证标题与两个入口、实际点选章节、角色进入雪路及开场游戏时钟推进。初次截图生成和不带 `--update` 的复跑均 7/7，零页面或 HTTP 错误；审核过的标题截图基线差异 0.77%。这是自动冒烟检查，不替代上面的实机完整章节。 · Fixed-seed, low-detail headless smoke: title and entry controls, a trusted Chapter click and advancing opening clock. Both capture and normal runs passed 7/7, with no errors and 0.77% screenshot difference. This does not substitute for the physical-device chapter runs.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-21
- 浏览器 · Browser: 无头 Chromium 153.0.8010.12，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Linux 容器 · a Linux container, linux x64, Node v22.23.4
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 不达标 · fail | 3 of 12 under 44×44: 行囊0B 85×35; 全屏 64×35; 设置 64×35 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 不达标 · fail | p95 2233.2 ms over 5 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.6 s to the first playable screen, 3.1 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 不达标 · fail | no way to choose English found |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 不达标 · fail | cut off: 风雪山神庙 |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "风雪山神庙：俯视角动作游戏。W A S D 移动，左键出枪，" (focus drawn by the game) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 5 named controls, e.g. button "行囊 0 B", button "踏雪上路", button "守草料场 一拨接一拨，倒下为止" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 不适用 · n/a | the game keeps nothing in browser storage |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 不适用 · n/a | the game keeps nothing in browser storage |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 不达标 · fail | 9 files refused; no uncaught error; no error screen with a retry |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: T2, F1, I1, I3, E2。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.
