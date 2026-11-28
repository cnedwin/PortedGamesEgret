# Fold7 高画质江湖冷启动：程序准备及 GPU 同步 · High-preset realm cold entry

## 设备与方法 · Device and method

实际 Samsung Fold7 SM-F966U1、Adreno 830、Chrome 157、873×325 CSS/DPR2.625，强制高画质 WebGL2；正式 main `a0fb4e6c`，seed7 初日暂停少林。每轮全新隔离浏览器页面和 WebGL context 从真实触屏进入江湖，首个 renderer 实际接受之后继续记录三秒；再同一页面回山门建筑页、返回同一 realm 对象，完整记录热进入。没有清除用户浏览器或驱动 shader cache，故冷页面/GL context 不等同于已证明的冷驱动编译缓存。Light 仅 RAF/LoAF，detail 独立加入 GL/renderer 探针；截图在计时结束。 · Actual hardware and paired route, not phone viewport emulation.

| Pair | Cold tap → accepted (ms) | Cold full max RAF (ms) | Warm tap → accepted (ms) | Warm max RAF (ms) |
|---|---:|---:|---:|---:|
| Light 1 | 2375.1 | 116.0 | 59.0 | 16.7 |
| Light 2 | 2207.1 | 115.9 | 56.9 | 16.7 |
| Detail 1 | 2382.0 | 115.3 | 74.6 | 33.1 |
| Detail 2 | 2168.2 | 132.5 | 91.8 | 33.1 |

四轮 cold/warm 共72/72，所有 warm 无 LoAF/新 shader link/query，冷 LoAF 主要出现在首次实际绘制前后。 · Four real paired routes, all 72 checks passed, no warm program preparation.

## 着色程序和资源阶段 · Programs and resource admission

- Previous historical 84.2ms first getProgramParameter occurred after all eight links, before new geometry upload; isolated observation, not verified recurring compiler stall. Current detailed pair records actual pname and program identity: 8 links, 16 status/uniform-count queries, `KHR_parallel_shader_compile` unavailable. Max LINK_STATUS 8.1/9.0ms, all query time9.1/9.8ms; program3 standard/normal/vertex_color/shadow/environment/fog/linear output. No new shader link at first true draw.
- Detail2 relative to assembled map: preparePrograms +5.3→22.7ms, 754 variant requests dedup to eight links; prepareGeometries +22.3→234.5ms, 293 geometries. First actual realm renderer.render +259.8→273.8ms (14.0ms CPU). UI2D `GLNativeSession.check → workingAttachment → SharedGLHost.drawRecord` +287.5→354.8ms, **67.3ms** synchronous wait 13.7ms after 3D enqueue. Renderer acceptance in next observed RAF +364.5. LoAF146.6ms blocking96.6. The analogous query in detail1 took53.3ms. First post-frame attachment and poll checks still 24/22ms. Both after all geometry upload calls before first true frame. · Real recurring bottleneck is the cross-context 2D sync wait after heavy 3D submission; do not call it shader compilation.
- Geometry upload total 25.206MB (1,483 bufferData in baseline including actual drawings), measured CPU call time from earlier same high route ~8–9ms. To distinguish any remaining queued upload work from first draw itself, test an isolated explicit asynchronous completion fence and an isolated lazy geometry policy, preserving image quality. Do not change the game until full-window evidence supports it.

## Scope · 范围与限制

不删除错误检查，不降低画质，不清理其他浏览器用户数据。历史 84.2ms 查询暂未复现，不能宣称已修；缺少 KHR 是设备能力限制，不能通过跳过 LINK_STATUS解决。Any production change requires actual paired route benefit across the initial image and tail, not merely moving a visible stall.


## Isolated high-touch geometry control / 手机高档几何对照

A: disable explicit geometry prewarm in the QA snapshot only; unchanged shaders, quality and actual draw. Actual Fold7 one cold/warm pair 18/18, ready2062.6ms, whole max116.0ms, post500 max65.9ms, LoAF117.1ms/block67.1. First 3D CPU rose to36.7ms versus baseline14.0ms; required UI2D getError persisted53.4ms after actual 3D submit. Total1379 bufferData/25.050MB versus 1483/25.206MB; GL upload native call aggregate rose to22.2ms versus8.1ms. Warm64.3ms/max16.7/noLoAF. This short sample does not establish a tail/peak benefit and concentrates uploads into the first draw; retain the normal high-preset prewarm pending the separate fence discriminator.

B: same high prep, experimental non-blocking GPU completion fence after the actual geometry preparation. Actual Fold7 one cold/warm18/18: fence elapsed9.9ms (one zero-timeout poll signalled; no blocking wait or draw), cold ready2326.9ms/whole max99.4ms/post500 max49.9ms/LoAF99.5; first real render CPU10.3ms then required UI2D getError51.4ms, start10.6ms after 3D submit. Program query max9.3ms/sum10.5, geometry1483 calls/25.21MB unchanged. Warm81.6ms/max33.2ms had a 51.2ms LoAF. A short improved cold sample with an added wait and worse warm sample does not prove durable net benefit. Since GPU upload completion was already observed before the first draw, this isolates the recurring cost to the subsequent 3D command stream/2D sync, not remaining geometric uploads.

**Decision / 决定**：没有采用 A 或 B，不改变着色器、几何预备和视觉设置，未删除或延迟错误验证。当前两个详细冷样本的真实着色状态查询都低于10ms，历史84.2ms未复现；两类长帧分开记录。高档手机首图 GPU 同步等待仍是开放问题，不以更短加载数值掩盖后续卡顿。 · No unproven shader policy or QA fence shipped; keep existing prewarm and mobile order.
