# 江湖首帧 WebGL2 同步等待 · Realm entry: WebGL2 synchronization

## 复现方法 · Method

Window 与前次相同：RTX 5090 Laptop GPU、Chrome 157 D3D11、1280×800、高画质，seed 7 初日暂停少林。真实键盘进入江湖，等待实际 3D renderer 接受绘制，再连续观察约两秒；冷进独立浏览器进程，热回另记，计时期间不截图。Light 组仅 RAF/LoAF；Trace 组独立记录 3D CPU、引擎时钟、2D 提交及 Chrome GPU service 调用栈，不把插桩数据直接当成轻采样的吞吐。 · Same physical desktop, seed, quality and route. No screenshots during timing; separate light and traced samples.

| PC high, seed7 day0 | 全窗口最大 RAF (ms) | LoAF (ms) | 点击至首个实际3D接受 (ms) |
|---|---|---|---|
| 上次正式引擎 / prior official `8a88cf84` | 41.7 / 58.5 / 50.0 / 62.5 | none / 63.8 / 55.5 / 65.8 | 934.5–1013.2 |
| 最新对照 / latest main `4eeb7bcd` incl #560 | 54.1 / 50.0 / 50.0 / 58.3 | 58.2 / 52.5 / 53.6 / 63.0 | 914.9 / 1020.8 / 956.7 / 951.6 |
| 同引擎顺序实验 / same-engine submit-order QA | 33.3 / 37.5 / 29.2 / 29.2 | none (4/4) | 686.7 / 701.8 / 690.6 / 705.4 |

## Root cause / 根因

- 两次旧正式版 trace：3D render CPU 5.8/5.9ms、engine.advanceTime 9.7/10.4ms，接下来 2D renderSharedFrame 41.6/39.6ms，内部不可省略的 `workingAttachment → getError` 37.7/35.1ms；Chrome GPU service `GLES2::GetGLError → WaitForCmd → CommandBufferHelper::Finish → WaitForGetOffset` 37.655/35.142ms，主线程 RunTask 60.46/58.19ms。 · The shared GPU command queue forces the later synchronous 2D validation to wait. The independent 3D CPU submission is small.
- 最新 main #560 主要优化 2D 裁切准备；最新独立 trace 仍为 LoAF 68.6/RAF 62.5ms、3D render 5.6ms、advanceTime 10.4ms、2D renderSharedFrame 46.1ms，其中 `getError` 36.6ms / GPU wait 36.517ms。未见独立合成事件 >0.5ms；输入和地形不在该长任务中。 · The latest clipping optimization does not remove this ordering-induced wait; the measured trace is not an independent compositor bottleneck.

## Same-frame ordering experiment / 同一帧提交顺序实验

QA-only 对照在同一个 engine `4eeb7bcd` 下保持原 World3DView 更新、resize、动画、粒子、标记和相机，唯独高画质 WebGL2 江湖的实际独立 3D 绘制在同一 Play RAF 的 2D 提交结束后执行。没有新 RAF，没有取消 `getError`、fence、flush 和资源所有权检查。真实接受后才触发游戏首图就绪。 · Only the actual independent 3D draw is moved to the tail of the same frame. The trial adapter is not shipped.

- 四轮第一帧采样12.5/16.6/16.7/16.7ms，紧随帧33.3/37.4/29.1/29.2ms；冷+热+实际拖图累计 queued=submitted=accepted 1010/983/1022/1011，各轮拒绝、过期丢弃和多tick均为0。真实鼠标拖图和事后画面正常。 · The entire measured window improves; acknowledge remaining next-frame work rather than claiming GPU work disappeared.
- 两次排序实验独立 trace：advanceTime 4.2/3.7ms → 2D renderSharedFrame 4.5/9.3ms → 真正3D render 5.4/4.7ms；之后独立 `SharedGLHost.poll` 的 `getError` 17.2/11.7ms，GPU WaitForGetOffset 17.16/11.65ms（原35–38ms同tick），主线程最长 RunTask 21.46/24.59ms，窗口峰29.2/33.4ms，无LoAF。保持完成校验，等待跨任务分离、峰值改善，不声称消除了GPU负载。 · Part of the completion wait remains, but no equally large stall was moved to the later window in these samples.

## 正式接入策略 · Product integration

仅在 Play 承载的桌面（非触摸、细指针）高档 WebGL2 江湖启用正式 `World3DView.deferRender` 和 Play `afterFrame` → `drawPending()`。山门、战阵、低/中画质、WebGPU、独立 World3D loop 保持原时序；真正提交接受才发布就绪。没有规则、数值、存档、贴图、灯光、后处理或画质设置调整。 · Scope exactly the tested case; other views use the normal clock draw order. Same-frame delivery is not a GPU presentation guarantee. Final official-pin device and browser results are recorded after integration.


正式无代理候选 c478157a（含 #566）三轮真实RTX：首帧16.7/16.7/16.7ms、下一帧29.1/29.2/33.3ms、全窗33.1/33.3/33.3ms，无LoAF/运行错误；输入到接受725.4/709.5/732.7ms，热回图最大16.7/16.6/12.6ms，真实鼠标操作与同world对象正常。 · The formal API reproduces the earlier QA improvement without the experimental proxy.

## Fold7 high contrast / 手机高档对照与范围限制

真实 Fold7 Adreno 830、Chrome 同路线强制高画质，两轮基线和两轮原高档策略候选均12/12、零运行错误，draw323/tri2591684/上传25.206MB及画面保持一致。 · Matched actual hardware high-preset runs, not emulation.

| Fold7 high | latest 4eeb7bcd | ordered candidate c478157a |
|---|---|---|
| entry to accepted image (ms) | 2384.1 / 2327.8 | 2360.5 / 2187.2 |
| full-window RAF max (ms) | 99.4 / 132.5 | 83.1 / 116.1 |
| before accepted max (ms) | 99.4 / 132.5 | 65.5 / 66.3 |
| **500ms after accepted max (ms)** | **66.6 / 66.5** | **83.1 / 116.1** |
| LoAF count | 4 / 3 | 2 / 2 |
| stable p95 (ms) | 16.7 / 16.7 | 16.7 / 16.7 |

首后峰值退步，不采用高画质手机重排。保持玩家画质，同时保留原提交时序；最终 Wulin 策略额外要求 primary hover+fine pointer 且 maxTouchPoints=0（保守排除触摸硬件及未确证的混合设备）。回归遍历桌面布尔组合；默认低档亦不变。一次基线 `getProgramParameter` 84.2ms（其他三轮8.1–8.6ms）是另外的冷程序查询波动，不把它归功于排序。 · High-preset mobile ordering alone could shift substantial work into the first half-second after acceptance. Restrict the production policy, without lowering the player's selected quality; do not generalize desktop results to phones.

范围化后实体 Fold7 高档一轮：真实媒体查询 false、maxTouchPoints=5，QA 透传观察到江湖201次 stage.drawPending 调用、0次接受，实际原即时绘制持续。12/12、ready2296.5ms，全窗max132.5ms、首图后500ms max52.1ms、steady p95 16.7ms，draw/tri/upload 不变323/2591684/25.206MB。LoAF128.6ms前、50.8ms后仍存在；不声称 高档手机冷着色/渲染问题解决，也不从单次尾窗声称固定改善。 · Physical scoped mobile verification proves the policy does not engage deferred drawing, without changing quality. A short sample is not a guarantee for the phone's high-preset jitter.

范围化正式候选 c478157a PC RTX 真实 hover/fine=true、maxTouchPoints=0，两轮全窗max29.1/33.5ms、首帧20.8/16.7ms、下一帧24.9/29.2ms、p95 8.4ms、ready726.4/708.0ms、LoAF0、零错误；热max16.8/12.5ms。完整15/15真实键盘鼠标验收（山门、招贤、江湖、10v10暂停/集火/清除/继续），短测首map afterFrame调用4/实际接受4、directRealm0/refused0，探针采样前恢复。该PC路线没有打到自然结算；物理Fold7另验。 · Scoped desktop policy retained the benefit and actual draw order while preserving normal controls.

范围化 Fold7 low 完整核心玩法48/48、零运行错误：411×813→873×325 实际转屏保持同game、招贤10→11、存读档、山门和地图拖捏、10v10暂停恢复并在正常4×自然结算（失利，40秒，3殁）。各101帧 p95 16.6–16.7ms、战斗max16.7ms；转屏样本max49.7ms。真实触屏CDP、非人工手指；所有租约/连接/原标签/设备状态恢复。 · Full physical device regression before game publication, not a public-origin phone test.

## 正式合并复测 · Merged engine a0fb4e6c

Egret_rebuild [#567](https://github.com/cnedwin/Egret_rebuild/pull/567) M0 merge-ready 和 Windows 四分片全部成功；正式 main `a0fb4e6c40a93156acd49f78ebf622375193a92c` 已生成官方副本。候选-to-merge 源码 tree diff 为空，Wulin 3个接入文件和关键运行时 BrowserFrameLoop/BrowserGame/BrowserPlay/World3DView/WebGL2Host 实际 SHA-256 一致。 · Official tool vendor and exact candidate source tree, no local patch.

- 实际 PC RTX 两冷：hover/fine=true、maxTouchPoints0；第一接受采样16.7/20.9ms、下一帧25/25ms、完整窗口峰29.2/33.3ms、p95 8.4ms、ready690.5/741.6ms，热max12.5/16.6ms，无LoAF/≥50ms/错误，鼠标与截图正常。 · The official pin reproduces the scoped desktop benefit.
- 实际 Fold7 默认low：12/12，873×325/DPR2.625，ready508.4ms、完整窗max33.3ms、首图后500ms max16.8ms、稳态16.7ms，LoAF/≥50ms/运行错误皆0；draw144/tri599302/upload615×10.037MB；真实media=false/maxTouchPoints5、233个江湖帧尾调用实际接受0，保持原提交顺序且正常3D渲染。设备设置与租约恢复。手机入场时间变化不能归功于未启用的桌面排序。 · Physical Fold7 official cold route; no claim of a mobile ordering speedup.
