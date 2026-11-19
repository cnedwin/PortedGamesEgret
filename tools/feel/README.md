# 体感测量 / Measuring game feel

一个埋点模块加一个真机测试工具，回答一个问题：**这个游戏有没有可能好玩？**

它不判断好不好玩——那是人的事。它判断的是"不可能好玩"的硬伤在不在：

| 门 | 判据 | 为什么 |
|---|---|---|
| 输入延迟 | p95 ≤ 50ms | 超过这个数，三消就不"跟手" |
| 帧间隔 | p95 ≤ 20ms | 连锁时掉帧，爽感直接碎掉 |
| 反馈完整率 | 100% | 每次消除都要走到视觉、听觉、触觉、命中停顿四个通道 |
| 吞连锁 | 0 | 规则算出的连锁，表现层必须全部播出来 |

四门全过不代表好玩，但任何一门不过，就一定不好玩。

## 三层测量

| 层 | 工具 | 能证明什么 | 需要什么 |
|---|---|---|---|
| 逻辑层 | `runHeadless` + `node --test` | 规则、平衡、连锁分布 | 无 |
| 渲染层 | 浏览器 + CDP + 截图 | 布局、缺图、溢出、帧率 | 桌面浏览器 |
| 设备层 | `adb` + `tools/feel-test.mjs` | 触控延迟、真机帧率 | USB 调试的安卓机 |

## 怎么跑

```bash
# 真机，服务仓库根目录，默认打开自测页
node tools/feel-test.mjs

# 指定拖拽次数和间隔
node tools/feel-test.mjs --swipes 60 --gap 320

# 测别的页面（比如将来某款游戏）
node tools/feel-test.mjs --url http://127.0.0.1:8000/MyGame/ --swipes 40

# 只连已有的 DevTools 端口，不碰 adb
node tools/feel-test.mjs --cdp 9222 --url http://127.0.0.1:8000/MyGame/

# 页面没埋点时，工具会自动注入独立探针，只判门 1、门 2
node tools/feel-test.mjs --url http://127.0.0.1:8000/LanternShadows/

# 四门必须全过，否则退出码 1（给 CI 用）
node tools/feel-test.mjs --strict
```

### 两种模式

| 模式 | 条件 | 能判 |
|---|---|---|
| 埋点模式 | 页面加载了 `tools/feel/feel.mjs` | 全部四门 |
| 探针模式 | 页面没有埋点（自动注入） | 只有门 1、门 2 |

探针会往页面里注入自己的 rAF 循环和 `pointerdown` 监听，所以不需要页面配合；但它看不到"反馈完整率"和"吞连锁"——那是游戏自己的账，只有游戏能报。报告里这两项会明确标成 `n/a`。

`--no-probe` 可以关掉自动注入，让没有埋点的页面直接报错。

需要 `adb`。工具会按这个顺序找：`$ADB` → 仓库内 `.tools/platform-tools/adb.exe` → 工作区同级 → `PATH`。

输出写到 `.feel/report.json` 和 `.feel/shot.png`（已 gitignore）。

埋点模块自己的单测：

```bash
node --test tools/feel/feel.test.mjs
```

## 把它接进游戏

游戏页里，一行初始化，然后三个调用点：

```js
import { createFeel } from '../tools/feel/feel.mjs';
import { createFeelOverlay } from '../tools/feel/overlay.mjs';

const feel = createFeel();                       // { enabled: false } 则全部空转
const overlay = createFeelOverlay(feel, { visible: new URLSearchParams(location.search).has('feel') });
window.__feel = feel;                            // 测试工具靠它读数据

function frame(timestamp) {
  feel.frame(timestamp);                         // 每帧开头，越早越好
  // …更新与绘制…
  overlay.update();                              // 每帧结尾
  requestAnimationFrame(frame);
}

// ① 游戏第一次能对这个输入做出决定的时刻
const token = feel.input(x, y, event.timeStamp);
// ② 变化真正落到场景上之后
feel.consumed(token);
// ③ 每解决一次消除
feel.clear({ chain, cells, channels: ['visual', 'audio', 'haptic', 'hitstop'] });
// ④ 每轮连锁结束，核对规则数与播出数
feel.chain(expectedChains, playedChains);
```

### 最关键的一条：`feel.input` 要在"决策事件"上开

拖动交换的决策点是**抬手**，不是按下。如果在 `pointerdown` 开样本，测出来的会是"整个拖动时长 + 响应"，不是游戏的问题。

点按类交互的决策点是按下。选错事件，这个数就没意义了。

### 第二个关键点：延迟里有多少不是我们的

报告会给出 `dispatchP95`——从事件自带时间戳到游戏代码开始执行的间隔。这段是浏览器自己的调度开销，不归游戏管，但必须从总延迟里扣掉才能知道游戏占了多少。

实测那台 Galaxy Z Fold7 上，这一段占了 **22ms / 32ms**，也就是三分之二是浏览器。如果只看总数，很容易误判成游戏慢。

## 实测基线（2026-11-20，SM_F966U1 / Galaxy Z Fold7，Chrome）

### 带埋点的页面：`tools/feel-selftest`（一个真的 7×7 三消）

| 项 | 值 |
|---|---|
| 输入延迟 p95 | 32.3 ms（其中浏览器 23.6 ms） |
| 帧间隔 p95 / p99 | 16.8 / 17.1 ms |
| 掉帧 | 0–1% |
| 消除次数 | 41 |
| 反馈完整率 | 100%（四通道全到） |
| 吞连锁 | 0 |

### 引擎页面：用独立探针测（只有门 1、门 2）

| 页面 | 输入 p95 | 其中浏览器 | 帧间隔 p95 / p99 | 掉帧 |
|---|---|---|---|---|
| `LanternShadows`（2D + Spine） | 46.5 ms | 43.4 ms | 16.8 / 16.8 ms | 0.1% |
| `FPS`（3D，WebGL2/WebGPU） | 44.8 ms | 35.8 ms | 16.8 / 16.8 ms | 0.0% |

### 这三行数字说明了什么

1. **引擎的渲染路径不是瓶颈。** 两个引擎页面在真机上帧间隔 p99 都是 16.8 ms，等于零抖动。这一条此前没有任何证据。
2. **输入延迟的大头是浏览器，不是游戏。** 三消页里游戏只占约 9 ms，灯影只占约 3 ms，FPS 约 9 ms。剩下的 23–43 ms 是浏览器把事件交给页面之前的开销。
3. **页面越忙，浏览器调度越慢。** 轻量 DOM 页 23.6 ms，灯影 43.4 ms。这不是游戏算得慢，是主线程被渲染占着、事件排队等。所以优化输入响应，要优化的是"每帧占主线程多久"，而不是"事件处理函数写多快"。

第 3 条对做三消的意义：棋盘是每帧都要重绘的高频路径，如果单帧主线程占用高，输入延迟会被推高到接近上限。门 1 虽然过了，但**余量只有 3–5 ms**，不是可以随便挥霍的。

## 它测不出来什么

- 配色好不好看、立绘气质对不对、整体高级感——这些只能人看
- 数值体感舒不舒服——只能人玩
- 粒子叠加起来"亮不亮"——能测帧率，测不了观感

它能做的是把"客观正确性"扫干净，把人的注意力省下来只判断"好不好"。

## 文件

| 文件 | 作用 |
|---|---|
| `tools/feel/feel.mjs` | 埋点核心，无依赖，浏览器与 Node 通用 |
| `tools/feel/overlay.mjs` | 画面上的读数面板 |
| `tools/feel-test.mjs` | 真机测试工具：起服务、开 Chrome、注入触摸、出报告 |
| `tools/feel-selftest/` | 自测页，一个真的 7×7 三消；也是将来棋盘逻辑的种子 |
