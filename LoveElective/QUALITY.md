# 品质验收 · Quality — 心动选修课 · Love Elective

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项来自 `node tools/quality.mjs LoveElective --no-write --json`；实机和浏览器验收另列，模拟触屏不计为实机。· Automated, emulated-touch and physical device results are distinct.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-26；Egret Rebuild `f0dfde367431713578e23fb3931544177b443c3c`。
- 自动软件渲染 · Automated software: Windows / Node 26.7.0, headless Edge 158, SwiftShader, 1280×800; first screen throttled to 10/5 Mbps, 40 ms round trip, CPU ×4. Parallel browser QA was active during the initial quality run.
- PC 真机 · Device: Windows, headed Edge 158.0.4370.33, NVIDIA RTX 5090 Laptop GPU, WebGL2/ANGLE, 1280×800. Automated actual mouse/keyboard, no direct state changes.
- 手机真机 · Device: Samsung Fold7 (SM-F966U1), Android 17, Chrome 157.0.8103.78, Adreno 830 / WebGL2, 873×325 landscape and 411×813 portrait CSS pixels, DPR 2.625. Trusted device touch events.
- 实机 rAF 为三个约 3 秒的前景采样窗口，不能代表所有剧情、加载长帧或 GPU 执行时间。· Three approximately three-second foreground rAF windows, not whole-session or isolated GPU timings.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 核心路线通过 · core route pass | Fold7 title, prologue, phone, wardrobe, continuous dye, purchase and reload; not complete 30-day term |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 未达标 · fail | 4 of 5 under 44×44: New Term 87×16; 中文 42×13; Sound on 42×13; Memories  ·  0 / 87×13 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 未达标 · fail | p95 924.9 ms over 12 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run | Fold7 only (not a mid-range device), 16.7 ms p95 in 3 sampled windows |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.5 s to the first playable screen, 5.1 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 未达标 · fail | html lang "en", Chinese left: 心动选修课 校园恋爱养成游戏 点击或轻触进行操作 空格或回车继续对话 屏幕方向 |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · manual | 已检查 · checked | Native title, settings, story and other labels inspected; both game languages available |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "心动选修课：校园恋爱养成游戏。点击或轻触进行操作，空格或回车" (outline) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · manual | 未运行 · not run | Native keyboard focus/activation verified, whole term by keyboard not run |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 4 named controls, e.g. button "开始新学期", button "English", button "声音开" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 未达标 · fail | prefers-reduced-motion is not read |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: love-elective-prefs-v1, love-elective-save-v1) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: love-elective-prefs-v1, love-elective-save-v1) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · manual | 未运行 · not run | Invalid save recovery checked by automated rules/quality; no human recovery run |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 未达标 · fail | 23 files refused; no uncaught error; no error screen with a retry |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run | Audio toggles and independent volume verified; no actual acoustic measurement or background audio listening |

## 人工与真机结果 · By hand and on devices

- 原版：64/64 Node；桌面 1280×800 与竖屏 390×844 浏览器分别完成标题、序章、校园、手机、设置、宿舍换装，12 张对照截图。仅升级到 f0dfde36 后仍 64/64，两个 UI 路线无报错。· Old and engine-only Node and browser transitions passed.
- 原生迁移：65/65 Node；原有剧情、数值、服饰规则、美术与存档结构未改。角色和服饰插画依然使用原图纹理，全部游戏控制、文本、进度条、原生焦点和对话逐字显示改用白鹭。· Native migration keeps rules and art, with native interactive views and text.
- 真实 PC：18/18，60/60 关键文件指纹，原生键盘焦点、序章、七手机页、音量、存档、换装、购买和真实刷新均通过，0 错误。· Physical GPU and actual mouse/keyboard.
- Fold7 横屏：17/17；32 次可信 touch start、128 个可信指针事件。竖屏：11/11；21 次 touch start、84 个可信指针事件。两个方向 60/60 文件指纹，0 错误，设备原有设置已恢复。· Trusted physical-device touch, both orientations.
- 真实任意色带两处点选分别得到 #e6d477 与 #9126a3；重新装备白衬衣保留染色，单色裤装无辅助色通道；购买卫衣 ¥160，从 ¥300 变为 ¥140，实际刷新继续恢复衣装、染色、库存及金额。· Exact dye, item, price and saved-state matches.

| 设备 · Device | 校园 · Campus | 衣橱 · Wardrobe | 染色后 · Dyed wardrobe | > 50 ms |
|---|---|---|---|---|
| PC RTX 5090 | p95 4.3 ms / ~240 FPS | p95 4.3 ms / ~240 FPS | p95 4.3 ms / ~240 FPS | 0 in sampled windows |
| Fold7 landscape | p95 16.7 ms / ~60.33 FPS | p95 16.7 ms / ~60.33 FPS | p95 16.7 ms / ~60.33 FPS | 0 in 3×181 samples |
| Fold7 portrait | p95 16.7 ms / ~60.33 FPS | p95 16.7 ms / ~60.33 FPS | p95 16.7 ms / ~60.33 FPS | 0 in 3×181 samples |

- 旧横向舞台 1280×720 保留：Fold7 竖屏画布仅 411×231 CSS，辅色/音量按钮高度约 9.62 px，横屏约 13.54 px。精准自动触屏可通过，但不等于普通玩家触控面积达标。页面已有横屏提示及全屏入口，尚未独立验证全屏锁定。· Original landscape-first geometry preserved; touch target accessibility remains a limitation.
- 无头 SwiftShader、ratio=1 在英文 16px 两行正文上存在稳定碎片；同一路线 ratio=2（2560×1440 backing at 1280×720 CSS）清晰，真实 PC/Fold7 默认参数也清晰。因此截图基线明确使用 ratio=2（软件诊断条件），不宣称默认软件缺陷已修。· Software-only low-density label artifact, high-density and physical GPU shots are clear.
- 品质工具仍报告 T2、F1、I1、A3、E2 未达标；实际平台流畅度与软件压力测试不混用。英文保留中英文品牌及旧页面辅助提示，资源拒绝时没有专用重试界面。· Automated failures are not hidden, and real GPU smoothness is reported separately.
- 未覆盖：三十天及全部七条完整剧情的真机流程、全部女主衣橱、低/中端设备、扬声器实听、系统读屏、默认软件渲染文字碎片归因。· Full term/all branches and senior wardrobes, low/mid-range devices, speaker listening, system screen reader and default software artifact attribution remain unverified.
- 最后补齐原生悬停反馈后，物理 PC enter/leave 高亮计数 1→0，cursor pointer→default，实际点击一次进入序章；随后完整 18/18、60/60 最终候选文件通过，三段 p95 仍 4.3 ms。· Final candidate retains native hover, cursor, action and 18/18 physical PC route.
- 增补独立浏览器路线：正常新学期→操场→林夏初遇→剧情选择→关系卡→空礼物包→聊天→跑步集中小游戏；低好感下约会和换装按钮原生禁用，零错误。没有注入规则状态，尚未达成完整关系支线。· Independent real browser input verified a senior introduction, choice, relationship card, gift bag, chat, timing activity and disabled affection-gated actions; not a whole relationship route.
- 软件文字缺笔已在独立原生 game.show（不依赖本游戏）复现：size16、height23、ratio1 断笔；同文字 height24 及 ratio2 清晰，atlasPending/refusals 均 0。详细复现和验收建议见 ENGINE-NOTES 第 7 条。· Independently reproduced without game code; odd/even height and raster density A/B.
- 增加悬停后的最终版本也在 Fold7 横屏完整复跑：17/17、60/60 文件指纹；32 次可信触点、128 个事件、三段各 181 帧 p95/max 16.7 ms、0 错误。竖屏为仅差桌面原生悬停与行尾整理的前一候选版（11/11）。· Final exact landscape physical rerun with native hover passes; portrait was tested before the desktop hover-only adaptation.
- 浏览器最终冻结运行时：桌面 25/25、模拟竖屏 18/18、模拟横屏 18/18，合计 61/61 实际输入/语义/玩法断言；ratio2 独立视觉路径完成，四张静态对照均通过（标题 0.00%、手机 0.36%、衣橱 0.34%、商店 0.84%）。校园全景差异 17.21% 来自不同时刻动态视差，截图逐张审查后保留为参考，测试改为行为与布局验收；未调宽其他像素容差。最终变更仅移除此不稳定全景像素门槛，语法检查通过，未重复整个浏览器流程。· 61/61 input checks; four reproducible pixel gates passed and animated map kept as reviewed reference. The in-flight run included the removed nondeterministic map pixel assertion; no second whole-suite run was performed.
