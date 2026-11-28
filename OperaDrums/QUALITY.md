# 品质验收 · Quality — 锣鼓经 · Opera Drums

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs OperaDrums` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs OperaDrums`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-26
- 浏览器 · Browser: 无头 Chromium 153.0.8010.12，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Linux 容器 · a Linux container, linux x64, Node v22.23.4
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 8 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 达标 · pass | p95 16.8 ms over 241 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.5 s to the first playable screen, 2.9 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "The stage" (focus drawn by the game) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 8 named controls, e.g. button "How to strike", button "Settings", button "Encore challenge" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: opera-drums) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: opera-drums) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 达标 · pass | 3 files refused; no uncaught error; offers to try again |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: 无 · none。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.

## 人工与真机结果 · By hand and on devices

- A1m、S4：由本目录的 `test/accept.mjs` 在无头 Chromium 里覆盖——只用键盘走完标题、设置、选曲、开演、敲击、暂停、继续、结算、回到曲目和延迟校准；存档改坏后标题显示提示并重新开始。没有由人另做，也没有用真读屏。 · Covered by this folder's acceptance script in headless Chromium: the whole game by keyboard, and the notice after a broken save. Not done again by a person, nor with a real screen reader.
- I2：画布上的字是音符上的谱字（中文下是汉字，英文下是拼音）、判定字（好 / 可 / 失 或 Bravo / Good / Miss）、连击和「彩」槽的名字，都取自文字表或谱字表；语言只在标题和暂停菜单里切换，下一首曲子开演时画布上的字按新语言重画。戏台门上的「出将」「入相」是画，不随语言变。没有另做人工检查。 · The canvas words — the syllables (pinyin in English), the judgement, the combo and the gauge — come from the word tables; the language is switched on the title and in the pause menu, and a song started after it draws its words in the new language. The plaques over the doors are part of the picture. Not checked by hand.
- 另量 · Also measured：最密的谱（《急急风》难）演奏中，帧时间 p95 16.7 ms（无头 SwiftShader，1280×800）。 · On the densest chart, 16.7 ms p95 while playing.
- T1、F2、E4：未运行 · not run.


## 2026-11-27 官方主干同步 · Official main integration

- 引擎 · Engine: 94bd70fb26b1f81794c9c6fbbb258c655fcd19df；预发布 CI 候选 b1f275d7 实测，正式副本的运行时代码逐文件哈希核对一致。 · Tested the complete CI candidate, then verified the official runtime payload byte for byte.
- 自动 · Automated: Node 38/38; existing Chromium browser acceptance passed, reviewed screenshot baselines were not overwritten.
- 实机 · Physical devices: Windows Edge 158 / RTX 5090 Laptop GPU; Samsung Fold7 Android 17 / Chrome 157 / Adreno 830, actual trusted mouse/keyboard and touch input through the respective browser control, isolated game saves.
- 代表路线 · Representative route: 选择曲目、校准、实际 F/D 与鼓锣触点、暂停恢复。 · song selection, calibration, real F/D and drum/gong contacts, pause and resume.
- PC: three 180 rAF windows: p95 4.3 → 4.3 ms.
- Fold7: 121/121 rAF: p95/max 16.7/16.7 → 16.7/16.7 ms.
- 手机短路线记录触点两次，不是完整曲目的人工命中成绩；自动验收保留结算和校准。 / Two actual handset contacts, not a human-played full-chart hit score; browser acceptance also covers settlement and calibration.
- 限制 · Limits: 短前台 rAF 不是独立 GPU 时间，也不是整局、所有设备或中端手机验收。未跑真实读屏、物理手柄、Safari 或整局声学测试。 · Short foreground rAF samples are not isolated GPU time or a whole-game/device matrix. No physical screen reader, controller, Safari or speaker/acoustic certification.

## 2026-11-28 WebKit 兼容性 · WebKit compatibility

- 旧公开版因 Web Audio 缺失中断；候选版标题和设置可正常操作；缺少真实音频时说明不可演奏，不伪造节奏时钟或结算。 · The public baseline stopped without Web Audio. Title and settings now work; unsupported hosts explain the limitation and never fabricate a rhythm clock or result.
- Node: 39/39. 候选引擎 · candidate engine: `82561d6338a805f0e0459a2d5d42a284f9385b30`.
- 本机 Windows Playwright WebKit 26.6，iPhone 15 Pro 设备配置（393×659 CSS px，DPR 3），真实浏览器触屏事件，无物理 iPhone；仅首屏和代表性操作，不是整局或实机性能、声学验收。 · Windows Playwright WebKit 26.6, iPhone 15 Pro device profile (393×659 CSS px, DPR 3), actual browser touchscreen events, not a physical iPhone; launch and representative interaction only, not full-session performance or acoustic certification.
- 本轮候选烟测页面异常、控制台错误、HTTP 4xx/5xx 均为 0。 · Candidate smoke: no page exceptions, console errors or HTTP 4xx/5xx.
- [全站记录 · Showcase compatibility record](../docs/SAFARI-WEBKIT-20261128.md)
