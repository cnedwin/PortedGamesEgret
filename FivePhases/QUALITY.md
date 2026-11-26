# 品质验收 · Quality — FivePhases · 五行牌阵

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs FivePhases` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs FivePhases`, which writes
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
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 达标 · pass | Physical Fold7 completed all three stages; two rewards, settlement, restart |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 3 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 不达标 · fail | p95 112.5 ms over 48 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run | Fold7 flagship measured separately; no mid-range phone |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | Tool: 1.5 s / 1.2 MB under its startup heuristic; distinct from full public cold-ready time |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 不达标 · fail | no way to choose English found |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · manual | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | Raw checker pass; English gameplay localization remains outside original scope |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "五行牌阵" (focus drawn by the game) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · manual | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 3 named controls, e.g. button "开阵", button "阵法说明", button "声音" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 不适用 · n/a | No campaign save; old mute preference tested separately in Node and browser |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 不适用 · n/a | No campaign save; old mute preference tested separately in Node and browser |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · manual | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 达标 · pass | 3 files refused; no uncaught error; offers to try again |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: F1（SwiftShader software title），I1（原版仅中文）。T1 另由实际 Fold7 完整三关通过；其它真机和人工项按上表记录。

## 实机回归 · Physical device regression (2026-11-26)

引擎 8e70dcb3。完整自然路线采用实际鼠标/触屏事件和只读场况选取合法动作，不跳关、不修改血量、能量、牌组与判定。rAF 帧间隔不是 GPU 执行时间。 · Input-driven full runs; no stage skipping or rule/state injection. rAF is browser frame timing, not GPU execution.

| 项目 · Item | PC Edge 158.0.4370.33 / RTX 5090 Laptop / WebGL2 | Galaxy Z Fold7 SM-F966U1 / Android 17 / Chrome 157 / Adreno 830 / WebGL2 |
|---|---|---|
| 三关 · Three stage times | 24.24 / 24.74 / 24.51 s | 18.54 / 52.13 / 54.63 s |
| 结算 · Final | 915 HP, chain 10 | 1000 HP, chain 13 |
| 操作 · Actions | 7 two-tap + 7 drag swaps, 22 cards, 7 end-turn | 8 two-tap + 8 drag swaps, 28 cards, 12 end-turn |
| 操作帧时间 · Action rAF p95 / max | 4.3 / 20.9 ms (17,573 samples) | 16.7 / 34.6 ms (7,504 samples) |
| 多连锁 · Chain rAF p95 / max | 4.3 / 12.5 ms (14,081) | 16.7 / 34.6 ms (5,286) |
| rAF intervals >50 ms | 0 | 0 |

- 两设备均验证两次自然三选一、牌组承接、结算、重开、规则说明、手牌详情与模态阻止背景交换、能量不足不消耗、原有静音偏好。真实路线无控制台错误或请求失败。 · Natural choices, deck transfer, result, restart, guide, details/modal input lock, insufficient energy and mute toggle passed.
- 旧版 PC 自然路线 p95 4.3 ms、最大 175 ms（14,579 samples），新版同设备自然路线最大 20.9 ms；随机牌局与动作不同，不能把差异直接归因于新版 UI。 · Same device, different natural rounds, not a controlled matched-seed performance experiment.
- 独立 Long Animation Frame 观察：PC 1 条 51 ms，Fold7 6 条、最大 55.3 ms；浏览器指针/帧循环回调均有所贡献，未做 GPU 归因。 · LoAF is measured separately from rAF, not GPU time.
- 首次新版 PC 与 Fold7 均在首领死亡时触发语义树空名称问题，已修复并实际复跑完整三关。奖励长文字裁切随后加高卡片，在 Fold7 自然打完第一关及真实选牌回归通过，最大 49.7 ms；最后增加只读语义文本，浏览器专项覆盖。 · The full route rerun fixed the semantic transition fault; a focused actual-phone replay verified the final taller reward cards. Final read-only semantic fields are covered by browser acceptance.
- 实测真实 Fold7 竖屏 411×813、DPR 2.625；实际牌阵 CSS 375.79×813.71，画布 1500×3248。奖励卡点击区约 96.20×194.41 CSS px。 · Real Fold7 portrait and card target dimensions.
- 构建、存储、自动语义以及真机触控均分开记录；未测试实体手柄、Safari、真实读屏语音、扬声器声学听感或中端手机。无英文玩法词条及跨局战斗存档仍是原版范围。 · No physical gamepad, Safari, spoken screen-reader or acoustic audio acceptance, or mid-range phone; English localization and campaign saves remain outside original scope.
- 最终统一品质测量：同一 Windows SwiftShader 环境下，隐藏战场的标题优化前后 F1 p95 325.1 → 112.5 ms（19 → 48 样本），仍不达 16.7 ms。E3 后台模拟由 fail 到 pass；T2、E1、E2 通过。不是物理设备性能。 · The software-title p95 fell from 325.1 to 112.5 ms after hiding the covered battlefield, still below the standard; visibility, touch targets and retry passed.
- 最终完整浏览器验收 12/12 通过，标题和手牌详情的基线差异均 0.00%。模拟单个资源失败并延迟另一个资源，原生重试不消失，真实点击后返回标题。最后冻结源文件在 Fold7 又进行确切哈希 9/9 的冷启动、说明、手牌模态、声音及两点消除验证，0 错误。 · Final 12/12 browser acceptance; baseline differences 0.00%. Actual retry after an injected failure and delayed sibling works. Final exact-source Fold7 smoke (9 hashes) passed.
- 发布前官方引擎副本更新至 f0dfde36（#497 仅迁移工具、文档与测试）；355 个文件仅 SOURCE.md 不同，原生运行时代码逐字节一致，本报告的 8e70dcb3 实测有效。 · Final official f0dfde36 pin has identical runtime bytes to 8e70dcb3, so previous measurements remain applicable.


## 2026-11-27 官方主干同步 · Official main integration

- 引擎 · Engine: 94bd70fb26b1f81794c9c6fbbb258c655fcd19df；预发布 CI 候选 b1f275d7 实测，正式副本的运行时代码逐文件哈希核对一致。 · Tested the complete CI candidate, then verified the official runtime payload byte for byte.
- 自动 · Automated: Node 80/80; existing Chromium browser acceptance passed, reviewed screenshot baselines were not overwritten.
- 实机 · Physical devices: Windows Edge 158 / RTX 5090 Laptop GPU; Samsung Fold7 Android 17 / Chrome 157 / Adreno 830, actual trusted mouse/keyboard and touch input through the respective browser control, isolated game saves.
- 代表路线 · Representative route: 真机实际两点消除、不可用卡牌反馈、手牌详情；PC 实际出牌。奖励/结算在软件浏览器固定夹具验证。 · Device runs cover legal two-point swaps, insufficient-energy feedback and details; PC also casts a card. Reward and settlement run in the browser fixture.
- PC: 180 rAF: p95 4.3 → 4.2 ms; max 4.3 → 4.5 ms.
- Fold7: 120/121 rAF: p95 16.7 → 16.7 ms; max 33.1 → 16.7 ms.
- 原生角色由 group 升为 button；固定种子浏览器回归验证出牌后手牌列表容器身份保留。实机盘面因自然 RNG 不同，不做像素级比较。 / Native card roles become buttons; the keyed hand container is retained on a real card cast in the seeded browser test. Natural RNG differs across device runs.
- 限制 · Limits: 短前台 rAF 不是独立 GPU 时间，也不是整局、所有设备或中端手机验收。未跑真实读屏、物理手柄、Safari 或整局声学测试。 · Short foreground rAF samples are not isolated GPU time or a whole-game/device matrix. No physical screen reader, controller, Safari or speaker/acoustic certification.
