# 展示站 WebKit 兼容性验收 · Showcase WebKit compatibility

2026-11-28 · [公开展示站 · Public showcase](https://cnedwin.github.io/PortedGamesEgret/)

## 范围与环境 · Scope and environment

- 展示站的 24 个游戏逐一从公开入口启动，再对候选版本复跑标题及一条有意义的触屏路线；不将菜单烟测当成全流程通关。 / All 24 showcase entries were opened from their public URLs and rechecked against the candidate through the title and a representative touchscreen interaction. This is not a campaign-completion test.
- Windows Playwright WebKit 26.6 (build 2359), iPhone 15 Pro device profile, 393 × 659 CSS px, DPR 3; selected scenes also in landscape. Actual WebKit execution and browser touchscreen events, not physical iPhone/iOS Safari. Windows WebKit did not expose Web Audio, OffscreenCanvas or Gamepad in this run; this does not imply the same absence on modern iOS.
- 游戏仓库起点 · Game baseline: `949bf17334b6385933fff9b199765275df54ed3c`. 受影响的引擎副本通过 `tools/vendor-game.mjs` 从已提交、实测候选 `82561d6338a805f0e0459a2d5d42a284f9385b30` 生成。 / Affected vendors were generated from the tested committed engine candidate, not manually patched. [Engine PR #570](https://github.com/cnedwin/Egret_rebuild/pull/570) merged into main as `ca9ff2a0ef9ff67af7795f9600ba40668383a0a2`; all required checks passed, including the four Windows shards, Linux, macOS and the formatter. The exact tested engine commit is retained in the game vendors. / 引擎修复已合并，游戏副本保留实际验收的提交。

## 候选验证矩阵 · Candidate validation matrix

| 游戏 / Game | 旧公开版或候选初测问题 / Initial observation | 候选触屏路线 / Candidate touch route | Node |
|---|---|---|---:|
| FPS | Native labels absent | Title → settings | 119 |
| SnowTemple | Native raster state errors | Title → settings | 112 |
| FiveRegiments | Missing OffscreenCanvas | Title → settings | 172 |
| StarBanner | Missing OffscreenCanvas | Title → settings | 64 |
| NineProvinces | Missing Web Audio host | Title → settings | 195 |
| JY | IndexedDB Blob write failed | Data pack imported → title → settings | 75 |
| Rally | Text raster exception; stale static frame | Title → driver selection | 42 |
| FengshenChronicle | No observed blocking error | Title → role → city, unchanged | 53 |
| TeaHorseRoad | Missing audio/gamepad APIs; dark 3D presentation | Title → departure → full 3D drive, cargo and controls | 47 |
| Wulin | Missing text; stale loading frame | Title → prologue | 130 |
| jelly-pandas | Static title stale | Character selection → gameplay | 49 |
| LanternShadows | Native labels absent | Title → gameplay | 90 |
| FivePhases | Native labels absent | Title → battle | 53 |
| LoveElective | Native labels absent | Title → prologue | 65 |
| MechanismCity | Audio unavailable; intro film blocked | Title → skip / automatic fallback → first level | 67 |
| CanalWatch | Optional audio caused launch failure | Title → game | 35 |
| NezhaSea | Optional audio caused launch failure | Title → play | 40 |
| NightWardens | Gamepad and audio unavailable | Title → nights | 26 |
| TaiwanMahjong | No audio host; stale initial canvas | Title → dealing/table | 34 |
| PeachCreek | No audio host; title needed a second presentation | Title → save slots | 46 |
| SandScroll | No audio host | Title → painting selection | 36 |
| OperaDrums | No audio host | Title → settings; song requires real Web Audio | 39 |
| InquestScrolls | Still canvas did not present title | Title → prologue | 28 |
| LubanBridge | Empty labels and stale title | Title → first bridge | 44 |

游戏 Node 合计 1,661 项（24 个独立套件）全部通过（同步 main 后额外复跑 FPS 119/119、Wulin 130/130，保留并行提交）；共享经营模板另外 4/4。 / Game Node total: 1,661 across 24 independent suites after integrating concurrent main changes and rerunning FPS and Wulin; plus 4/4 for the shared management template.

## 修复机制与验收边界 · Fixes and acceptance boundary

- Native game labels use the browser's actual fresh Canvas text defaults if an older implementation omits optional reporting; an explicit incompatible state remains an error. Strict low-level text mode remains separate. / 原生游戏文字使用新建画布的真实默认状态，不合成假字形。
- For optional audio and gamepad facilities, feature-detect absent APIs rather than halting game initialization; keep normal paths on capable hosts. Rhythm playback remains unavailable without a real audio clock rather than inventing a score. / 非必需音频、手柄能力有明确降级；节奏游戏不伪造声音或分数。
- OffscreenCanvas is optional in two browser texture builders; detached HTML canvas provides the equivalent path. / 离屏画布不可用时使用未挂载的 HTML 画布。
- JY data persistence retries a rejected Blob transaction atomically with byte buffers, while keeping existing Blob reads compatible. / 资源持久化以字节缓冲重试且兼容旧数据。
- MechanismCity presents a skip control immediately and bounds a video with no first frame; both actual skip and no-touch automatic fallback were checked (9.129 seconds observed from the sampled film screen). / 短片无法播放时不阻塞游戏。
- TeaHorseRoad: the dynamic-resolution path accepted 208 frames and actual nonempty RGBA readback but the WebKit page stayed dark. Disabling dynamic resolution only on mobile Apple WebKit restored the full scene (734×343 backing vs 440×205 before); all quality choices remain available. Fixed resolution may cost mobile GPU time, not measured on physical iPhone. / 仅移动 Apple WebKit 固定分辨率，保留画质档；实际场景恢复，真机性能尚未测。
- A bounded follow-up invalidation on affected static screens repairs observed stale WebKit presentation without a perpetual render loop. Wulin accepted image usage 6,887,856 / 67,108,864 bytes, zero refusal, zero pending raster jobs; one explicit invalidation restored its title. / 静止页面补一次有界刷新，保留按需绘制。
- No game rules, balance, save formats, music files or visual assets were deliberately changed. / 不修改游戏规则、数值、存档格式、音频文件或美术资源。

## 复跑 · Reproduce

Use Playwright WebKit with the iPhone 15 Pro profile and start a fresh browser context on the public URL or a local HTTP server. Inspect both before-touch and after-touch screenshots, semantic controls with bounds, exceptions, console and failed HTTP responses. Each game also has the independent `node --test test/*.test.mjs` suite. See each game's QUALITY.md for route details.

使用全新浏览器上下文，观察实际图像而不是只读语义树；按游戏的 QUALITY.md 中的入口复跑。物理 iPhone、真实扬声器与节奏音频、不同 iOS 版本、VoiceOver、长局稳定性和手机 GPU 性能尚未验证。 / Physical iPhone, actual speaker/rhythm audio, iOS version matrix, VoiceOver, long sessions and mobile GPU performance are not certified by this run.

## 公网发布后补验 · Public release follow-up

PR [#303](https://github.com/cnedwin/PortedGamesEgret/pull/303) merged as `d1bcff6913dd62eaf46d4d8158f11bd6a6645e50`; [Pages deployment 46142807438](https://github.com/cnedwin/PortedGamesEgret/actions/runs/46142807438) completed, and 28 critical served files (including game versions and generated bundles) matched the merge bytes. The showcase itself opened with all 24 play links, no page or HTTP errors. All 24 public entries were revisited in WebKit. / 首轮发布实际核验，不用部署状态代替浏览器测试。

The public routes uncovered additional cases that a local title/semantic check could miss. The follow-up changes only the affected games; the existing assets and rules are retained. / 公网慢资源与进入真实首场景暴露了更深的兼容问题：

| 游戏 / Game | 可复现现象 / Observation | 补救 / Remedy |
|---|---|---|
| PeachCreek | Artwork-only title persisted 500 ms, 5 s and 10 s despite idle labels; explicit invalidate restores it | Bounded present after actual native label attachment and queue settlement |
| LubanBridge | Visible title labels but the decoded decorative image stayed at the procedural fallback until invalidate | Follow-up present on real texture attachment; cancel on disposal |
| NezhaSea | Four identical loading-screen captures through 18 s even though title semantics and text queues were ready | Actual native text-ready plus delayed presentation; portrait attachment also invalidates |
| CanalWatch | Rapidly changing initial time and action label were temporarily blank on WebKit | Stable caption and independent changing number, bounded first text-ready gate; Chinese and English actual call-wave touch |
| Wulin | Prologue backdrop absent after 10 s, despite accepted native frame and no errors; explicit invalidate restores it | Observe the same shared texture settlement once and present after attachment, verified with a 5-second resource delay and one request |
| StarBanner / NineProvinces / FiveRegiments | 3D title/first scene missing despite ongoing frames and draw calls; low dynamic buffer 235×395 | Mobile Apple WebKit fixed resolution restores actual rendered scene at 393×659, preserves quality choices elsewhere; 2.79× pixel area in this sample |
| SnowTemple | Opening scene displayed; once normal play enabled automatic resolution, 3D canvas went dark while HUD and frames continued | Mobile Apple WebKit keeps a fixed rendering resolution in auto quality; actual opening and playable snow road both restored (491×823 rather than 294×494, 241 accepted frames) |
| JY | Title and pack import worked, but entering opening scene failed native text measure | Generated engine copy from merged main ca9ff2a0, explicit game-labels HUD mode; actual fresh hosted candidate imported 37.4 MB pack and opened 691 dialogue and full visible 3D home |

The canvas-resize and retained-frame cases are still tracked as engine/browser presentation investigations in the individual ENGINE-NOTES. On affected games the narrow workarounds are explicit, not a permanent render loop or a simulated game. Fixed resolution can increase real-device GPU cost; that is not a measured mobile performance improvement. / 引擎底层呈现机制问题继续保持独立记录，不把游戏绕过当作引擎完全修复。

- 补充候选全部通过独立 Node 测试，游戏全站 Node 合计 1,676/1,676（StarBanner 65, NineProvinces 196, FiveRegiments 173, SnowTemple 113, JY 76, CanalWatch 39, NezhaSea 43, Wulin 133；其余数量不变）。共享模板另 4/4。 / Final candidate aggregate: 1,676/1,676 game Node tests and 4/4 management starter. The additional browser observations and fixes are covered by the actual per-game screenshot routes above and their QUALITY records.
