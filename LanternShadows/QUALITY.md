# 品质验收 · Quality — Lantern Shadows · 灯影·闹天宫

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs LanternShadows` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs LanternShadows`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-26
- 浏览器 · Browser: 无头 Chromium 157.0.8103.6，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Windows 11 x64, Node v26.7.0
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 达标 · pass | Samsung Galaxy Z Fold7 (SM-F966U1, Android 17, Chrome 157); all three acts, C/B/B, records reload |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 8 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action pan-y, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 不达标 · fail | Headless SwiftShader p95 99.9 ms over 52 frames; physical PC results below |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run | Fold7 flagship measured, not a mid-range device; see below |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.5 s to the first playable screen, 1.5 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 达标 · pass | html lang en, no Chinese in page text or names |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "皮影戏台" (focus drawn by the game) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 6 named controls including 开锣, 直接会哪吒, 从第二幕蟠桃园演起 |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: lantern-, lantern-screen-controls) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: lantern-, lantern-screen-controls) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 未验证 · unverified | Tool returned n/a; asset detector missed manifest-based loading; explicit retry not tested |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: F1 (SwiftShader)。T1 由 Fold7 真机补验；F2 中端机、E4 后台声音与计时、I2、A1m、S4 以及 E2 仍未完整验证。 · T1 was separately tested on the physical phone; the other listed manual/device items and E2 are not fully verified.

## 实机证据 · Physical device evidence (2026-11-26)

实际操作路线使用键鼠或真实触屏事件，根据只读场况选择下一次输入，不跳关、不调血、不改规则。测量是浏览器 rAF 帧间隔，不是 GPU 执行耗时。 · Input-driven runs, with read-only route observation; no skips, health edits or rule changes. Measurements are browser rAF intervals, not GPU execution time.

| 设备、场面 · Device and scene | 南天门 · Gate | 蟠桃园 · Orchard | 兜率宫 · Palace |
|---|---|---|---|
| PC / Edge 158.0.4370.33 / WebGL2 | B, 45.73 s | A, 47.73 s | B, 64.15 s |
| PC normal rAF p95 | 4.3 ms (9055) | 4.3 ms (8981) | 4.3 ms (13348) |
| PC 100-clone rAF p95 | 16.7 ms (1248) | 16.7 ms (1524) | 16.7 ms (1292) |
| Fold7 / Chrome 157 / WebGL2 | C, 89.08 s | B, 75.63 s | B, 91.07 s |
| Fold7 normal rAF p95 | 16.7 ms (4847) | 16.7 ms (3923) | 16.7 ms (4416) |
| Fold7 100-clone rAF p95 | 33.3 ms (414) | 33.2 ms (675) | 33.2 ms (301) |

- PC 炉内阶段 p95 12.6 ms；Fold7 炉内 p95 16.7 ms。PC 第一幕分身一次 54.3 ms；Fold7 普通场景最大 116 / 99.4 / 49.8 ms，第一幕分身最大 66.7 ms。长帧未做逐帧归因，不归咎任何具体子系统。 · Furnace p95 12.6/16.7 ms (PC/Fold7); occasional long frames listed, not attributed to a specific subsystem.
- 两设备完成三幕、每幕自然放出两次分身、暂停恢复、音乐场景切换、通关成绩刷新续读，均无游戏错误或失败请求。Fold7 另通过越界摇杆、松手/取消、多点和唯一跳键测试。 · Three acts, two natural clone casts each, pause/resume, music playback state and persistent records, with no game error or failed request. Fold7 also passed drag-out, release/cancel, multi-touch and single Jump checks.
- 音乐声学实听、实体手柄、Safari、WebGPU、不同档位手机未在本轮验收。 · Speaker listening, physical gamepads, Safari, WebGPU and other phone classes were not tested this round.
- 最终样式的完整浏览器验收 10/10 通过（含英文标题横转竖、390×844 触控、结算布局测试）；截图基线复跑差异 0.00% / 1.69%，控制台/页面/HTTP 错误 0。 · Final browser acceptance 10/10; physical rotation has a separate device test, while this test suite uses headless emulation; baseline differences 0.00% and 1.69%.
- 真实旋转回归 · Physical rotation: Fold7 411×813 英文竖屏原开锣按钮中心超出视口；限制 grid 轨道和标题固有宽度后，实际开局、唯一跳键、摇杆及暂停恢复通过，html/booth/curtain/playbill scrollWidth=clientWidth=411。 · The English start button was off-screen on physical rotation; after the width constraints, actual start, one jump button, stick and pause/resume passed with no horizontal overflow.
- 横屏结算回归 · Landscape result: Fold7 再从兜率宫开演、正常击败老君（145.47 s, C）。标题、等级、统计、三项挑战、试演、全剧终及再演/回戏单等 12/12 内容和入口完整位于 325 CSS px 高的结算区域，中心均能命中；有 2 CSS px 装饰性滚动余量，没有裁切。该定向回归未实际按再演；之前三幕流程和 PC 自动验收覆盖输入、成绩与重演选择。 · Cleared the third act on the physical phone; all 12 result elements are in bounds with hit-tested centers. A 2 CSS px scroll remainder remains; Again was not pressed in this focused run.
