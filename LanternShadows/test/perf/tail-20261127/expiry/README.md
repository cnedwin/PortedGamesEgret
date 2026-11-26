# 百身术消散的粒子发布 · Clone expiry particle publication

这是同引擎 A/B 的独立本地诊断，不是发布游戏或正常通关统计。沿用上一级 [低开销探针说明](../README.md)，增加真实粒子 draw 调用计数；不改变动画、分身、规则、粒子发射位置或输入。包含的文件只是诊断代码和脱敏参考，**不包含重复游戏资产**。

This local diagnostic isolates one gameplay integration on the same engine. It extends the low-overhead /3 collector with actual particle draw counts; no game art, actor count, rules or emission sites are removed.

## 1. 同引擎、唯一代码差异 · Same engine, one source change

两边正式生成的 vendor 均为实际测量的集成候选 `99f520231d0423edbe5a28ba575d7508c0b32ac5`，448 文件全量 SHA-256 清单验证一致（不是假定它等于最终 main squash hash）。A/B 的源码、资产、样式、入口映射均一致，除了 `src/main.mjs` 的 `clones-gone` 注释和下列调用。

A（逐站发布 · sequential publication）：

```js
event.at.slice(0, 48).forEach(at => burst(dust, at.x, at.y - 30, 4));
```

B（同顺序逐站发射，最后一次发布 · ordered bursts, one publication）：

```js
dust.burstAtMany(event.at.slice(0, 48).map(at => ({x: at.x, y: at.y - 30, count: 4})));
```

Both sides request exactly the same 48 sites and 192 particles using identical order, coordinates and RNG. The public engine API validates input and retains final emitter position and particle semantics; its unit tests compare the actual particle and final geometry payload. Keep the corresponding sound and all other event handling unchanged.

为了复跑，另外准备两个游戏目录，使用引擎官方 `tools/vendor-game.mjs` 生成完全相同的新版 runtime。只在测试 A 副本恢复原调用、B 使用新调用；不要向正式游戏引入诊断钩子。旧 `df0e1236` 测到一次 82.9 ms 的历史消散长帧，但它**不是**本次同版本 A/B 的主基线。

## 2. 本地构建和执行 · Build and run locally

从 LanternShadows 目录，Node 和 esbuild 可用（本次 0.28.2；环境变量 ESBUILD 可指向模块入口）：

```sh
node test/perf/tail-20261127/expiry/build-profile.mjs --root <A游戏目录> --out <新本地QA目录> --backpressure --serve
```

对 B 同样构建，使用另一个新的输出目录；必须 `--backpressure`，不要使用 `--compact`。省略 `--root` 时读取当前 LanternShadows。构建器在 esbuild 读取字符串时注入测点，拒绝未匹配的版本锚点，复制到隔离输出且不修改输入；只在本地回环服务测试，不部署到公开试玩页。

打开打印的链接 `?clones=100&lang=en&seed=734`，等游戏 ready，再执行：

```js
__lanternDenseProfile.start({mode:'native-on', fixedDt:1/60})
__lanternDenseProfile.status()
```

状态 `done` 且无 issues 时保存 `JSON.stringify(__lanternDenseProfile.result())`。整个过程中不操作、截图、切后台或改变 viewport。记录真实设备、backing、DPR、温度；在同一设备复跑 A/B/A 或 A/B/B。一致场景应有 548 行、330 密集满姿态行、sample516/logicStep1034 为实际 100→0 消散，actTime≈8.6167 秒。

The fixture grants one cast and temporary safety only; real logic, RNG, clone emergence/expiry, animation and all rendering remain active. It writes no campaign record. The instrumentation is version-bound; raw logic counts and the three sparse state checkpoints verify the matching workload.

## 3. 计数与数据 · Counters and comparison

本探针协议仍 `lantern-dense-tail/3`，独立标识 `instrumentationRevision: 'expiry-particle-draw-count/1'`。

- `expirySites` / `expiryRequested`：真实事件请求的站数和粒子数；A/B 均 48 / 192。
- `expiryApiCalls`：该事件的发射调用次数 48 或 1。不要将 API 次数当作粒子数。
- `particleDraws.calls/nonempty`：在真实 emitter draw() 内统计调用次数；alive>0 才进入实际几何构建。eventCalls / eventNonempty 限于该帧的事件分派区间。eventAliveSum 是各次重建的 alive 计数累加，不是新增粒子数。本次 4 个 emitter 正常逐帧 update 没有删掉。
- 原始 `demo.events`、engine CPU、GL prepare/submit 和浏览器 rAF/LoAF 数据保持上一级的计时定义；没有增加逐粒子计时，不把 CPU 壁钟当 GPU 时间。

```sh
node test/perf/tail-20261127/expiry/expiry-summary.mjs expiry-summary.json A-raw.json B-raw.json A2-raw.json
```

检查所有 548 行的逻辑步、RNG、分身和粒子 alive 计数，以及 3 个稀疏 exact 状态 hash。保留 raw 本机数据，公开前先脱敏。本次设备摘要见 [reference-expiry.json](reference-expiry.json)。

## 4. 实机结果 · Physical-device results

| 设备/顺序 · Device/order | 事件中实际几何发布 · Event geometry builds | `demo.events` CPU ms | 整帧 engine CPU ms | rAF 间隔 ms |
|---|---|---|---|---|
| PC A/B/A (RTX 5090 Laptop, WebGL2, 1281×801 backing) | 48 / 1 / 48 | 28.6 / 1.6 / 30.2 | 34.0 / 6.4 / 35.6 | 35.8 / 7.8 / 36.5 |
| Fold7 A/B/B (Adreno 830, WebGL2, 2291×854 backing) | 48 / 1 / 1 | 40.0 / 2.2 / 5.4 | 45.7 / 10.1 / 13.3 | 33.2 / 16.5 / 16.5 |

两组三个块均 exact 对齐、无验证问题，100 分身正常消散、同 48 个 puff 站和 192 请求粒子；消散后 dust alive 仍为 192。事件内的实际非空几何重建 48→1（所有粒子 draw 含正常 update 共 52→5，非空 51→4），同粒子顺序与最终状态由 API 的公开单元测试支持。这里只证明已明确定位的消散帧路径优化，不代表整场战斗或 GPU 性能全面解决。

All six real-device diagnostic blocks matched the logical workload and per-frame particle alive counts, with no validation issues. This is a targeted expiry-frame reduction, not an across-the-game FPS or GPU execution claim. No browser or gameplay behavior was changed by the diagnostic build.


公开版构建器在同 B 候选重新构建，338 模块、1,264,651 bytes，与实测 bundle 和 client SHA-256 完全一致。 · The public reproducer rebuilt the tested B bundle and client byte-for-byte.
