# 百分身性能复现 · 100-clone profiling

这是 **诊断专用** 的游戏构建，不是正式发布包，也不是正常游玩通关成绩。它使用真实第一幕的场景、规则、100 个分身及其 Spine 姿势和 WebGL2 提交路径。
This is an instrumented diagnostic, not the release build or a natural playthrough. It measures the real game scene, rules, 100 clone puppets, Spine pose publication and WebGL2 submission.

## 1. 构建与启动 / Build and serve

在游戏目录运行（Node 本地安装 `esbuild`，或将环境变量 `ESBUILD` 指向该包的模块入口；本批验证用 0.28.2）：

```sh
node test/perf/build-profile.mjs --serve --backpressure
```

The script reads the current game source, its official vendored Egret runtime and import map. The esbuild plugin only transforms strings during the separate bundle. It copies assets into a fresh OS temporary directory, leaves game/vendor files untouched, and serves that directory on loopback. The output contains dependency notices and `build/profile.json` with the engine commit, source fingerprint, bundle and fixture hashes. See `--help`; `--out` accepts a fresh path outside the source tree whose parent already exists.

- 当前原生 UI 与旧 HTML UI 做相同画布对照时，两边构建都加 `--compact --backpressure`。这使场景保持 16:9、逻辑与输出舞台限制一致；仍须核对结果实际记录的 CSS、backing、DPR。正常发布不用这一开关。
- Build a historical checkout with the same test tool via `--root <historical LanternShadows directory>`. The instrumentation intentionally fails if source anchors changed instead of silently reporting unrelated timings. The tested old engine vendor pin is `8e70dcb3`; the tested current pin is `f0dfde36`.
- PC: open the printed URL in a real browser. Use the same GPU backend, viewport, display scale, browser version and foreground focus for all modes. A headless software run is useful for diagnostics, but is not a hardware PC measurement.
- 手机：可用已授权的远程浏览器调试；若通过局域网访问，可显式使用 `--serve --host 0.0.0.0`，用电脑的局域网地址取代 URL 中的主机名。测试前后停止服务；不要将诊断页部署到公网。保持手机同方向、同尺寸、同频率和负载，记录实机型号及环境，模拟尺寸不算真机。
- Open the same query `?clones=100&lang=en&seed=734`. Do not combine results with other query flags or change orientation during a measured block. Wait for the title to be ready.

## 2. 执行 / Run

在浏览器开发者工具 Console（手机使用远程调试 Console）执行：

```js
__lanternDenseProfile.start({mode:'native-on', fixedDt:1/60})
```

用 `__lanternDenseProfile.status()` 查询进度；当 `phase === 'done'` 时保存完整数据：

```js
JSON.stringify(__lanternDenseProfile.result())
```

Each test uses a fresh page/reload. Do not move, attack, resize, switch tabs or take screenshots during sampling. `stop()` is for intentionally partial smoke tests only; a stopped or failed block is not a valid full-run comparison. For automated CDP/Playwright device drivers, `dense-harness.mjs` exports `denseClientSource`; the test page already installs it.

| Mode | Difference / 区别 |
|---|---|
| `native-on` | Current native UI, normal view tick/semantics publication. |
| `native-static` | During measured blocks, skips engine view tick and semantic publication while keeping the already drawn widgets. App refresh and label visibility synchronization still run. Diagnostic only; not a proposed player experience. |
| `native-off` | Hides native views and skips the two native update paths. Art/output content changes; use to bound the cost of drawing UI, not to isolate binding alone. |
| `old` | Same fixture on historical DOM UI and older vendor. Engine and UI both differ, so this is contextual evidence, not isolated causation. |

线性混合对照：再开完全相同的 URL，仅增加 `&profileBlend=linear`，使用 `native-on`。普通 URL 保留 sRGB；linear 不是默认替代，需核对画面，也不能据此推断 GPU 执行成本。

Repeat `native-on` again after a static/off/linear block to check drift and device heat. Use the same build, query, dimensions, backing, and measured window in each pair.

## 3. 诊断场景 / Fixture and sample windows

1. `?clones=100` prevents the normal adaptive crowd cap and excludes records. The fixture enters the actual act-one field via the existing diagnostic entry hook, waits until the game has created the 100 puppet instances, and resets the act using its existing replay method.
2. It resets the random source to seed 734, sets the hero's safety time to 12 seconds only for this fixture (preventing an early fall), and holds no regular movement input. At 1.2 simulated seconds it supplies 30 hairs and uses the actual Special input hook. The production rules create the clone array, animate staggered emergence, perform movement/strike/effects, and expire the clones after 7 simulated seconds. It does not directly create or freeze clones.
3. The **test-copy frame clock** uses a fixed virtual 1/60-second gap, including Spine and rules, while actual rAF intervals are measured independently. This is a deterministic workload, not an assertion of 60 real FPS.
4. Baseline rows are act time [0.35, 1.1) seconds. Dense rows are clone age [1.0, 6.5) seconds and require 100 logical, 100 emerged, 100 presented by game visibility, as well as pool/carry 100. Verify `summary.counts.denseFullPoseRows === denseRows`; actual posed clone/moving actor/bone counts are recorded independently. Compare only like-for-like backing and counts.

## 4. 计时定义 / Reading measurements

`result().rows` retains per-frame actual rAF interval, virtual act time/clone age, actual shown/posed/moving/bones, camera and world range, optional host render stats, explicit backpressure reason when enabled, and per-marker timing values `[call count, inclusive ms, exclusive ms]`.

- `engine.frame.cpu`: total CPU-side frame loop. `engine.frame.update` includes `demo.frame.update`, rules, Spine pose advance/display publication, app UI refresh, engine view and label work, semantics publication and its browser projection.
- `engine.frame.render` includes scene/shared-frame capture, WebGL2 preparation and submission. Preparation subspans distinguish geometry, pack, texture materialization and batching; submission includes upload and draw. These are elapsed JS/CPU-side durations, **not** hardware GPU execution/timer-query durations.
- Nested inclusive spans overlap; use exclusive for additive attribution and never add a parent inclusive result to its nested children. Summaries include counts and p50/p95/p99/max/mean of raw per-frame totals.
- `row.render` includes actual host draw calls/ranges/commands and dimensions on submitted frames. Some update frames intentionally do not submit. Use all window rows for end-to-end CPU/rAF; filter rows with host metadata for submission-only timing. A missing render is not automatically inferred to be backpressure. With `--backpressure`, `row.backpressure` is populated only when the instrumented frame loop actually takes that branch, with `pendingFrames` and `limit`.
- `status().issues` must be empty; confirm counts, backing, version, query, focus and foreground state. Keep the raw JSON files when reporting summary numbers.

The profile adds measurement overhead, fixes simulation time, writes no gameplay record and intentionally changes safety for one benchmark. Never ship this diagnostic bundle, fixture or comparison modes as the game itself.

## 5. 实测参考 / Physical-device reference

[reference-fold7.json](reference-fold7.json) gives sanitized block summaries (CPU inclusive/exclusive quantiles); [reference-fold7.csv](reference-fold7.csv) contains 2,970 matched dense rows. Every row has all 100 clones shown and posed, age 1–6.5 s. Blank timing fields mean a stage was not observed/executed, never zero. The pending fields are directly instrumented for the compact pair only. Host submit cadence sums the real rAF intervals between submitted rows. No display presentation or GPU execution timing is claimed.

- 原始 DOM 基线：主干 `4196f177` 的 LanternShadows 目录与实测旧版 `c971c0ff` 完全一致（8e70dcb3）。Native baseline: `c389f1d8`, f0dfde36. Atlas version: this change, same engine.
- 先在相同 expanded backing（Fold7 实测 2291×854）对照 native-on / native-static / profileBlend=linear native-on / native-on repeat，再使用 native-off 分离绘制 cost。用 `--compact --backpressure` 对照旧/新（linear）同一 1517×854 backing。
- 最终 Atlas A/B 同一 expanded 位置、初始状态、100 shown+posed；draw calls median 43→33、host CPU median 24.9→22.0 ms、submission cadence median 33.1→17.8 ms，p95 49.8→49.7 ms. No claim that high-percentile regression was solved.

The actual Fold7 report is summarized in [QUALITY.md](../../QUALITY.md) and [ENGINE-NOTES.md §9](../../ENGINE-NOTES.md). Do not publish the instrumented diagnostic as a game build or use it as a campaign record.


## 6. Spine 提交拆分与背压 / Detailed Spine submission and backpressure (optional)

此附加实验使用新协议 `lantern-dense-fixed-step/2`；上面的普通构建及 `reference-fold7.*` 继续使用原协议和原始数据。若要复跑细分 Spine 的 A/B/A 实验，启动独立诊断构建：

```sh
node test/perf/build-profile.mjs --serve --spine-detail
```

The optional flag selects `spine-instrument.mjs` and `dense-spine-harness.mjs`, enables the explicit backpressure probe, and writes a protocol/version marker into `build/profile.json`. Without the flag, the original v1 implementation and reference remain unchanged. Use the normal expanded layout, or add `--compact` to **every** block when geometry needs to be controlled.

Open the same foreground page at the same size/backing and use a fresh reload for each block:

```js
__lanternDenseProfile.start({mode:'native-on', fixedDt:1/60})
// Save JSON.stringify(__lanternDenseProfile.result()) when status().phase is done.
```

For the experimental block use `mode:'defer-display'`; then repeat `native-on` from a fresh page. Keep full JSON results from all three blocks as A.json, B.json and A2.json. Compare them without changing the data:

```sh
node test/perf/compare-spine.mjs A.json B.json A2.json
```

### 实验具体改变的范围 / Prototype boundary

- The prototype always advances animation state, solves physics/bones, publishes the immutable semantic snapshot and delivers committed events on every virtual tick. In this v2 diagnostic, exact fixedDt is also supplied directly to the game rule accumulator and Spine advance delta; engine tick IDs and elapsed clocks retain their monotonic identity. The only coalesced work is Spine's graphics preparation/mesh publication. Deferred rows retain the latest semantic revision and a callback, not stale prepared geometry.
- **Only before the actual frame capture/render branch**, flush the queue and check each publication's revision against the corresponding latest committed semantic revision. The queue must be empty and individual revision checks must match before rendering. A backpressure skip leaves current graphics work queued for the next real submission.
- This diagnostic changes graphics/event ordering relative to normal Spine delivery (events may be dispatched before the deferred graphics commit). It is tested for the fixture's own behavior, not proof that arbitrary public listeners, disposal, errors or other games' integrations have identical ordering. Do not use the experimental mode as a release feature or general public API guarantee.
- `row.spine.pendingBefore/pendingAfter/limit/skipReason` measure the real host admission decision. `pendingStart/pendingEnd` are the separate deferred **Spine display** queue. Do not conflate them. `row.render` confirms actual host submission; `revisionOk` requires true render branch, empty queue, sufficient individual revision checks and no mismatch. The summed current-frame revisions can differ if a flush includes earlier pending instances; the authoritative test maps each publication to its own expected revision. A raw display revision counter is not treated as a semantic revision.

### 计时与一致性 / Timings and equivalence

The detailed `row.spine.timings` values are per-frame **CPU** sums; `timingCounts` records actual calls. They distinguish animation update/apply, physics solve, semantic snapshot publication, event delivery, display extract/copy, mesh prepare/create/commit, display commit/retire and queue flush. `spine.display.prepare` includes its extract/copy/mesh preparation children, and `spine.display.flush` includes that preparation, commit and retirement—do not add the inclusive parents to their children. The fixture's state-hash measurement is separately marked `qa.stateDigest`; the sparse Spine checkpoints are separately marked `spine.checkpoint.digest`. Host render/prepare/submit spans remain JS timings, not hardware execution.

Validation uses 330 samples in the same fixed dense window, requiring all 100 logical, emerged, shown and actually posed clones. It matches the logical step and clone age, not wall-clock rAF IDs. `stateDigest` and `stateDigestRounded` hash ordered selected logical fields of hero, foes, clones, crowd and other first-act state. The first preserves exact floating-point bits; the second rounds finite numbers to 1e−6. A rounded-only match must be disclosed as such, not silently described as exact.

`eventDigest/eventCount` record the actual Spine committed event stream per virtual frame; the cumulative digest/count covers the entire fixture. Rounded event variants remain separate. Sparse checkpoints around clone ages 1, 3 and 5 verify committed bones, slots and tracks and semantic revision; both exact and rounded checkpoint content digests exclude absolute engine tick IDs, which can differ before measurement. Separate semanticTickSum preserves those diagnostic IDs, and the comparator reports fresh-context tick numbering differences without confusing them with changed poses. Exact and rounded content must both match. It rejects missing events or checkpoints, unmatched logical rows, geometry mismatch, stale submitted revision checks, and count/digest differences. Its pass is evidence for this specific diagnostic fixture only.

No release file, vendored engine or saved campaign is modified by this tool. Preserve the raw per-frame data, device conditions, actual submissions and exact source revision alongside any claimed performance improvement.

### Fold7 实测参考 / Physical-device reference (v2)

[reference-spine-fold7.json](reference-spine-fold7.json) reports the three real Fold7 A/B/A blocks and strict comparison results; [reference-spine-fold7.csv](reference-spine-fold7.csv) contains 990 dense rows. Each block has 330 dense rows with 100 shown and posed clones, and each complete fixture contains 548 matched logical rows, with identical exact/rounded state and cumulative events (6,421 per run). The three sparse semantic checkpoints match; every admitted frame satisfies the freshness check. All three blocks used 2291×854, WebGL2, engine f0dfde36 and the same Atlas game build. In the dense window, display publication counts are 34,229 / 28,115 / 34,229 and the host admits 296 / 271 / 303 frames. B's skipped-frame CPU p50/p95 is 4.7/9.9 ms, compared with A 11.3/22.2 and A′ 13.3/24.2 ms. However actual submission cadence p50 is 16.7 / 33.1 / 16.7 ms. Hence no release optimization is justified. See [QUALITY.md](../../QUALITY.md) for the phase table and [ENGINE-NOTES.md §10](../../ENGINE-NOTES.md) for the proposed public contract. The instrumented build is not shipped.
