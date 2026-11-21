# 品质验收 · Quality — 镇邪司 · Night Wardens

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs NightWardens` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs NightWardens`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-21
- 浏览器 · Browser: 无头 Chromium 153.0.8010.12，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Linux 容器 · a Linux container, linux x64, Node v22.23.5
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 3 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 达标 · pass | p95 16.8 ms over 237 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.5 s to the first playable screen, 2.1 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "Night Wardens" (focus drawn by the game) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 3 named controls, e.g. button "Stand watch", button "Settings", button "Switch to Chinese" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: night-wardens) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: night-wardens) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 不适用 · n/a | the game loads no image, sound, font or data file |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: 无 · none。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.

## 人工与真机结果 · By hand and on devices

- A1m、S4：由本目录的 `test/accept.mjs` 在无头 Chromium 里覆盖——只用键盘走完标题、选夜、守城（方向键移动、暂停与继续、按 2 选符法、空格放天雷）、结算和切换英文；存档改坏后标题显示提示并重新开始。没有由人另做，也没有用真读屏。 · Covered by this folder's acceptance script in headless Chromium: the title, the nights, the watch (arrows, pause and resume, "2" for a ward, Space for thunder), the end and English, by keyboard alone; and the notice after a broken save. Not done again by a person, nor with a real screen reader.
- I2：画布上的字（夜名、等级、首领名、符法卡片、结算）全部取自文字表，`test/words.test.mjs` 检查界面代码里没有写死的中文；切到英文后在验收脚本里看过结算画面。路面上画进图里的招牌字（當、茶、酒……）和白无常帽上的「一見生財」是画，不随语言变。没有另做人工检查。 · Every word on the canvas comes from the word table, and `test/words.test.mjs` checks the interface code holds no Chinese of its own; the end screen was looked at in English in the acceptance run. Shop signs painted into the market road and the words on White Impermanence's hat are pictures and do not change with the language. Not checked again by hand.
- 最忙的场景 · The busiest scene：验收脚本把第一夜快进到首领将至（190 秒，满屏邪祟、符箭和粒子），量 4 秒：p95 33.4 ms，205 帧（竖屏 540×960，SwiftShader 软件渲染，2 核容器）。在第三夜 190 秒（十几个邪祟、二十支符箭）另量的结果：最初 p50 66.6 ms、p95 83.4 ms；路面、城墙和暗角改由页面画一次（`#road` 的 CSS 背景）后 p50 33.3 ms；再去掉与帧图重复的影子位图后 p50 16.7 ms。没有在真显卡或手机上量过。 · The acceptance run plays night one forward to the warden's eve (190 s, the road full of haunts, bolts and particles) and measures four seconds: p95 33.4 ms over 205 frames (tall 540 × 960, SwiftShader, a two-core container). Measured apart on night three at 190 s (a dozen haunts, twenty bolts): at first p50 66.6 ms and p95 83.4 ms; with the road, wall and dark edge drawn once by the page (#road's CSS background), p50 33.3 ms; with the shadow bitmaps that repeated the frames' own shadows gone, p50 16.7 ms. Not measured on a real GPU or phone.
- F1 的波动 · F1 varies：这台 2 核容器上同一画面连测几次，p95 在 16.8 ms 和 33.3 ms 之间来回（模板 `templates/egret-game` 的标题画面同样如此，帧数 214–233 / 240）。本次写入的是 16.8 ms。 · On this two-core container the same screen measures p95 16.8 ms or 33.3 ms from run to run, as does the template's own title (214–233 of 240 frames); this file records the 16.8 ms run.
- T1、F2、E4：未运行 · not run.
