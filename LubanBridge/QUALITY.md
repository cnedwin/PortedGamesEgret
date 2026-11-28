# 品质验收 · Quality — 鲁班造桥 · Luban's Bridges

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs LubanBridge --no-write --json` 实际测量；实机项只据实际设备记录。 · Checked against the checklist, with actual automated and physical-device evidence kept separate.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-26.
- 自动项：Windows，Node 24.22.3，桌面 Chrome / 无头 Chromium + SwiftShader。帧间隔是浏览器 rAF，并非 GPU/白鹭提交用时。 · Automated: Windows, Node 24.22.3 and headless Chromium with SwiftShader; frame intervals are browser rAF, not GPU or Egret submission timings.
- 首屏限速：10/5 Mbps、40 ms RTT、CPU ×4。 · Start-up throttling: 10/5 Mbps, 40 ms RTT, CPU ×4.
- PC 真机：RTX 5090 Laptop，真实 Chrome，独立浏览器测试会话。Fold7 真机：SM-F966U1，Android 17，Chrome 157 / WebGPU，实际设备 CDP 触控，非尺寸模拟；横屏 873×325、竖屏 411×813 CSS px。 · Physical PC and physical Fold7; trusted injected input on the handset, not mobile emulation.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 达标 · pass | Fold7 first level by actual touch in both orientations, 3 seals, save and reload; other 24 levels not manually played |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 5 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 达标 · pass | p95 4.3 ms over 958 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run | Flagship Fold7: crossing rAF P95 16.7 ms (both); mid-range device not tested |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.1 s to the first playable screen, 2.5 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang "en", no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "造桥工地" (focus drawn by the game) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 5 named controls, e.g. button "开工", button "选关", button "沙盒" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: luban-bridge) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: luban-bridge) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 达标 · pass | 1 files refused; no uncaught error; offers to try again |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项 · Automatic: 16/16 passed, no automatic failures.

## 人工与真机结果 · By hand and on devices

- Node 规则、存档、音频与引擎副本共 44/44。浏览器 23/23，标题、工地和竖屏三张基线 0% 差异；装饰图片故障下的重试和直接开工均通过，立即退出结算印章动画无 OBJECT_DISPOSED。 · 44 Node tests and 23 browser checks passed, all three screenshots matched, retry/playable fallback and immediate departure from animated results passed.
- PC 旧版与候选：同一条 1-1 路线真实鼠标拖成五根杆件、撤销重做、78 两三印、读档。旧版离开结算发生 OBJECT_DISPOSED，新版零页面错误。试通过程 rAF P95 旧 4.3 ms、新 4.3 ms；约 12.1 s 完成；旧采样无 >50 ms，最终候选约 2899 个间隔中 1 个 >50 ms（未归因为引擎）。 · Same PC route before/after. Browser frame P95 unchanged at 4.3 ms; one >50 ms interval in the last candidate sample, cause unassigned. No direct GPU-timing inference.
- Fold7 横屏旧版 9/9，第一关 P95 16.7 ms / max 29.9 ms，60.06 FPS，0 >50 ms。最终候选 15/15，P95 16.7 / max 29.6 ms，60.06 FPS，0 >50 ms。竖屏完整 14/14，P95 16.7 / max 16.8 ms，60.32 FPS，0 >50 ms。均是真实手机浏览器 rAF 采样，不是整个长局的 GPU 追踪。 · The physical phone's sampled crossing intervals remained near 60 FPS, with no >50 ms interval in these windows.
- Fold7 横屏原控件高约 18–26 CSS px，现约 45.14；竖屏约 49.09。设定面板清除进度和关闭原有轻微重叠，修复后竖屏实际间距 +6.85 CSS px（专项 6/6）。横竖屏实际触控、长按、保存与读档；尚未真人手指和实体手柄操作。 · Touch target and spacing checks passed on the handset; injected touch is not manual finger play.
- 数字音频：Fold7 音乐关采样峰值 0，开有非零输出，12 秒循环流水环境声与实际操作效果音启动正常，音效与音乐独立控制。未由扬声器实听；E4 后台回来声音和计时未做完整实机专项。 · Digital output, not an acoustic listening test. Full background/resume on-device E4 remains untested.
- PC 和 Fold7 只完整实玩 1-1；另外五章名桥用于画面预览，全部 25 关参考解与失败解均是 Node 验证，未模拟称为真机全关。 · All 25 references/failures tested by Node, not manual completion of all levels.
- 微信：Windows 原始引擎导出器在旧版、候选均因盘符绝对入口路径误判为裸模块失败。临时验收 loader 仅放行 `args.kind === 'entry-point'` 后可导出主包约 2.59 MB；最终候选导出无 refused / warnings，844×390 微信替身 8/8（原创封面和场景树木 ready、第一关搭建试通、微信存储、DOM 隔离）；引擎仓库未修改。替身 on-demand 空闲截图会黑，旧、新均复现；连续 invalidate 时可见，不能据此认定真实微信设备黑屏。 · Original Windows exporter fails equally on old and new source. A scratch entry-point bypass yields a single ~2.59 MB package, with no refused entries/warnings. The current tracked 844×390 stand-in test passed 8/8 (images, drag, crossing, save and DOM isolation). The stand-in has a pre-existing idle on-demand screenshot limitation; native WeChat remains untested.
- I2、A1m、S4 只部分覆盖或未进行独立人工检查；早期软件渲染试通性能数字见 ENGINE-NOTES 第 4 条，不与本次真机样本混作对比。 · Manual full keyboard, all canvas-language review and save notice review are not claimed as complete.

## 2026-11-28 WebKit 兼容性 · WebKit compatibility

- 旧公开版标题文字不可见；候选版恢复清晰标题和控件，真实触屏开工进入小河关。 · The public baseline had invisible title labels. Candidate title and controls are visible; a real touchscreen tap enters the first bridge.
- Node: 44/44. 候选引擎 · candidate engine: `82561d6338a805f0e0459a2d5d42a284f9385b30`.
- 本机 Windows Playwright WebKit 26.6，iPhone 15 Pro 设备配置（393×659 CSS px，DPR 3），真实浏览器触屏事件，无物理 iPhone；仅首屏和代表性操作，不是整局或实机性能、声学验收。 · Windows Playwright WebKit 26.6, iPhone 15 Pro device profile (393×659 CSS px, DPR 3), actual browser touchscreen events, not a physical iPhone; launch and representative interaction only, not full-session performance or acoustic certification.
- 本轮候选烟测页面异常、控制台错误、HTTP 4xx/5xx 均为 0。 · Candidate smoke: no page exceptions, console errors or HTTP 4xx/5xx.
- [全站记录 · Showcase compatibility record](../docs/SAFARI-WEBKIT-20261128.md)
