# 验收记录 · Quality

2026-11-22 · Egret v7.0.2 · WebGL2

| 真机 · Device | 浏览器 · Browser | 验收输入 · Input |
|---|---|---|
| Windows PC，舞台 1600 × 900 CSS px | Edge 158.0.4370.33 | 前台浏览器键盘和鼠标 · Foreground keyboard and mouse |
| Samsung Galaxy Z Fold7（SM-F966U1），Android 17，横屏 873 × 325 CSS px | Chrome 157.0.8103.78 | 真机浏览器触控事件 · Touch input on the physical handset |

两台设备均从隔离的新存档走完正常流程。玄甲在西岐城走近姜尚接任务，在岐山古道击败六名邪祟。首次掉落「岐山破邪剑」，装备后攻击由 17 升至 26，剑刃有独立外观。首领预警可见，乾坤圈去程、回程分别对首领造成 30、18 点伤害。拾取镇邪印、回城复命后暂停保存，实际刷新并点继续，保留任务、装备和背包。全程通过键鼠或触屏操作，诊断接口仅供读取。两端已核对同一份运行文件，页面异常及失败资源请求均为零。

Both devices completed the same fresh-save route through Jiang Shang's quest, six enemies, earned loot and equipment, the ring's outward and return hits on the boss, the seal, and quest completion. Pause froze play. A real page reload and Continue retained the quest, gear and bag. The two runs used matching runtime file hashes and recorded no page exceptions or failed requests.

## 修改与复测 · Fixes and retest

- 首轮试玩中目标未出现在画面时难找。任务栏增加「寻路」，两端均用它找姜尚并出城。
- Fold7 横屏中，外层 CSS 和白鹭同时居中使画布偏移。用白鹭统一计算位置，舞台宽度随视口设置。复测横向填充 100%，中心误差小于 0.01 CSS px。横屏任务描述默认折叠，真机点按展开和收起均通过。
- 场景资源释放后重复调用更新会访问已释放节点。增加生命周期守卫，独立关闭测试通过。首屏浏览器图标请求也已补齐。

## 帧间隔 · Frame intervals

每段 90 个浏览器 rAF 间隔。入口指首次进入古道后，战斗后指击败首领后的采样。数据为短时浏览器帧节奏，未包含整场呈现或 GPU 耗时追踪。

Each row uses 90 browser rAF intervals per window. These are short cadence samples near trail entry and after the boss, with no whole-session or GPU timing claim.

| 设备 · Device | 古道入口 p95／最大 · Trail entry | 首领后 p95／最大 · After boss | 两段 >50 ms |
|---|---:|---:|---:|
| PC | 4.3 / 4.9 ms | 4.2 / 4.3 ms | 0 |
| Fold7 | 16.7 / 16.7 ms | 16.7 / 16.7 ms | 0 |

## 复跑 · Reproduction

1. 从静态网页打开本目录，选空存档，点「初入西岐」。点「寻路」，靠近后与姜尚交谈，再去古道出口。
2. 正常击倒六名邪祟，拾取破邪剑并在行囊装备。选中蚀甲邪将，施展乾坤圈并留意预警。收起镇邪印后回城复命。
3. 暂停并保存，返回标题，刷新并继续。检查任务完成、装备及背包。
4. 用 `node --test FengshenChronicle/test/*.test.mjs` 运行 14 项规则及存档检查。桌面浏览器烟测在 `test/accept.mjs`，两张对照图在 `test/baseline/`。真机验收用本地静态预览，GitHub Pages 公开部署、Fold7 竖屏整章、WebGPU 和更广设备覆盖不在本次结果内。

## 运行文件 · Runtime identity

PC 与 Fold7 运行文件清单摘要（SHA-256）：`3d483b57453089c044a7f77bad019c3905373d7ce06e248adee2996a6e16baec`。截图保存与帧采样均为实际设备输出。
