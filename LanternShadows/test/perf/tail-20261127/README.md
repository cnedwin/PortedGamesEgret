# 百身术长帧复现 · Dense clone tail latency (2026-11-27)

这是给引擎开发者的**本地诊断工具**，不是游戏入口、发布包或正常通关脚本。它基于实际的第一幕、原生 UI、100 个 Spine 分身及 WebGL2 路径；不裁减分身，不跳过动画、事件、特效、网格或提交。固定虚拟时间仅用于让不同版本执行相同工作量。

This is a local-only diagnostic, not a release game or natural playthrough. It uses the real first act, native UI, all one hundred Spine clone puppets and WebGL2. No display, animation, event, effect or mesh work is removed.

## 1. 版本与启动 · Version and build

实测公开游戏主干 `0816da4883e6737f60f7d9514c615443633ebdb7`；最后一次 Lantern 相关提交是 `43c2f24cea3adaae2f01a3531126483d327e3b71`。这两次提交以及 `ea5adf58e0b131bb95a2f6d250ae21ba9c35d750` 的 **LanternShadows Git 子树** 均为 `61e0593877d5037d49720c4c33cd6d2a5062530c`（不是主干提交号）。引擎 A `94bd70fb26b1f81794c9c6fbbb258c655fcd19df`，B 为实际测试候选 `7935151638792ef0f1518d879ee5b92612a64b13`。候选提交号不等同于最终 main 的合并提交号。游戏源目录下的 18 个源码文件、109 个资产文件与样式均经 SHA-256 确认一致。旧、新两组低探针 client 的 SHA-256 一致，见 [reference-fold7.json](reference-fold7.json)。

The exact tested pins and payload checks are in the reference JSON. The instrumentation is deliberately version-bound: if an engine or game changes a source anchor, construction fails instead of silently recording unrelated work. For the historical A/B, use separate checkouts of the game source with the corresponding official engine copies and the same assets/import map. Use the engine's official `tools/vendor-game.mjs`, not hand-edited runtime files.

从游戏目录运行（已有 Node 和 esbuild；这次使用 esbuild 0.28.2。可通过环境变量 `ESBUILD` 指向该包模块入口）：

```sh
node test/perf/tail-20261127/build-profile.mjs --root <LanternShadows目录> --out <新的本地QA目录> --backpressure --serve
```

`--root` 省略时读当前 LanternShadows。输出路径必须是新的、位于输入游戏目录之外；默认分配系统临时目录。必须用 `--backpressure`，不要用 `--compact`。构建仅在 esbuild 的读取阶段注入测点，检查输入 fingerprint 未改变；复制既有资产及依赖许可证到临时产物。默认绑定本机回环，不要部署诊断页到公网。手机可用已授权 USB 转发访问该页。

The builder does not modify the game's source or vendor. It serves a fresh diagnostic bundle with its dependency notices. Keep it on a local test server and stop the server after the run; do not put this fixture on the showcase site.

## 2. 固定逻辑进度 · Matched workload

打开构建器打印的链接（包含 `?clones=100&lang=en&seed=734`），等标题加载完成。浏览器控制台：

```js
__lanternDenseProfile.start({mode:'native-on', fixedDt:1/60})
```

```js
__lanternDenseProfile.status()
```

当状态为 `done` 且 `issues` 为空时保存完整 JSON：

```js
JSON.stringify(__lanternDenseProfile.result())
```

- 用游戏已有调试入口进入真实第一幕，等分身池就绪再重开，诊断临时授予一次百身术毫毛和 hero safety；正常出招、碰撞、击中、动画和分身消失均照常，没有保存通关成绩。
- RNG=734、虚拟 dt=1/60、从 act.time≥1.2 触发百身术；记录完整 548 行。密集对照窗 `clone age ≥1 && <6.5` 秒需 330 行，每个分身统计 logical/out/shown/posed/carried/made 都为 100。
- 检查 `summary.counts.denseRows===330`、`denseFullPoseRows===330`，同实际 backing、视口/DPR、WebGL2 后端和前台焦点。严格保持相同条件，分别记录温度；实际真机勿用模拟尺寸代替。
- 测量期间不要操作、截图、旋转、切换标签或后台。A/B/A 或 ABBA 复跑区分偶然长帧。可用 `{castAt:3}` 作为独立晚释放诊断查较后的绝对场景进度，只与同参数对比；它不是旧自然游玩长帧的逐帧重建（实测完整 dense pose 仅 319 行，不属于默认 330 行对照）。
- `.stop()` 仅用于有意中止 smoke，不是完整数据。

Use the same viewport, backing, GPU backend, browser, foreground focus, RNG, cast timing and device condition for both versions. Virtual time is not real FPS. Preserve the raw result on your test machine; the supplied reference JSON is a sanitized compact summary, not the raw device log.

## 3. 测点与边界 · Measurements

`spans[name]=[callCount,inclusiveMs,exclusiveMs]`。Spine aggregate 包含全部同步姿势求值与网格发布，不是单纯骨骼计算。WebGL2 capture/prepare/geometry/pack/batch/submit/upload/draw 都是 CPU 侧墙钟区间，可能包括同步驱动等待，父子计时不可直接相加。

`admission` 与 `backpressure` 来自真实 Host pending 检查，`render` 记录实际提交调用；不是根据帧率猜测跳帧。记录粒子 burst 请求、alive、UI status 是否改变。仅使用本页面支持的 `PerformanceObserver` longtask / long-animation-frame；不打开浏览器全局追踪，也不读取别的页面。没有 GPU timer query 或屏幕呈现记录。

`rafMs=rafEnd-rafStart` 对应上一段 engine update / render 的下次 rAF 间隔。行内 CPU begin/end 是同一页面性能时钟的绝对时间，实际回调可能迟于 rAF 时间戳且 CPU 可能越过下一 rAF 时间戳。因此看相交区间及实际脚本时间，不用一个时间差直接认定 GPU 耗时。LoAF 额外脚本无法从黑盒样本单独归因时，保留未知。

The lower-overhead collector measures whole CPU phases rather than every individual Spine call. It checks ordered progress, RNG and three sparse exact logical state hashes. The separate historical strict protocol provided per-frame semantic event and submitted mesh revision proof; this is not reproduced or claimed solely from the low-overhead collector. Probe overhead exists in both; keep probe configuration identical within a comparison.

## 4. 离线对齐 · Offline analysis

```sh
node test/perf/tail-20261127/align-tail.mjs A-raw.json B-raw.json --out aligned.json
node test/perf/tail-20261127/paired-points.mjs BAB paired.json B1-raw.json A-raw.json B2-raw.json
```

按 sampleIndex/logicStep/RNG、100 分身计数、稀疏 hash 与 geometry 严格对齐；common submitted points 是所有对照块都实际提交的交集，只用于比较 CPU 阶段，不能当作全部玩家帧率。保存 JSON 后需要排除私有本地路径、设备标识和环境信息再分享。

## 5. 真实设备参考 · Physical-device reference

[reference-fold7.json](reference-fold7.json) 汇总真实 Samsung Galaxy Z Fold7 / Android 17 / Chrome 157 / Adreno 830 / WebGL2 横屏、873×325 CSS、2291×854 backing、DPR 2.625，热状态 0。没有模拟器。结果以 floor(n×p) 的分位数定义，CPU 毫秒和 rAF 间隔分别报告。

| 对照 · Series | 真正密集帧 · Dense rows | rAF p95 / max（ms） | >50 ms 密集帧 | 共同准入 geometry |
|---|---:|---|---|---|
| Strict A/B/B/A | 330×4 | 49.7/66.4 · 49.7/49.8 · 49.7/66.3 · 49.7/51.3 | 2 / 0 / 1 / 3 | 190 common: pooled mean A 5.81 → B 4.67 |
| Low B/A/B | 330×3 | 33.2/49.7 · 49.7/66.3 · 33.2/49.8 | 0 / 5 / 0 | 205 common: mean A 6.48 → B 5.28 |

Strict four runs matched all 548 logical rows and cumulative events (6,421 each) with every submitted mesh revision checked. Low three runs matched every progress and RNG row and all three sparse checkpoints. Same-point geometry averages improved, but deep rAF p95 did not improve, and low geometry p95 was not consistently lower. One candidate strict 66.3 ms interval had 54.7 ms measured CPU, including 32.6 ms Spine advance (display prepare 22.8, extract 8.4, copy 12.4 ms) and only 2.3 ms WebGL2 submit. Earlier and other baseline tails also include large draw submission durations. These outcomes do not establish a universal FPS uplift or isolated GPU cause.

本轮保持原美术、100 分身、动画和规则；低探针两次早期尾部和晚释放独立诊断未给出可归因于游戏 UI、规则或粒子 FX 的主因。后续仍需拆分 Spine 同步网格准备与绘制调用的实际长尾；不能把减少分身或延期发布未验证的新策略当作修复。



严格对照共同准入几何样本的 p95：设备运行器采用 nearest-style 为 12.0→7.8 ms；此公开离线工具采用 floor(n×p) 为 12.0→8.0 ms。二者是相同原始样本的不同分位定义，不将其混用。公开版构建器仅调整默认游戏目录相对路径；用 B 候选原样输入重新打包，338 模块、1,260,153 bytes、bundle/client SHA-256 与已测 B 均完全一致。 · Same samples, different percentile conventions; compare within one convention. The public reproducer rebuilt the exact tested candidate bundle and client hashes, with only its default relative input path adapted.

退场批量粒子的同引擎独立 A/B 与样本 516 复现见 [expiry/README.md](expiry/README.md) / See the separate expiry particle publication repro and measurements.
