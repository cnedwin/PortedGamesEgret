# 品质验收 · Quality — 沙画江山 · Sand Scroll

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs SandScroll` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs SandScroll`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-23
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
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 达标 · pass | p95 16.7 ms over 238 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.5 s to the first playable screen, 2.0 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "Sand Scroll" (focus drawn by the game) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 5 named controls, e.g. button "Paint", button "Unpaint", button "Endless tray" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: sand-scroll) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: sand-scroll) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 不适用 · n/a | the game loads no image, sound, font or data file |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: 无 · none。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.

## 人工与真机结果 · By hand and on devices

- A1m、S4：由本目录的 `test/accept.mjs` 在无头 Chromium 里覆盖——只用键盘走完标题、设置、一局和结算，存档改坏后标题显示提示并重新开始。没有由人另做，也没有用真读屏。 · Covered by this folder's acceptance script in headless Chromium: the whole path by keyboard, and the notice after a broken save. Not done again by a person, nor with a real screen reader.
- T1、F2、E4、I2：未运行 · not run.

## UI、声音与「今日试笔」复测 · UI, audio and Daily Scroll retest

上述表格保留早期软件渲染基线。以下为本地候选版实测。 · The table above is the earlier software-rendered baseline. The results below are from the local candidate.

| 环境 · Environment | 实测 · Observed |
|---|---|
| Windows PC、Edge 158、WebGPU | 鼠标拖放三块完成首次消除，4,800 分，画卷进度 10%。验证拖出取消、暂停及恢复、拆画上桶、进入今日试笔。同段作画 1,050 个浏览器帧间隔，p95 4.3 ms，最大 29.1 ms。 · Three mouse drops cleared the first run for 4,800 points and 10% painted. Also verified cancelled drags, pause and resume, boarding buckets and entering Daily Scroll. During the paint sample, 1,050 browser frame intervals had a 4.3 ms p95 and a 29.1 ms maximum. |
| Samsung Galaxy Z Fold7、Android 17、Chrome 157、WebGPU | 横屏以自动触控完成落沙、触点取消、暂停恢复、点沙桶上带和收沙。修复前底图与沙盘相差约 74 CSS px，修复后小于 0.02 CSS px。拆画短样本 89 个浏览器帧间隔，p95 16.6 ms，最大 16.7 ms。 · On the actual phone, injected touch covered placement, cancellation, pause and resume, boarding a bucket and collecting sand. The art-to-stage horizontal offset fell from about 74 CSS px to under 0.02 CSS px. The short Unpaint sample had 89 browser frame intervals, 16.6 ms p95 and a 16.7 ms maximum. |
| Edge 浏览器数字音频 · Edge digital audio | 作画、拆画和桶音效有输出，暂停、静音和回到卷首后归零，继续和解除静音后恢复。另测三段循环接点、音效并发上限和迟到音轨清理。 · Paint, Unpaint and bucket cues produced output. Pause, mute and return to title reached silence. Resume and unmute restored output. Loop seams, the voice limit and late track cancellation were checked separately. |
| Node 26、Chromium + SwiftShader | 35 项单测和 23 项浏览器验收。每日模式另测时区一致、暂停重开、结算重试及旧档兼容。 · 35 unit tests and 23 browser checks. Daily Scroll was also checked for identical starts across time zones, restart, replay and compatibility with existing saves. |

Fold7 另用 14 次有效落块完成一局「今日试笔」的失败结算，确认独立记录写入。PC 竖屏使用触屏模拟，Fold7 触控由测试工具在实体设备上派发。帧间隔来自浏览器 rAF。真机扬声器听感、手机竖屏和全关卡通关未覆盖。 · On the Fold7, 14 valid drops took a Daily Scroll run to its loss screen and saved a separate record. Portrait was checked using desktop touch emulation. Fold7 input was dispatched on the physical device. Intervals are from browser rAF. Speaker listening, phone portrait and a full campaign completion are pending.

## 连续落块与转屏复测 · Rapid placement and rotation retest

- Windows PC、Edge 158、WebGPU。键盘连续投放三块，首块仍在空中时暂停并将窗口从横屏切到竖屏。计时和首块位置保持，继续后三块按顺序落下。拆画也验证了上桶后暂停、调整窗口方向并继续。 · In headed Edge, keyboard input queued three drops. Resizing a paused round preserved its clock and first piece. All three landed after resuming. Unpaint kept an active bucket across the same pause and resize sequence.
- Galaxy Z Fold7、Android 17、Chrome 157、WebGPU。用自动触控连续落块并暂停，从 873 × 325 CSS px 横屏实机转为 411 × 813 竖屏。同一局的计时及空中积木位置保持不动，继续后依次落在第 12、74、126 列。重复拖放没有覆盖等待中的积木。暂停和爆竹的横屏触控高度约 45.8 CSS px，近边缘点按生效。 · Injected touches and native rotation on the Fold7 preserved the same round, clock and falling piece. The three drops landed at columns 12, 74 and 126. The extra gesture left the queue intact. Landscape action buttons had roughly 45.8 CSS px of hit height and responded to taps near their edges.
- Fold7 作画短样本共 89 个浏览器帧间隔，p95 16.6 ms，最大 16.7 ms。 · A short Fold7 Paint sample of 89 browser frame intervals had a 16.6 ms p95 and a 16.7 ms maximum.
- 浏览器另用作画与拆画的已完成状态验证了结算前暂停、切换方向及继续。切换后保留原局和剩余倒计时。数字音频在暂停期间为零，重建音频设备后点继续会从曲目开头播放。 · A browser fixture finished both modes and paused and reoriented the game before the result was shown. The round and countdown persisted. Digital output stayed silent during pause. Music restarts on resume if reorientation rebuilt the audio device.

## 2026-11-28 WebKit 兼容性 · WebKit compatibility

- 旧公开版因 Web Audio 缺失中断；候选版静音启动、标题可见，真实触屏「作画」进入选卷。 · The public baseline stopped without Web Audio. The candidate starts silently and a real touchscreen tap opens painting selection.
- Node: 36/36. 候选引擎 · candidate engine: `82561d6338a805f0e0459a2d5d42a284f9385b30`.
- 本机 Windows Playwright WebKit 26.6，iPhone 15 Pro 设备配置（393×659 CSS px，DPR 3），真实浏览器触屏事件，无物理 iPhone；仅首屏和代表性操作，不是整局或实机性能、声学验收。 · Windows Playwright WebKit 26.6, iPhone 15 Pro device profile (393×659 CSS px, DPR 3), actual browser touchscreen events, not a physical iPhone; launch and representative interaction only, not full-session performance or acoustic certification.
- 本轮候选烟测页面异常、控制台错误、HTTP 4xx/5xx 均为 0。 · Candidate smoke: no page exceptions, console errors or HTTP 4xx/5xx.
- [全站记录 · Showcase compatibility record](../docs/SAFARI-WEBKIT-20261128.md)
