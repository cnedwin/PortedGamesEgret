# 品质验收 · Quality — 台灣十六張麻將 · Taiwan Sixteen-Tile Mahjong

2026-11-26。引擎副本为 `2e53f45f`。按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。横竖屏与牌局测试分别记录无头浏览器和真机结果。 · Tested with engine copy `2e53f45f`, using separate browser and physical-device checks.

## 自动验收 · Automated checks

- `node --test test/*.test.mjs` 通过 30 项。覆盖台数、庄家轮换、四圈结束、收支守恒、旧档和坏档。 · All 30 tests passed for scoring, dealer rotation, four winds, balanced payments and save compatibility.
- `node test/accept.mjs` 使用无头 Chromium、SwiftShader。覆盖语义树、键鼠、横竖屏触控、牌局行动、结算、战绩和标题／规则截图基线。 · Headless Chromium with SwiftShader covers browser semantics, mouse and keyboard, touch in both orientations, calls, settlements and records, with title and rules baselines.
- `node tools/quality.mjs TaiwanMahjong --no-write --json` 在 Windows 的无头 Chrome 上通过 14 个自动检查（T2、T3、F1、L1、O1、I1、A1、A2、A3、S1、S2、S3、E1、E3）。390×844 标题页 10 个控件均达到 44×44 CSS 像素。10/5 Mbps、40 ms 往返、CPU 降速 ×4 时，标题可操作耗时 1.7 秒，传输 2.7 MB。 · Fourteen generic checks passed. All ten projected title controls measured at least 44 × 44 CSS pixels in the 390 × 844 viewport. The title was playable in 1.7 seconds with 2.7 MB transferred on the throttled run.
- I3 报警来自旋转后宽度较窄的透明无障碍投影节点。已分别检查横、竖屏的英文标题和规则截图。 · I3 reports narrow transparent accessibility nodes after rotation. English title and rules were checked separately in landscape and portrait screenshots.
- E2 的通用规则遗漏繁体「重試」。单独阻断大厅主图和头像的首次请求后，繁中键盘与英文鼠标均能重试，且仅重新请求失败的插画。全阻断时仍能开局。音频重试单独未测。 · E2's generic text check misses the Traditional Chinese retry label. Targeted fault injection recovered each rejected title image using keyboard or mouse and left the game playable with all startup media blocked.

## 真机验收 · Physical devices

- Windows Chrome 158，GeForce RTX 5090 Laptop GPU，WebGPU。普通难度和内置「轻快」节奏，以浏览器键鼠事件打一将共 26 局，东、南、西、北分别 7、10、5、4 局。耗时 14 分 51 秒。选择、出牌、吃、碰、槓、胡和过均通过实际控件，托管关闭，牌局数据由正常规则产生。终局四家分数合计为零，刷新后保留 26 局的战绩。 · Windows completed a full four-wind match with 26 hands in 14:51 using normal rules and the built-in brisk pace. The driver sent browser inputs through the actual controls and left autoplay off. Scores balanced and the record survived reload.
- Galaxy Z Fold7，Android 17，Chrome 157，WebGPU。873×325 CSS 横屏通过两组吃牌候选、返回保持叫牌机会和选择第二组。411×813 CSS 竖屏通过出牌、碰、槓、自摸、暂停续播、四家结算和刷新读回战绩。按默认节奏完成东风圈 7 局，耗时 7 分 47 秒，托管关闭。使用 CDP 在真机 Chrome 注入触控。 · Fold7 verified branching chow in landscape and completed a seven-hand East round in portrait at normal pace using browser-injected touch. The record survived a page reload.
- Fold7 竖屏完整东风圈的首段 3.8 秒内，浏览器帧间隔 p95 为 16.7 ms，最长 33.4 ms。语音独立开关经验证，暂停冻结播放时间，恢复继续同一条语音。 · The 3.8-second frame pacing sample recorded 16.7 ms p95 and 33.4 ms max. Voice mute worked independently and the same clip continued after resume.
- 两场完整对局使用相同引擎运行时和规则，最终布局与模态框修正另外回归。扬声器实听、手指触控和真实读屏播报尚未覆盖。 · Both long matches used the same engine runtime and rules. Final presentation fixes had separate regression coverage. Speaker listening, finger input and live screen-reader speech are pending.

## 2026-11-26 · 引擎 `8e70dcb3` 与繁中文字清晰度 · Engine `8e70dcb3` and Traditional Chinese legibility

- 保留 1280×720 牌桌设计坐标及 960×540（竖屏交换宽高）的引擎逻辑舞台。调整小字号和对比度，并由实际 CSS 显示尺寸、设备像素比选择白鹭原生 `pixelRatio`；不低于既有默认值且以 2× 为上限。在较大的 PC 窗口补足栅格分辨率，手机不无谓扩大渲染目标。牌局规则、操作逻辑和存档格式不变。 · The table's design coordinates and three-quarter logical stage are unchanged. Typography and contrast are refined; the engine chooses its native pixel ratio from the actual CSS size and device density, bounded by the existing default and a 2× ceiling. This improves larger desktop rendering without unnecessarily increasing the mobile target. Rules, controls and save format are unchanged.
- 最新候选的 `node --test test/*.test.mjs` 为 **32/32**，含自适应像素比、原存档与规则等回归。 · All 32 Node tests passed, including the display-density tests and existing save and rules regressions.

### PC 实际设备 · PC physical device

Windows Chrome 158、GeForce RTX 5090 Laptop GPU，硬件 WebGPU。使用实际浏览器输入事件的专项路线 **12/12** 通过；完成一把牌的专项路线耗时 29.545 秒，四家结算为 1600／−500／−600／−500（守恒）。无浏览器错误。CSS 画面 1280×720、DPR 约 1 时，实际引擎画布 1281×721；文字缓存拒绝 0 次，使用 1 张图集。 · Hardware WebGPU on the RTX 5090 Laptop GPU with Chrome 158 passed all 12 focused assertions. The focused one-hand route took 29.545 seconds and settled to 1600/−500/−600/−500. No browser errors were observed. At a 1280×720 CSS display and approximately DPR 1, the backing canvas was 1281×721 with zero text-cache refusals and one atlas.

### Galaxy Z Fold7 实际设备 · Galaxy Z Fold7 physical device

Android 17、Chrome 157、硬件 WebGPU。使用 CDP 向真机浏览器注入触控；测量为浏览器帧间隔，不是 GPU 内部耗时。 · Hardware WebGPU on Android 17 and Chrome 157, with CDP-injected touch on the physical phone. Timings below are browser frame intervals, not isolated GPU timings.

| 实际视口与设备像素比 · Viewport and device pixel ratio | 功能断言 · Assertions | 平均 FPS · Mean FPS | p95 帧间隔 · Frame interval | 最大帧间隔 · Max | 源文件指纹 · Source asset fingerprints |
| --- | ---: | ---: | ---: | ---: | ---: |
| 竖屏 · Portrait 411×813 CSS, DPR 2.625 | 19/19 | 59.53 | 16.7 ms | 49.8 ms | 16/16 |
| 横屏 · Landscape 873×325 CSS | 11/11 | 60.07 | 16.7 ms | 31.5 ms | 16/16 |

竖屏覆盖碰、槓、自摸、结算及刷新读档；横屏覆盖两个吃牌组合及返回后的焦点恢复。两场均无浏览器错误；采样内未出现超过 50 ms 的帧间隔。验收结束释放手机测试控制并恢复测试前状态。 · Portrait covered Pong, Kong, self-draw, settlement and reload; landscape covered both Chow choices and focus restoration. Neither had browser errors or sampled frame intervals above 50 ms. The device test lease was released and restored afterward.

无头 Chromium／SwiftShader 完整功能回归通过：东风圈、原生焦点与滚动、合法吃／碰／槓／胡、自摸、坏档恢复和语义树。首次对照旧截图仅标题（3.98%）与规则（7.47%）因清晰度调整超限；人工审阅后重拍两张基线，独立复跑同一截图步骤，两张差异均为 0.00%。 · The full headless Chromium/SwiftShader functional walk passed, including the East round, native focus and scroll, legal calls and wins, corrupt saves and semantics. The old title (3.98%) and rules (7.47%) screenshots alone exceeded the limit after the deliberate clarity change; both were visually reviewed, recaptured and independently compared again at 0.00% difference.

通用品质检查通过 14 项，限速首屏 1.6 秒（3.1 MB）。I3 仍会将旋转后的透明语义节点判为裁切；有意增大的字号曾导致英文难度说明越界，局部收紧英文窄卡片后，1280×720 与 390×844 复查均无实际溢出。E2 的繁体「重試」误报也已复核：首次阻断两张插画，实际点选「重試載入插畫」后均返回 HTTP 200，游戏可正常开局，无未捕获异常。 · Fourteen generic checks passed, with a throttled start-up of 1.6 s (3.1 MB). I3 still flags the projected semantic nodes that rotate; a real English difficulty-caption overflow was fixed by sizing compact English cards separately and rechecked visually at 1280×720 and 390×844. E2 misses Traditional Chinese retry wording; blocking each title image once and clicking the native retry recovered both with HTTP 200 and no uncaught exception.

本轮实机为专项回归，未重新打完一将，也未验证真人手指输入、扬声器主观听感或真人读屏。 · The hardware runs were focused regressions. A fresh full four-wind match, unaided finger input, subjective speaker listening and live screen-reader speech are not covered by this round.


## 2026-11-27 官方主干同步 · Official main integration

- 引擎 · Engine: 94bd70fb26b1f81794c9c6fbbb258c655fcd19df；预发布 CI 候选 b1f275d7 实测，正式副本的运行时代码逐文件哈希核对一致。 · Tested the complete CI candidate, then verified the official runtime payload byte for byte.
- 自动 · Automated: Node 32/32; existing Chromium browser acceptance passed, reviewed screenshot baselines were not overwritten.
- 实机 · Physical devices: Windows Edge 158 / RTX 5090 Laptop GPU; Samsung Fold7 Android 17 / Chrome 157 / Adreno 830, actual trusted mouse/keyboard and touch input through the respective browser control, isolated game saves.
- 代表路线 · Representative route: 规则滚动、开局、暂停恢复；PC 真实出牌，Fold7 竖屏旋转投影。 · Rules scroll, deal, pause and resume; actual discard on PC, rotated portrait projection on Fold7.
- PC: round rAF p95 4.3 → 4.3 ms; title 180 rAF engine submissions 0 → 1.
- Fold7: 121/121 rAF: p95/max 16.7/16.7 → 16.7/16.7 ms.
- 同一竖屏旋转列表 offset −115.62，默认 WebGPU/按需。原静态 felt 保留，#505 WebGL2 捕获不是等价替代。 / Same rotated scroll offset on physical Fold7; default WebGPU/on-demand; keep the already rasterized felt rather than a redundant WebGL2 bake.
- 限制 · Limits: 短前台 rAF 不是独立 GPU 时间，也不是整局、所有设备或中端手机验收。未跑真实读屏、物理手柄、Safari 或整局声学测试。 · Short foreground rAF samples are not isolated GPU time or a whole-game/device matrix. No physical screen reader, controller, Safari or speaker/acoustic certification.

## 2026-11-27 · 原生螢幕適配 · Native screen layout integration

- 舊版引擎 / Before: `94bd70fb26b1f81794c9c6fbbb258c655fcd19df`；新版 / After: official main `13d70b73904266c11b23de4c09c239240a7162db`（#507–#515）。規則、台數、電腦牌友、素材、音訊和存檔格式不變。 · Rules, scoring, computer opponents, assets, audio and save format are unchanged.
- 舊版執行原有 vendor 的 `verify --screens` 時在 guide card 格式檢查停止，尚無螢幕結果；新 verifier 開舊網站可開啟八種標題，但舊引擎沒有 native agent 控件資料。舊版補測從瀏覽器語意樹提取實際控制區，沿用新版 verifier 的八種 profile 及 controlFindings。新版 vendor CLI 的標題 **8/8，0 錯誤、0 警告**。新版 CLI 使用既有 Chromium 的 Playwright 啟動器（本機未安裝附帶的 Chromium），不修改 vendor。CLI 只測啟動狀態，拒絕合用 `--screens --play`。其他狀態由 `test/screens.mjs` 使用同一組引擎 SCREENS、controlFindings 與 native agent，經實際 UI 輸入進入。 · The original vendored command stopped at guide-card parsing; the new verifier could open the frozen old game but its native agent controls were unavailable. The old measurements therefore use its browser semantic controls and the identical eight screen profiles/checker. The new vendor CLI used an installed Chromium through the local Playwright launch adapter without modifying vendor, and passed all eight title screens; other states are exercised through actual UI inputs with the same native checker. This is not a claim that the CLI itself can drive arbitrary match states.

### 八種 profile 逐況比較 · Eight-profile comparison

每格為舊→新「錯誤數 / 警告數」。主要驗收四況為標題、叫牌、結算、規則；追加出牌、吃牌候選與未副露滿手牌。Chromium 158、WebGL2 SwiftShader；模擬螢幕安全區（包含紅色遮蔽帶），不是八台真機。 · Each cell shows old → new errors / warnings. Four required states plus discard, Chow choices and a full unmelded hand. Emulated viewports with safe insets, not eight physical devices.

| Profile (CSS px) | 標題 Title | 叫牌 Calls | 結算 Result | 規則 Rules | 出牌 Discard | 吃牌 Chow | 滿手 Full hand |
|---|---|---|---|---|---|---|---|
| phone-small 375×667 | 0/10 → 0/0 | 0/2 → 0/16 | 0/1 → 0/0 | 0/3 → 0/0 | 0/14 → 0/14 | 0/3 → 0/0 | — → 0/17 |
| phone-notch 393×852 | 0/0 → 0/0 | 0/0 → 0/0 | 0/1 → 0/0 | 0/3 → 0/0 | 0/14 → 0/0 | 0/3 → 0/0 | — → 0/0 |
| phone-notch-wide 852×393 | 0/0 → 0/0 | 0/0 → 0/0 | 0/1 → 0/0 | 0/3 → 0/0 | 14/14 → 0/14 | 0/3 → 0/0 | — → 0/17 |
| phone-tall 360×800 | 0/10 → 0/0 | 0/4 → 0/0 | 0/1 → 0/0 | 0/3 → 0/0 | 0/16 → 0/14 | 0/3 → 0/0 | — → 0/0 |
| tablet 768×1024 | 0/0 → 0/0 | 0/0 → 0/0 | 0/0 → 0/0 | 0/0 → 0/0 | 0/0 → 0/0 | 0/1 → 0/0 | — → 0/0 |
| tablet-wide 1024×768 | 0/0 → 0/0 | 0/0 → 0/0 | 0/0 → 0/0 | 0/0 → 0/0 | 0/0 → 0/0 | 0/1 → 0/0 | — → 0/0 |
| foldable 884×1104 | 0/1 → 0/0 | 0/1 → 0/0 | 0/1 → 0/0 | 0/1 → 0/0 | 0/1 → 0/0 | 0/2 → 0/0 | — → 0/0 |
| desktop 1920×1080 | 0/0 → 0/0 | 0/0 → 0/0 | 0/0 → 0/0 | 0/0 → 0/0 | 0/0 → 0/0 | 0/0 → 0/0 | — → 0/0 |

舊版 48 張、新版 56 張實際瀏覽器畫面（新增滿手），新版 **56/56 無錯誤、無 apart 警告、無引擎執行警告**；標題、規則、結算與吃牌候選共 32/32 無任何警告。已檢視螢幕畫面及紅色遮蔽區。新版警告總數 92，全為 touchTarget，逐類保留理由如下。 · The after matrix has no errors, apart warnings or engine runtime warnings. All 32 title/rules/result/Chow panels are clean; reviewed images include safe-inset overlays. All 92 retained findings are touch-target size warnings, grouped exhaustively below.

- 375×667：叫牌 16 個（暫不可操作的手牌仍被檢查為可點）、出牌 14 個（沿牌列 40.22 CSS px）、滿手 17 個（38.47 px）；長邊 667 px 小於 17×44。 · Claim: 16 disabled hand targets are still counted; discard: 14 at 40.22 px; full: 17 at 38.47 px. The long axis is shorter than 748 px.
- 852×393：有兩側各 59 px、底部 21 px 的模擬安全邊距，可用寬 734 px。出牌 14 個（42.50 px），滿手 17 個（42.44 px）；17×44=748 px，另需留副露及間隔空間，不能在安全區內同時達標。 · With side insets of 59 px each, safe width is 734 px. 14 discard targets (42.50 px), 17 full-hand targets (42.44 px); all remain disjoint.
- 360×800：出牌 14 個（43.47 px），副露留位；滿手可達 44 px。 · 14 discard targets at 43.47 px when a meld is reserved; the full hand reaches 44 px.
- 873×325（無額外模擬瀏海）：滿手最小 44.00×49.65 CSS px；411×813 轉桌後為 62.79×44.00 CSS px；768×1024 為 44×66 CSS px。只沿手牌排列軸計算寬度，直向轉桌時為畫面 Y 軸。所有牌按鈕互不重疊，叫牌按鈕並未因此縮小。 · Full-hand minima on these three reference views; the long axis of the rotated hand is screen Y. Every hand target is disjoint; call buttons are not narrowed by this constraint.

### 渲染預算與畫面基線 · Raster budget and visual baselines

使用完整 1280×720 邏輯尺寸，移除舞台及 UI 的 0.75 倍。初次試驗短邊 <600 CSS px 仍以最高 1.5 的 raster ratio，軟體渲染 873×325 p95 從 41.8 升至 54.3 ms，411×813 從 45.9 升至 70.8 ms，故緊湊裝置設 1× 預算，其餘以 1–1.5× 為界。這可能使極高 DPR 手機的細文字略軟，不以重建對局換取更高密度。 · Removed the 0.75 logical multiplier; a first test with a higher compact raster cap regressed. Use native ratio 1 for compact displays and 1–1.5 elsewhere. Higher-DPR screens can upscale fine type; the live match is not remounted to sharpen it.

相同 seed 79、正常出牌速度、首次打出 tile 113，軟體 WebGL2 / SwiftShader、每樣本 120 個 rAF。以下是密度選型的對照，不是孤立 GPU 耗時。 · Same seeded normal-pace first discard; software frame intervals, not isolated GPU time.

| CSS view | 舊 p95 / max ms ( >50 ms ) | 新 p95 / max ms ( >50 ms ) | 舊→新 backing canvas px |
|---|---|---|---|
| 1280×720 | 29.2 / 87.4 (2) | 33.3 / 70.8 (1) | 1280×720 → 1280×720 |
| 873×325 | 41.8 / 91.6 (3) | 37.6 / 66.7 (3) | 1920×1080 → 1934×720 |
| 411×813 | 45.9 / 70.8 (5) | 37.5 / 70.9 (3) | 1080×1920 → 720×1424 |

最終固定舞台層重新測量如上，兩種手機軟體渲染 p95 均改善；桌面 p95 單次樣本增加 4.1 ms，但最大值與超 50 ms 次數均下降，不把這一小段視為統計上確定的回歸或改善。 · Final fixed-stage-layer measurements above improve mobile p95; the single desktop sample is 4.1 ms higher at p95 but lower in max and count over 50 ms. A short sample alone cannot establish a statistically robust gain or regression.

桌面既有 1280×720 標題及規則基線不更換。標題差異 0.41%（文字光柵及焦點邊緣）、規則 0.13%（細文字），人工核對仍為相同原畫、構圖和功能。新增 `test/baseline/play-phone-landscape.png`、`play-phone-portrait.png`、`play-tablet-portrait.png` 三張滿手牌基線，檢查安全區、牌列及平板正向位置；最終獨立複跑三張皆 0.00% 差異。 · Do not overwrite the desktop title/rules references: small glyph/focus-raster differences were reviewed. Three new full-hand reference images cover landscape phone, portrait phone and upright tablet; a final independent comparison returned 0.00% for each.

### 實際裝置 · Physical devices

Windows Chrome 158／RTX 5090 Laptop GPU，硬體 WebGPU。Galaxy Z Fold7（SM-F966U1）Android 17／Chrome 157.0.8103.78，外螢幕實際 1080×2520，DPR 2.625，使用實際裝置瀏覽器觸控事件。 · Windows hardware WebGPU and the physical Fold7 external display, tested with browser-delivered touch rather than an emulated device.

Fold7 最終版（固定舞台根改至原生 UI 層）10/10：先直向捲動規則（offset 0→157.66），開局語音暫停時轉橫向，回到同一對局／引擎／語意樹／焦點，暫停語音時間 0.314239 s 不變、繼續後同片段至 0.555781 s，再選牌轉向（`view7:tile-44` 保持）、碰、槓、兩選項吃牌、自摸 3 台、結算（1900／−600／−700／−600）、刷新讀回一局戰績。無瀏覽器錯誤。實際截圖確認暫停轉向後的手牌完整、底圖與牌列對齊。測試後恢復原方向、瀏覽器控制及裝置租約。 · All ten physical-device assertions passed with the final fixed-stage UI layer, including rules scroll, paused rotation, identity and live voice retention, two-choice Chow and a legal self-draw, settlement, record reload, and visual hand alignment. Device state and lease restored.

| Fold7 外螢幕 / External display | rAF samples | p95 / max ms | >50 ms |
|---|---:|---:|---:|
| 873×325 landscape | 90 | 16.7 / 16.7 | 0 |
| 411×813 portrait | 90 | 16.6 / 16.7 | 0 |

PC 最終版完整合法一局（1280×720、實體 RTX 5090 Laptop GPU、Chrome 158.0.8127.37、WebGPU）11/11；原生 UI 當前手牌、吃牌及結算三況 0/0，同一語音、飛牌中轉向、結算、讀檔均通過；90 幀 p95 4.3 ms / max 8.4 ms、>50 ms 為 0。採用實際硬體瀏覽器與鍵鼠事件，不是軟體渲染成績。 · Final physical PC legal hand: 11/11 and all three state checks clean, including live motion/audio and saved record. Hardware WebGPU, 90 frame intervals, 4.3 ms p95, 8.4 ms max, no sample over 50 ms.
### 六種尺寸的合法對局 · Six legal complete hands

以固定亂數 seed 288 開新局，從實際 UI 出牌、叫牌及選牌，不修改規則、手牌、生命週期或存檔內容。873×325、852×393、411×813、768×1024、1024×768、1920×1080 六種尺寸各 11/11，共 66/66；同一事件順序包含碰、四次打出、槓、兩種吃牌候選、第五次打出及自摸。每局 3 台、四家收支 1900／−600／−700／−600（守恆）並讀回戰績。每種尺寸確認同一 play、match、view、語意樹、具名焦點及語音片段；暫停轉向時固定原生 UI 層四角投影偏差小於 0.1 舞台像素，飛牌轉向後只落牌一次。1024×768 與 1920×1080 的軟體瀏覽器在初次觀察 240 ms 動畫時回呼太晚，僅在複驗飛牌觀察期間將時鐘設 0.25 倍，再恢復快測速度；並未變更遊戲判定。英文額外九個選單畫面亦為 0/0。 · A seeded fresh legal hand at each six sizes, actual view input, 66/66 assertions. Both chow choices, pongs, kongs, self-draw, rotation, focus, same live voice, flying tile continuity, zero-sum settlement and record reload passed; no browser errors. For the two large software-rendered viewports, only the short in-flight observation was repeated at a quarter animation-clock speed after the original observation missed the 240 ms window. Gameplay and adjudication are unchanged. Nine English menu checks also passed.
原有 Node 回歸 34/34（包含新設計密度與安全區測試），完整瀏覽器驗收 69/69（原有東風圈、吃／碰／槓／榮和／自摸、壞檔及中英文）。根目錄能力矩陣重建及 `--check`、TaiwanMahjong 嚴格標準檢查、整庫預設標準檢查及展示站 24 案例／72 圖檢查均成功；整庫預設檢查仍列出其他七個 Demo 既有測試／基線缺口，未改動它們。 · All 34 Node tests and 69 original browser assertions passed, along with the generated capability matrix, targeted strict standard, default repository standard and showcase (24 cases, 72 pictures). Seven unrelated games retain pre-existing test/baseline gaps from the default report.

### 復跑與限制 · Reproduce and limits

```sh
node --test test/*.test.mjs
node test/accept.mjs
node vendor/egret.mjs verify --screens --out <new-output-directory>
node test/screens.mjs --mode screens --out <new-output-directory>
node test/screens.mjs --mode rounds --out <new-output-directory>
node test/screens.mjs --mode menus --lang en --only phone-small,phone-notch-wide,tablet --out <new-output-directory>
node test/screens.mjs --mode baselines --compare yes --out <new-output-directory>
node test/screens.mjs --mode perf --out <new-output-directory>
```

此輪為候選分支的本機驗收，尚未部署到公開頁。模擬 884×1104 折疊屏與平板已測，但沒有操作實體 Fold7 內螢幕或實體平板，亦未覆蓋真實瀏海遮蔽、Safari、Firefox、微信內建瀏覽器、真人讀屏、實體手柄、未輔助手指操作、揚聲器主觀混音。rAF 為短時瀏覽器前景採樣，不代表整局或隔離 GPU 時間；未重做四風完整一將的真機測試。存檔維持既有設定與戰績格式，不新增進行中牌局快照。 · Validation was on the candidate branch, not public deployment. Foldable and tablet profiles are emulated, not physical inner-display/tablet tests. Real cutouts, Safari, Firefox, WeChat, live screen-reader speech, controller, unaided finger input and subjective speaker mixing are untested. Short foreground rAF does not measure isolated GPU work or certify a full match; no fresh four-wind hardware run. Saved settings and records retain their original format, not a live-hand snapshot.
