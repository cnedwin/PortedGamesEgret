# 品质验收 · Quality — 洗冤笔录 · The Inquest Scrolls

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs InquestScrolls` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs InquestScrolls`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-25
- 浏览器 · Browser: 无头 Chromium 153.0.8010.12，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Linux 容器 · a Linux container, linux x64, Node v22.23.4
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 5 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 达标 · pass | p95 16.8 ms over 241 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 不达标 · fail | 13.9 s to the first playable screen, 2.7 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "The Inquest Scrolls" (focus drawn by the game) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 5 named controls, e.g. button "Begin", button "Cases", button "Settings" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: inquest-scrolls) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: inquest-scrolls) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 达标 · pass | 2 files refused; no uncaught error; offers to try again |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: L1。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.

## 人工与真机结果 · By hand and on devices

- A1m：部分覆盖。`test/accept.mjs` 在无头 Chromium 里用 Enter 从标题走到进案，用 J、N、H、Esc 打开卷宗、笔录、提示和返回；填空那一段脚本用的是鼠标拖放和测试接口，没有只用键盘完整走一遍，也没有由人另做。证物、空位、词签、按钮都在 Tab 焦点列表里（焦点框由游戏画出）。 · Partly covered: Enter, J, N, H and Esc in the acceptance walk; the filling was done by mouse and test hooks, not by keyboard alone, and not by a person.
- S4：同一脚本把存档改坏后重开，游戏记下坏档、另存并重新开始（标题上方的提示文字由代码显示，截图没有逐字核对）。 · The walk breaks the save; the game notes it, sets it aside and starts again (the notice on the title was not checked word by word).
- I2：同一脚本在设置里切到英文，案件画面整屏按英文重建；画布上的字随语言切换。 · The same walk switches to English and the case screen is rebuilt in English.
- 微信小游戏：`test/minigame.mjs` 在引擎的微信替身里（无头 Chromium，390×844）用鼠标当手指走完标题到最后一案的判词，见 README。不是微信开发者工具，也不是手机。 · The mini game walk in the engine's WeChat stand-in, not WeChat DevTools and not a phone.
- 上表保留 2026-11-25 的自动基线。另见下方实机结果。 · The table retains the 2026-11-25 automated baseline. See below for device results.

### 2026-11-26 网页真机回归 · Web device regression

公开基线为 `a564e1d2`，修订版在本机提供，两版的白鹭引擎副本均为 `95897d78`。 · Public baseline `a564e1d2` and locally served fixes, both on Egret `95897d78`.

- Windows Chrome 157、RTX 5090 Laptop GPU，使用 WebGPU。以真实键鼠从新档完成首案的 10 个证物、14 张词签和两页核验，进入第二案查三级提示、写笔录并刷新续档。修订版的首案 8 次点选填词均成功，Shift+Tab、弹窗 Esc、英文标题复测通过。 · On Windows Chrome 157 and RTX 5090 Laptop GPU with WebGPU, mouse and keyboard covered the first case's 10 hotspots, 14 slips and both seals, then second-case hints, notes and resume. Eight click-to-place actions, quick Shift+Tab, modal Escape and the English title passed on the fixes.
- PC 以真实键鼠完成全部六案，共 65 张证物、102 张词签、17 页核验。快速核验后从第四案进入第五案，完成最后判词并看到终卷，刷新保留六案进度。之后单独按公开版报障路径复测笔录，工具栏点按、逐键输入、换行、Tab 离开再点纸面、编辑中刷新和读档均通过。 · Mouse and keyboard completed all six cases, with 65 evidence cards, 102 slips and 17 seals. Quick seals advanced from case four to five, the final verdict reached the ending, and reload retained all progress. The reported public notes path was retested separately on the candidate, including the toolbar, physical key events, line breaks, Tab and mouse re-entry and reload during editing.
- 同一 PC 的首案动态图景采样 525 帧，帧间隔 P95 4.3 ms、最高 8.4 ms。静置卷宗后，公开版 481 次帧回调提交 460 次 WebGPU 队列，修订版 528 次回调提交 0 次。 · On that PC the animated first scene logged 525 intervals at P95 4.3 ms and a maximum of 8.4 ms. The settled dossier went from 460 WebGPU queue submissions over 481 callbacks to zero over 528 callbacks.
- Galaxy Z Fold7（Android 17、Chrome 157、WebGPU）。横屏从开卷读到第一案，竖屏验证单指平移、双指缩放、点词、笔录原生键盘和自动存档。首案两页填词、核验与结案均用实际触点，其余线索预置以重复验证卷宗。首案动态场景 181 帧，P95 和最高帧间隔均为 16.7 ms。中文由系统编辑框接收提交，真人输入法组字未测。 · On the Fold7 in Chrome 157 on Android 17 with WebGPU, landscape reached the first case and portrait covered pan, pinch, evidence, the native notes keyboard and autosave. Touch completed both first-case pages and the closing screen with the remaining evidence seeded. In 181 first-scene intervals, P95 and maximum were both 16.7 ms. Text was committed through the native editor, with manual IME composition untested.
- Fold7 的横屏「开卷」高度从 26.2 增到 45.1 CSS 像素。竖屏「书写」和「合上」均高 48.0 CSS 像素，前者原为 26.3。 · On Fold7, landscape Begin grew from 26.2 to 45.1 CSS px. Portrait Write and Close both measure 48.0 CSS px, with Write previously 26.3.
- Fold7 的软键盘把可见高度压到 487 CSS 像素时，单次点「合上」即可回到现场，文本保留。另复测失焦后点纸面续写和刷新恢复。 · With the Fold7 keyboard open at a 487 CSS px visual viewport, one touch on Close returned to the case and retained the text. Tap-to-resume and reload were checked as well.
- 本轮 Node 测试 28 项、无头浏览器验收 39 项与项目规范检查均通过。 · All 28 Node tests, 39 headless browser checks and the project standard check pass.
- 限制：手机覆盖首案；扬声器听感、实体手柄、微信开发者工具和中端设备性能未验收。 · Mobile coverage is the first case. Speaker playback, a physical controller, WeChat DevTools and mid-range device performance remain unverified.

## 2026-11-28 WebKit 兼容性 · WebKit compatibility

- 候选版等到标题语义就绪时仍显示纯色；一次延迟刷新恢复标题，真实触屏开卷进入序章，静止页面切换也补一次有界刷新。 · The candidate initially retained a solid canvas despite title semantics being ready. One deferred refresh restored the title, and a real touchscreen tap opens the prologue; each static page transition gets one bounded refresh.
- Node: 28/28. 候选引擎 · candidate engine: `82561d6338a805f0e0459a2d5d42a284f9385b30`.
- 本机 Windows Playwright WebKit 26.6，iPhone 15 Pro 设备配置（393×659 CSS px，DPR 3），真实浏览器触屏事件，无物理 iPhone；仅首屏和代表性操作，不是整局或实机性能、声学验收。 · Windows Playwright WebKit 26.6, iPhone 15 Pro device profile (393×659 CSS px, DPR 3), actual browser touchscreen events, not a physical iPhone; launch and representative interaction only, not full-session performance or acoustic certification.
- 本轮候选烟测页面异常、控制台错误、HTTP 4xx/5xx 均为 0。 · Candidate smoke: no page exceptions, console errors or HTTP 4xx/5xx.
- [全站记录 · Showcase compatibility record](../docs/SAFARI-WEBKIT-20261128.md)
