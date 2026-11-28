# 首次进入江湖性能专项 · Cold realm entry performance

## 方法 · Method

使用全新隔离浏览器上下文及 seed 7，新建少林门派、跳过序章、完成传承、关闭掌门手札，在初日暂停经营后，从实际底部导航进入江湖观览；从输入前开始记录，等待真正 `stage.presented` 后继续采样。PC 为 Windows RTX 5090 Laptop GPU、Chrome 157、D3D11、高画质、1280×800；手机为实际 Samsung Galaxy Z Fold7 (SM-F966U1)、Adreno 830、Chrome、低画质、873×325 CSS 横屏、DPR 2.625。先纯 RAF/LoAF，随后独立进行 GL 调用和正式 `renderer.measureFrame` 计时，再异步读取 GPU query；测量期间不截图，不使用 `finish` 或同步像素读回。实际设备通过隔离本机服务、真实浏览器输入和设备租约测试，不是尺寸模拟。 · Fresh isolated browser contexts, seed 7, first-day Shaolin, paused time, actual native navigation from the seat into the realm. Measure through the first accepted 3D frame and steady operation; separate light RAF, GL instrumentation, and the engine's asynchronous per-pass timing; no screenshots during samples. Device inputs are real hardware-browser events, not viewport simulation.

## 根因 · Root cause

- PC：旧正式引擎 `dfd8cc6` 三次冷首次最大 RAF 116.7 / 104.0 / 112.6 ms；热再次进入 41.6 / 33.2 / 41.7 ms。两次独立细测首次 3D render CPU 42.8 / 44.3 ms，其中 1,950 次 `bufferData`、34.79 MB、调用 CPU 28.2 / 31.2 ms。第一次真正绘制没有编译/链接新的材料程序；八组 shader 预备在进入前进行。正式 per-pass CPU shadow 25.6 / 37.5 ms、GPU query 58.4 / 74.0 ms。 · Cold lazy geometry allocation/upload was material; shader preparation was asynchronous.
- PC 的 Chrome 追踪将一次 97.1 ms LoAF 对齐到 3D render 35.1 ms 后 2D `GLNativeSession.workingAttachment` 的 `getError` 40.4 ms（GLES2::GetGLError → WaitForCmd → CommandBufferHelper::Finish → WaitForGetOffset），并观察到 GPU main deferred flush。这是共用 GPU 命令等待，不是独立的 Viz 抖动；保留原错误验证。 · The mandatory 2D validation query waited on the shared GPU command stream; not an independently proven compositor defect.
- Fold7：两次旧版入场最大帧间隔 66.3 / 66.4 ms；真实 CPU profiler 在触控释放监听中记录约 69.7 ms（其中游戏 action 近 0 ms、render 1.0 ms、syncPicture 0.4 ms；首个地形 slice 尚未开始）。主要采样来自引擎 Canvas 文字度量、绘制和读回及富文本排版。 · Mobile input-stage text preparation is distinct from the desktop cold GPU phase.

## 几何准备同引擎对照 · Same-engine geometry preparation

引擎候选 `2b036072`，相同游戏源码，仅在 QA 中关闭/开启正式几何预备接口，交替三个全新进程；没有 GL 包装。 · Candidate 2b036072, alternating fresh processes, API off versus on, same source and engine, no GL wrappers.

| PC high | 首图 RAF (ms) | 进入全程峰值 (ms) | 输入至接受首图 (ms) |
|---|---:|---:|---:|
| API off | 91.7 / 91.7 / 95.7 | 91.7 / 91.7 / 95.7 | 1032.3 / 1024.8 / 989.9 |
| API on | 58.2 / 58.4 / 58.4 | 66.6 / 62.4 / 66.7 | 972.4 / 987.1 / 944.7 |

在另两轮细测中，首图 render CPU 6.4 / 6.9 ms，bufferData 23 次、0.984 MB、0.2 ms。222–227ms 几何预备与 378–432ms 着色准备重叠，无额外隐藏绘制；首次 shadow CPU 1.0 / 1.5 ms，GPU 35.4 / 40.3 ms。保留实际热回图、取消和 context restoration 4/4 验收。 · Geometry work moves into bounded loading slices and overlaps the existing shader wait, with actual cancellation, reuse and restore verified.

Fold7 低档单独开启几何准备反而增加全段上传量（12.35→16.43 MB），建图至首帧从 55–56ms 增至 153–154ms；最大帧仍约 66ms。故应用仅在已证明有净收益的高档启用；中档未作设备 A/B，维持按需上传。 · Do not force prewarming on low or unmeasured medium presets.

## 静态建筑复用 · Static building reuse

仅在同一江湖场景按建筑类型、等级、初始门派样式复用不可变模板的资源；节点、变换与场景归属保持独立。三档完整节点树、位置、每属性/索引数据、材质、实例和所有权刷新前后摘要逐项等价。静态高档几何数 450→293，数据 34.20→24.22 MB；PC稳态GPU缓存 561→404。独立 PC 两组对照首图约 62.5→62.6ms、66.7→50.2ms，总等待基本持平；不声称固定额外峰值收益。正式 per-pass GPU shadow 27.7/26.8ms，单次2D验证等待22.5ms；实际全pass自动合批/裁切后三角形统计允许变化，authored scene不变。 · Reuse deterministic immutable building resources by kind/level/style per realm; independent nodes. Verified same authored scene and real screenshots, without assuming every render-pass triangle count unchanged.

| Fold7 low, seed7 | 旧两轮 / Before | 建筑复用两轮 / Pool |
|---|---:|---:|
| 输入至地图首帧 · Tap to first frame (ms) | 714.4 / 795.2 | 582.1 / 596.2 |
| 场景生成 · Scene assembly (ms) | 626.6 / 711.1 | 500.0 / 493.8 |
| 建成至首帧 · Built to first (ms) | 56.3 / 55.3 | 54.7 / 57.0 |
| bufferData count / MB | 765 / 12.35 | 615 / 10.04 |
| 稳态 RAF p95 / max (ms) | 16.7 / 16.7 | 16.7 / 16.7 |
| draws / triangles | 144 / 599302 | 144 / 599302 |

平均进入等待下降约22%，上传字节下降约18.7%。手机量测均为真实设备，四轮隔离测试各12/12，零运行异常；两种现场图目视对照一致。文字处理仍是独立问题，需用后续专项验证。 · Mean device entry improves ~22%; bytes ~19%; input text work is independent.


## 联合候选原生文字预算 · Combined native text budget

在同一引擎候选 `593fc692`、同一静态建筑共享和低画质按需上传的配置中，只在独立 QA 副本去掉 `textWorkBudgetMs: 4`，进行两轮关闭 / 两轮开启的真实触屏对照。 · Same combined engine and game; only opt-in text budget omitted in QA control.

| Fold7 low | Budget off ×2 | 4ms budget on ×2 |
|---|---:|---:|
| 进入最大 RAF (ms) | 49.7 / 82.9 | 33.2 / 33.2 |
| 输入监听长段 (ms) | 58.6 / 74.2 | no entry LoAF |
| 入场 LoAF (ms) | 72.2 / 95.0 | none recorded |
| 点击→3D接受首帧 (ms) | 567.6 / 708.0 | 605.0 / 612.0 |
| 28/28可见单行文字全部就绪 (ms) | 99.1 / 136.8 | 267.4 / 268.4 |
| 2/2富文本提交 (ms) | 99.1 / 136.8 | 70.8 / 57.7 |
| scene draw / triangles | 144 / 599302 | 144 / 599302 |
| bufferData count / MB | 615 / 10.04 | 615 / 10.04 |

时间从实际点击记录起算。可见单行文字约晚130–169ms，但两轮仍比3D首图早约337–344ms。未把首图长帧挪到其后：首图后500ms最大RAF关闭35.6/19.3ms，开启16.7/34.5ms；稳态P95约16.7ms。开启第1轮后1.9、2.8秒仍有LoAF53.9/54.4ms（RAF未达50）。附加粗略control1不含完整段落探针，保留证据（最大66.3ms）。 · Text readiness trades ~0.15s versus the unpaced control, but precedes actual gameplay readiness; no claim that all LoAF disappeared. Actual English switch / native choice / close / seat / realm also passed; longstanding English headers on the shortest landscape can still clip.

联合 PC 高档两轮无GL探针：冷首次峰值49.9/58.3ms，p95 12.5ms，点击→首帧1030.5/927.3ms，热重进29.2/21.0ms。第三轮独立详细：首帧45.9ms、ready772.5ms、3D render CPU5.2ms、32 bufferData/0.994MB，293件预备138.1ms与shader307.6ms重叠，2D required query仍24.6ms。Canvas 551个真实操作 CPU总24.8ms，分布在点击后10–166ms，10ms bucket最大4.1ms；34个可见普通文字最晚166.8ms，6个富文本的探针未确认就绪时刻（实际截图内容可见）。实际鼠标地图拖动和画面无异常。 · Actual desktop candidate has no separate input LoAF in these two light runs; first GPU draw wait remains.

## 复测边界 · Limits

RAF 间隔是浏览器调度观察，不是独立 GPU 执行时间；GPU query 是通道内实际等待/执行区间，包含冷资源活动。各层探针与纯 RAF 组分开，不能把调用时间简单相加解释全部长帧。游戏数值、存档、画质参数不改。暂无其他 GPU、低端机、Safari、Firefox、微信及 WebGPU 后端的本轮物理测量。 · No claim that all long frames are gone, nor coverage for other hardware/browser backends.

## 回归：非江湖手札不延迟 · Scope regression

同一候选在 852×393 DPR3 软件 Chromium 上，手札从挂载至五个单行关键词全部就绪：未开启预算 93.6/92.4ms，全局开启4ms则 728.7/1098.8ms；原检查点会出现标题和按钮文字空白，虽多屏自动语义报告仍为通过。不能以延长截图等待掩盖该退步。因此最终游戏仅当正在显示无弹窗的3D江湖时采用文字预算（`textWorkBudgetWhen`）；标题、山门、手札及其他弹窗的新文字仍走即时路径，已排队任务保留原来的预算和取消语义。 · On identical software Chromium at 852×393 DPR3, the five guide labels took 93.6/92.4 ms with no budget, versus 728.7/1098.8 ms with the global 4 ms budget, leaving temporarily empty labels even while semantic checks passed. Scope new scheduled work to the modal-free 3D realm; ordinary screens retain immediate work. This is software timing, not a physical-device result. Verify the scoped design against the unchanged guide checkpoint and real realm path before release.

范围化候选 7fa78e7c 的最终同机位 PC 高档纯 RAF 两轮：冷首次/最大 41.7/45.8ms，p95 12.5/12.4ms，点击至真实首图 902.7/879.5ms；热重进最大16.8/20.8ms。无50ms及以上帧、无LoAF、零运行错误，真实鼠标拖图与四张事后截图正常。 · Scoped candidate 7fa78e7c: two real RTX runs, no sampled >=50ms or LoAF; actual map interaction and four screenshots passed. Narrow route-specific evidence, not a global performance guarantee.

作用域版手札实测（同一软件配置、检查点不延长）全部五项关键词110.3/112.5ms就绪，原检查点414.0/435.5ms无缺字；全局预算对照728.7/1098.8ms。 · Scoped guide retained its original checkpoint and all five labels were complete without changing goldens.

范围化 Fold7 实机（7fa78e7c，低档、同种子、873×325）两轮均12/12，进入至真实3D首帧609.9/653.2ms（旧714.4/795.2ms，均值约下降16.3%）；回合峰值RAF49.7/49.9ms（旧66.3/66.4ms）；稳态p95与最大16.7ms。615 bufferData/10.037MB，旧765/12.351MB；可见颜色绘制144次/599302三角形不变。仍有LoAF54.4/58.1ms，其中第二次在首帧后，不能认为所有长动画任务消失。实际触屏、地图文字和事后截图正常。 · The scoped candidate had no RAF sample >=50ms in either measured route; two browser LoAF reports remained. Touch, map labels and screenshots passed. This is a physical Fold7 route, not a simulated viewport.

## 正式主干复测 · Official merged engine follow-up

引擎 #563 经过全部正式 CI（含 Windows 四测试分片及 M0 merge-ready）合入 `8a88cf84e171bc753e0b9491aaf8216834f57ba9`，另有本地完整边界、文档测试309/309；游戏由 `tools/vendor-game.mjs` 生成正式副本，无补丁。正式 engine PC 两轮冷首图最大41.6/45.8ms，p95两轮12.5ms，点击至首图903.5/952.9ms，热回图16.7/20.7ms；无≥50ms RAF，第二轮仍有一个浏览器LoAF55.2ms（tick48.4、blocking0），实际鼠标拖动正常。Fold7低档正式一轮冷map12/12，点击至首图640.5ms，首图窗口p95/max16.7/33.2ms，全测量峰值35.0ms，稳定p95/max16.7/16.7ms、615×10.037MB、draw/tri144/599302，无记录LoAF及≥50ms。 · Verified official engine pin, not just the local candidate. Do not interpret the small sample as a guarantee that no long animation work remains.
