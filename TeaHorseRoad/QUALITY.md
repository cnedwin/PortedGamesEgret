# 品质验收 · Quality — Tea Horse Road · 茶马古道

按 [QUALITY-CHECKLIST.md](../docs/QUALITY-CHECKLIST.md) 验收。自动项由 `node tools/quality.mjs TeaHorseRoad` 测量并写入本文件；人工和真机项没有跑过的写「未运行」。

Checked against QUALITY-CHECKLIST.md. The automatic items were measured by `node tools/quality.mjs TeaHorseRoad`, which writes
this file; items by hand or on a device are marked not run until someone runs them.

## 测量环境 · Where it was measured

- 日期 · Date: 2026-11-27
- 浏览器 · Browser: 无头 Chromium 158.0.8127.37，SwiftShader 软件渲染（没有显卡） · headless, software rendering, no GPU
- 机器 · Machine: Windows 本机 · Windows PC, win32 x64, Node v26.7.0
- 首屏一项的限速 · Start-up throttling: 下行 10 Mbps、上行 5 Mbps、往返 40 ms，CPU 降速 ×4 · down 10 Mbps, up 5 Mbps, 40 ms round trip, CPU slowed ×4
- 帧时间是软件渲染下的数字，只说明无头环境里的情况，不代表真机 · Frame times are from software rendering and say nothing of real devices.

## 结果 · Results

| 编号 · Item | 标准 · Standard | 方式 · How | 结果 · Result | 测量 · Measured |
|---|---|---|---|---|
| T1 | 触屏走完主流程 · The whole game by touch | 真机 · device | 未运行 · not run |  |
| T2 | 触控区 ≥ 44×44 CSS px · Touch targets ≥ 44 × 44 CSS px | 自动 · automatic | 达标 · pass | 3 controls, all at least 44×44 |
| T3 | 不误触下拉刷新和双击缩放 · No pull-to-refresh or double-tap zoom | 自动 · automatic | 达标 · pass | overscroll held, touch-action none, double-tap zoom off |
| F1 | 桌面帧时间 p95 ≤ 16.7 ms · Desktop frame time p95 ≤ 16.7 ms | 自动 · automatic | 不达标 · fail | p95 287.5 ms over 29 frames |
| F2 | 中端手机帧时间 p95 ≤ 33 ms · Mid-range phone frame time p95 ≤ 33 ms | 真机 · device | 未运行 · not run |  |
| L1 | 首屏 ≤ 3 s（10/5 Mbps、40 ms、CPU ×4） · Start-up ≤ 3 s (10/5 Mbps, 40 ms, CPU ×4) | 自动 · automatic | 达标 · pass | 1.5 s to the first playable screen, 3.3 MB |
| O1 | 横竖屏与窗口尺寸 · Orientation and window sizes | 自动 · automatic | 达标 · pass | 1280×800, 390×844, 844×390, 768×1024 and live resizing: fits, no errors |
| I1 | 中英文全可切换，英文下无中文 · Both languages; no Chinese left in English | 自动 · automatic | 不达标 · fail | no way to choose English found |
| I2 | 画布上的字也随语言切换 · Words drawn on the canvas follow the language | 人工 · by hand | 未运行 · not run |  |
| I3 | 长英文不溢出 · Long English does not overflow | 自动 · automatic | 达标 · pass | no page text cut off at 390 px in English |
| A1 | 键盘可到达控件，焦点可见 · The keyboard reaches controls; focus shows | 自动 · automatic | 达标 · pass | Tab → "茶马古道 · Tea Horse Road" (outline) |
| A1m | 只用键盘走完主流程 · The whole game by keyboard alone | 人工 · by hand | 未运行 · not run |  |
| A2 | 读屏读出主要按钮 · A screen reader names the main buttons | 自动 · automatic | 达标 · pass | 2 named controls, e.g. button "出发 新的旅程", button "设置" |
| A3 | 尊重 prefers-reduced-motion · prefers-reduced-motion is honoured | 自动 · automatic | 达标 · pass | the code reads prefers-reduced-motion or offers a setting |
| S1 | 存档损坏不崩溃 · A broken save does not crash | 自动 · automatic | 达标 · pass | unreadable text; started without an uncaught error (keys: tea-horse-road) |
| S2 | 存档版本不匹配不崩溃 · A save of another version does not crash | 自动 · automatic | 达标 · pass | a save from a newer version; started without an uncaught error (keys: tea-horse-road) |
| S3 | 存储不可用不崩溃 · Refused storage does not crash | 自动 · automatic | 达标 · pass | storage refused: started without an uncaught error |
| S4 | 存档出问题时提示并可重开 · A save problem is told and a fresh start offered | 人工 · by hand | 未运行 · not run |  |
| E1 | 无控制台错误 · No console errors | 自动 · automatic | 达标 · pass | 0 errors |
| E2 | 资源失败有错误界面和重试 · A failed file shows an error and a retry | 自动 · automatic | 不达标 · fail | 14 files refused; no uncaught error; no error screen with a retry |
| E3 | 切到后台再回来不出错 · Hidden and shown again without errors | 自动 · automatic | 达标 · pass | no errors; the game or the engine loop watches visibility |
| E4 | 切回后声音和计时正常 · Sound and timers right after coming back | 真机 · device | 未运行 · not run |  |

自动项不达标 · Automatic items failing: F1, I1, E2。真机项（T1、F2、E4）和人工项（I2、A1m、S4）未运行，除非上表另有记录 · Device and by-hand items were not run unless the table says otherwise.

## 人工与真机结果 · Dedicated browser acceptance and device scope

### 2026-11-27 正式引擎升级与原生屏幕适配 · Official engine upgrade and native screen fitting

- **正式版本 · Version:** PortedGamesEgret 基线 `461d9d51`；Egret `8637ace9a40667714abd6d74157e8dcf4587232d` → `72be4978226951c0727262e81da87f1aa7e15242`（#524、#525）。原 16 入口由官方工具生成 323 个文件；WebGL2Host.js、webgl2Native.js、PhysicsMesh3D.js 去除最后 sourceMappingURL 后 **3/3 与官方 dist 字节完全相同**，无本地补丁。 · Official, unchanged generated engine copy. [升级和逐文件哈希 · Upgrade receipt](test/evidence/upgrade-72be497.json).
- **独立升级验收 · Upgrade gate:** 旧版 Node 36/36；仅替换引擎、保持旧 UI 时 Node 36/36、官方 verify 7/7，通过页面、资源、画布、绘制、帧循环、输入、音频检查；此后才修改 UI。最终 Node 36/36，原来两个守护测试直接验证正式实现（Node 模拟有/无 KHR）。 · Existing tests pass before upgrade, after the vendor-only change, and after the UI migration.
- **尺寸选择 · Design:** 采用固定 1066×600 横版设计、`fit: 'expand'`；844×390 新旧实际舞台均为 1298×600，比例均为 0.65，驾驶 HUD 原字号没有因固定设计而缩小。HUD 控件最小实际宽/高从 42.90×40.30 CSS px 到 46.80×46.80 CSS px。旧版标题截取仍含加载淡出，因此只采用实际稳定 HUD 作视觉对照。 · Same short-landscape scale, larger targets; only stable driving snapshots are compared. [实际 HUD 对照 · Real comparison](test/evidence/native-screen-844-before-after.jpg) / [详细尺寸 · Geometry](test/evidence/short-landscape-comparison.json).
- **布局 · Layout:** `game.screen.safe` 和 `game.onScreenChange` 驱动同一叠加层的原地重排，贴边 HUD 和控件避让安全区，遮罩铺满整个舞台。托管卡片保持叶节点源与宽度不变，更新布局高度、原点，并在各叶的作用域中创建原生控件和文字。首轮实际暂停转屏触发 UI_CONTENT_INVALID（叶内容的子节点归属外部作用域）；依据引擎契约修复后重新通过，未重建卡片或叠加层。语义投影只建一次，按 `sync({width,height})` 更新逻辑尺寸及边界。 · Responsive screen plan with stable UI identities, correct leaf ownership and in-place semantic projection.
- **测试环境 · Environment:** Windows 本机、安装的 Chromium 158 / SwiftShader 软件渲染；安全区、触摸及 DPR 均由浏览器模拟。在同一软件浏览器的 WebGL2 测试上下文确认 `KHR_parallel_shader_compile` 不可用。只证明浏览器无 KHR 的路径；有 KHR 的契约由 Node 模拟守护测试覆盖，不是有显卡的设备实测。 · No physical device/GPU or measured parallel link path.

#### 八屏检查 · Eight-screen checks

普通官方 `verify --screens` **8/8**；`verify --screens --play test/play.mjs` **8/8，59/59 检查点**。包括 56 个标题、设置、HUD、暂停、驿站、扎营、保存状态及 3 个真实转屏提示。没有官方报告错误、警告或引擎警告。此固定引擎版本对 World3DOverlay 不发布原生控件收据（ENGINE-NOTES 30），故脚本独立读取真实引擎语义节点、实际投影 DOM 矩形与安全区，每个触屏规格 37 个、桌面 32 个，共 291 次活动控件边界检查均通过。 · All 59 captured states pass, including actual rotate prompts. No synthetic native receipt is supplied; game-published semantics and actual projected rectangles are checked separately.

| 机型 · Profile | 普通八屏 · Plain | 错误/警告 · E/W | 流程检查点 · Route | 错误/警告 · E/W | 最小触控边长 · Min (CSS px) |
|---|---|---:|---:|---:|---:|
| phone-small 375×667 | pass | 0/0 | 8/8 | 0/0 | 45.00 |
| phone-notch 393×852 | pass | 0/0 | 8/8 | 0/0 | 45.00 |
| phone-notch-wide 852×393 | pass | 0/0 | 7/7 | 0/0 | 45.85 |
| phone-tall 360×800 | pass | 0/0 | 8/8 | 0/0 | 45.00 |
| tablet 768×1024 | pass | 0/0 | 7/7 | 0/0 | 50.43 |
| tablet-wide 1024×768 | pass | 0/0 | 7/7 | 0/0 | 67.24 |
| foldable 884×1104 | pass | 0/0 | 7/7 | 0/0 | 58.05 |
| desktop 1920×1080 | pass | 0/0 | 7/7 | 0/0 | — |

- **流程 · Play:** 隔离新档，实际点击出发、跳过开场、触屏 CDP 或键盘油门、暂停、恢复，额外检查设置的单选及开关。实际驾驶一段后，为缩短软件渲染测试时间，用已有 `place()` 测试钩子定位到首驿站前 35 米，等待地块并用原来的物理和到站触发推进最后一段。到站存档、选篝火、放置、旋转模式、保存均经正常逻辑与点击完成；没有直接调用 arrive() 或写入营地存档。此非从起点自然驾驶全程 1.6 km 的测试。 · Fixture-aided final approach after actual initial driving; normal station trigger, pointer operations and durable saved camp.
- **竖屏 · Portrait:** 三款手机正式画面保留转屏提示与横屏全屏入口；测试截图后只在隔离测试页面暂时隐藏提示以检查底层原生布局，流程结束恢复。竖屏平板和展开折叠屏直接操作，不显示提示。 · Actual prompts are captured separately; underlying phone layout is inspected in isolation, not a claim that phones play upright in production.
- **同一页面转屏 · Rotation:** 852×393 → 393×852 → 852×393，驾驶、暂停、驿站、扎营 **4/4 轮、8 次实际变更**。每轮相同 game、overlay、projection、HUD、卡片、焦点、选项、状态和存档，零浏览器诊断。营地空白处实际 CDP 触摸穿透叠加层（3D 画布收到 1 次 pointerdown），相机移动 23.16 世界单位，选中物件与存档保留。转屏后控制最小边长 46.07 CSS px。 · Object identity, focus, choice, camp editing and pass-through to the native 3D orbit controls are preserved in all four states.
- **旧档标题 · Saved title:** 带首站进度、历史最佳成绩的隔离 v1 存档在 852×393 模拟刘海布局实测通过，三个按钮均为 210.91×47.16 CSS px，成绩与底部文字不重叠。 · A separate valid-save fixture retains all options and readable best record. [截图 · Screenshot](test/evidence/native-screen-saved-title.png).
- **截图 · Captures:** [普通八屏 · Plain eight](test/evidence/native-screen-plain-eight.jpg)；[竖屏流程 · Portrait checkpoints](test/evidence/native-screen-portrait-checkpoints.jpg)；[横屏流程 · Landscape checkpoints](test/evidence/native-screen-landscape-checkpoints.jpg)；[旋转 · Rotation](test/evidence/native-screen-rotation-checkpoints.jpg)。图版取自官方 verifier 及旋转脚本真实截图，红带表示模拟不可用区域，未更换基准图。[逐状态测量 · Evidence](test/evidence/screen-fit-72be497.json).
- **通用品质 · Generic quality:** 最终 `node tools/quality.mjs TeaHorseRoad` 为 13/16 自动项通过、3 个既有缺口仍未达标（F1、I1、E2），6 项设备/人工未运行；exit 1，按实际工具结果保留。第一次本机复跑 E1/E3 受隐式网页图标请求 404 影响，为此在 index.html 增加自包含数据 SVG 图标；再次运行 E1/E3 恢复零错误，界面和玩法不变。完整流程和转屏在这个仅浏览器元数据的小改动前已通过；最终复验 Node 36/36、单窗口浏览器 7/7、普通八屏 8/8（0 错误/警告）。软件 F1 p95 287.5 ms（29 样本）、首屏 1.5 s/3.3 MB，不能外推真机性能。 · Existing F1/I1/E2 limits remain. The implicit favicon 404 in the generic harness was eliminated by an inline icon; final E1/E3 pass without altering the game runtime.
- **引擎反馈 · Engine notes:** #29 单值标记 margin 仅约束离屏锚点而非整个标牌，以最大安全区 CSS px 内缩重新注册标记；#30 八屏工具缺少 World3DOverlay 控件收据；#31 guide 解析 CRLF 失败，项目的 .gitattributes 保留正式生成文本的 LF 字节。无新 vendor 补丁。 · Three genuine limitations recorded, with no generated-file modifications.
- **未覆盖 · Not covered:** 本轮不是真机验收。未测实体 PC GPU、手机、真实刘海/圆角、Safari、Firefox、微信、物理手柄、真实读屏软件及有 KHR 的 GPU 并行链接；未自然驾驶完整 4.6 km 旅程。 · No physical device, GPU, gamepad, actual screen reader, other browser, actual notch or whole-route natural play in this screen-fit round.

**复跑 · Reproduce**（TeaHorseRoad 目录 / from the game folder）：

```sh
node --test test/*.test.mjs
node vendor/egret.mjs verify --out <new-directory>
node vendor/egret.mjs verify --screens --out <new-directory>
node vendor/egret.mjs verify --screens --play test/play.mjs --out <new-directory>
node test/rotation.mjs <new-directory>
```

可选 `TEA_SCREEN_PLAY_REPORT` 指定新的逐机型控件输出目录。官方 CLI 可通过 `--playwright` 指定已安装浏览器的 Playwright 入口；本机适配器仅设置 Chromium 可执行路径，保留正式 SwiftShader 验收参数。根目录运行 `node tools/quality.mjs TeaHorseRoad`。 · Use fresh output directories. The optional launcher adapter only selects the installed executable; no changes to vendor or game tests.

### 2026-11-27 公开版 #278 真机观察与矮屏修复 · Public #278 hardware observations and short-screen fix

- **发布版本 · Public build:** Pages run 45948866514，main `24a723c03acf3af3c40b995d8bee96bbc97e72ff`，引擎 `72be497`，13/13 个实际 HTTPS 文件匹配合并提交。 · The published runtime was verified byte-for-byte before both physical tests.
- **PC 真机 · Physical PC:** Windows、RTX 5090 Laptop GPU / ANGLE D3D11、Edge 158、原生 WebGL2 3D 和 2D、高画质（KHR 扩展存在）。266/266 功能断言，驾驶、暂停、驿站、扎营在实际桌面窗口 852×393 → 393×852 → 852×393 各一轮，保持同一 game、overlay、projection、HUD、卡片和可见键盘焦点。实际键鼠驾驶 45 秒至 918.86 m，之后用隔离接近段定位到首站前 35 m，再以实际键盘推进正常到站触发；空白处鼠标拖动相机、营地放置、保存、刷新及继续旅程正常。零页面和资源错误。逐图查看另发现 393×852 非触屏 HUD 的字幕与速度表视觉重叠。 · Functional checks pass, but visual inspection finds a narrow desktop subtitle/gauge collision (not detected by interactive hit-bound assertions).
- **Fold7 真机 · Physical Fold7:** Samsung SM-F966U1 / Android 17 / Chrome 157 / Adreno 830 / WebGL2 Low；实际外屏 873×325 横屏 ↔ 411×813 竖屏，DPR 2.625，不是桌面模拟。四轮实际方向变化保留界面身份、焦点、状态、营地及存档，真实 CDP 触屏油门、方向、释放中立、刹车和空白相机拖动正常。营地保存并刷新字节一致。诊断记录 228 项，其中两项失败：873×325 的设置卡片最小控件高 42.31 CSS px（单选约 43.52），以及续档标题设置按钮下缘到 331.50 CSS px，超出可用高度约 6.5 px。保留真实失败，不以诊断路线冒充通过。设备原始方向、保持唤醒、前台及独占锁恢复。 · A real short-browser viewport not covered by the original eight simulated profiles. The two measured faults are preserved as failures.
- **本次修复 · Repair:** `src/ui/card.mjs` 根据安全高度先收紧卡片内边距与行距，维持 45 CSS px 的目标缩放；`src/ui/screens.mjs` 根据实际安全高度优先预留所有按键和 footer，再收紧标题装饰区，覆盖有续档及可选成绩的布局；`src/ui/hud.mjs` 在非触屏字幕与速度表水平范围相交时把字幕移到仪表上方。常规空间保留原样，控件与托管叶节点原地重排，不修改规则、存档或 vendor。 · Compress decorative spacing rather than touch areas, reserve persistent title actions/footer, and avoid the actual gauge intersection.
- **性能口径 · Cadence:** 原公开版 PC 无截图的起步、45 秒驾驶、营地样本分别 p95 16.8 / 20.9 / 8.5 ms，最大 29.2 / 33.4 / 12.6 ms；Fold7 3 秒无截图驾驶样本 181 帧间隔，p95/max 16.7/16.7 ms。均无 >50 ms 间隔。这是 rAF，非 GPU 执行时间，非全局性能比较。 · Physical browser cadence estimates from bounded screenshot-free windows, not GPU timing or full-game performance.
- **证据 · Evidence:** [原公开版真机精简记录](test/evidence/physical-278-baseline.json)。两个真机均使用隔离测试存档与真实浏览器输入；手机旋转提示保持可见，近站测试定位及软件模拟测试与自然完整旅程严格区分。 · Scoped public-build physical test data without unrelated device information.
- **候选回归 · Local candidate regression:** 新增 4 个布局单测，`node --test test/*.test.mjs` 40/40；`node test/short-screen.mjs <new-dir>` 8/8 实际软件浏览器检查点、零错误。873×325 设置 9 个活动控件最小 45.00 CSS px，有首站续档及有无最佳记录的三按钮标题最小 46.29 CSS px，均在安全区。325×873 及原 852×393 刘海场景正常；原生卡片和投影保留。393×852 非触屏字幕使用已有剧情行的隔离 UI 测试，实际字幕与速度表显示边界留有约 4.85 CSS px 垂直空隙。 · Forty Node checks plus eight targeted software-browser checkpoints. Saved-title and subtitle fixtures are explicit; physical public revalidation is separate. [专项数据](test/evidence/short-screen-regression.json).

### 引擎 #535：Fold7 矮横屏及原生控件收据 · Fold7 cover viewport and native overlay receipts (2026-11-27)

- **正式引擎 · Official pin:** `72be497` → [`2fbe55630b1f67c6b1584d73290c19cb0aa0ae24`](https://github.com/cnedwin/Egret_rebuild/commit/2fbe55630b1f67c6b1584d73290c19cb0aa0ae24)，引擎 [#535](https://github.com/cnedwin/Egret_rebuild/pull/535) 的 M0 保护检查通过后正式合并。原 16 入口由工具生成 327 文件；报告器、指针、私有状态及四个原生控件模块（7/7）去掉 sourceMappingURL 后与官方构建字节一致。 · Official tool-generated copy, no local patches; seven relevant emitted files checked byte-for-byte.
- **先复现 · Reproduction:** `0a8da42e` 的运行时配合新增规格的测试工具，在 873×325 的实际游戏软件浏览器流程中，标题 2、设置 9 项，但驾驶仅 5 项原生控件，漏掉有真实触摸命中区而无语义激活动作的「方向 Steering」。修复后驾驶为 6 项。没有伪造原生收据。 · The former runtime with the new profile reproduced a missing steering control: 5/6 HUD targets, strict route failed. The official engine now reports all six.
- **正式复测 · Official rerun:** Windows 上实际 Chromium 软件渲染（SwiftShader），`node --test test/*.test.mjs` **40/40**；`node vendor/egret.mjs verify --screens --play test/play.mjs --out <new-dir>` **9/9**、全部 66 检查点。63 个普通状态的 328 个活动语义节点与实际原生命中收据名称和数量逐项对应；三个竖屏转屏提示另有 6 个底层标题收据。总计原生 334 个矩形，无安全区、44 CSS px 或重叠告警，无漏报/重复/额外目标。每个检查点要求新鲜非空收据。 · Headless Chromium software browser, not physical-device evidence; exact fresh native receipts and independent semantic checks.
- **复跑口径 · Method:** 标题、设置、实际点击/油门、暂停继续、首站、营地放下篝火并旋转模式、保存返回。用已有开发者 hook 进行近站测试定位，随后由正常到站触发进行游戏，非全程自然驾驶。竖屏手机真实提示截图后，仅隔离验收临时隐藏提示检查下层布局，正式游戏仍要求横屏。 · Normal controls/save, with disclosed near-station fixture and isolated inspection underneath the portrait instruction.
- **数据 · Evidence:** [逐规格、逐状态及原始报告哈希](test/evidence/native-control-receipts.json)；[九屏最终画面](test/evidence/native-controls-nine-screens.jpg)。新规格为真实 Fold7 外屏 Chrome 的有效 CSS 视口 873×325、DPR 2.625，模拟内缩为零，不代替 884×1104 展开屏或实际刘海验证。 · Measured cover viewport profile, not a physical cutout simulation.

| 规格 · Profile | 尺寸 · CSS px | 检查点 · Checkpoints | 实际原生矩形 · Native rectangles | 独立交叉检查 · Matched controls | 错误/告警 · E/W |
|---|---:|---:|---:|---:|---:|
| phone-small | 375×667 | 8 | 39 | 37 | 0/0 |
| phone-notch | 393×852 | 8 | 39 | 37 | 0/0 |
| phone-notch-wide | 852×393 | 7 | 37 | 37 | 0/0 |
| phone-tall | 360×800 | 8 | 39 | 37 | 0/0 |
| tablet | 768×1024 | 7 | 37 | 37 | 0/0 |
| tablet-wide | 1024×768 | 7 | 37 | 37 | 0/0 |
| foldable-cover-wide | 873×325 | 7 | 37 | 37 | 0/0 |
| foldable | 884×1104 | 7 | 37 | 37 | 0/0 |
| desktop | 1920×1080 | 7 | 32 | 32 | 0/0 |
| **合计 · Total** | — | **66** | **334** | **328** | **0/0** |

- **尺寸与转屏 · Geometry and rotation:** 最小原生命中边长约 **45.00 CSS px**（44.999284，CSS 布局浮点误差），矮横屏方向滑条 176.14×69.43 CSS px。与正式合并树字节相同的候选（`90fd8724`）专项转屏 4/4、8 次屏幕变更、空白拖动、营地保存及矮屏短测试 8/8 均通过。 · Candidate and merge tree identities are identical; actual software-browser rotation and short-screen checks are separate from the 66 checkpoint rerun.
- **通用品质 · Generic quality:** 同一候选源码树的 `quality.mjs --no-write --json` 仍为 13/16 自动项通过，F1/I1/E2 三个已知缺口未达标（软件 p95 454.2 ms / 22 帧、无独立英文切换、资源加载失败无重试页），exit 1；6 项设备/人工未执行。未更新基准图，未把软件渲染数值当作真机性能。 · Existing generic failures remain separate; the capture does not claim hardware cadence or all-browser acceptance.

## WebKit 手机兼容回归 · Mobile WebKit compatibility (2026-11-28)

- Windows Playwright WebKit 26.6、iPhone 15 Pro 横屏配置（734×343 CSS px）：旧版依次复现无 Gamepad API、无 Web Audio API 导致启动中断，以及 `TEXT_MEASURE_FAILED`。对无 Gamepad 的浏览器保留键鼠、触屏；音频不存在时先保留完整玩法、禁用音频硬件解锁，浏览器标准或旧前缀 AudioContext 可用时仍启用音效；使用正式工具更新引擎副本。增加缺失/存在/旧前缀测试。 · Optional hardware APIs are capability-checked, not emulated.
- 初步候选实际触屏「出发」→「跳过开场」可到驾驶，但 3D 合成仍为空。Renderer 记录 208 帧、242 draw calls、276,526 triangles，另次实际 render 后读回中心 RGBA [187,152,111,255]，GL error 0；隐藏叠加层、CSS 图层提升和中档冷启动均无效。只改变引擎正式 `dynamicResolution: false` 后同一路线恢复实拍世界。最终仅移动 Apple WebKit（含 iPad 桌面模式）禁用自适应分辨率，低档实际画布 734×343，而此前降到 440×205。 · The single-option A/B isolates the dynamic resize path; the former lower backing resolution was associated with a blank composited canvas despite successful rendering.
- 最终无插桩本地候选再次冷启动，标题与实际触屏两次后 3D 驾驶画面可见，道路/植被/茶货/货车/HUD 及五个触控按钮均存在，茶货 72/72，时速随模拟进程变化，JS、控制台、HTTP 错误均 0，Node 47/47 通过。保留三个画质档和非移动 WebKit 的动态分辨率；固定分辨率可能提高像素负担，未宣称真机帧率改善。 · Final uninstrumented screenshot and actual touch route confirm visible scene and functional HUD; fixed resolution can increase pixel cost, so no device performance claim is made.
- 不是实体 iPhone 或 Safari 系统验收，未跑完全程、未测实体扬声器或移动 GPU。 · Physical iOS, full journey, speaker and device GPU remain unverified.
