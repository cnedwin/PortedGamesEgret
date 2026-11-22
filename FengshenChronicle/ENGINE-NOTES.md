# 引擎笔记 · Engine notes

固定版本为 Egret v7.0.2，提交 `60991a46eb2252e5c0e7790b90b51517e3cbd14c`，与 `vendor/SOURCE.md` 一致。

**没有记录到引擎问题 · No engine issues recorded**

本章已检查 `src/view.mjs` 的原生 2D 显示树、图集租约、纵深排序、共享材质与对象池，以及 `src/art/paint.mjs` 的离屏贴图准备。规则与存档测试独立运行。浏览器和设备验收中若出现可复现的引擎问题，应补充实际现象、引擎入口、绕过办法和版本，再登记问题。

The reviewed paths cover the 2D display list, texture leases, depth sorting, shared materials, pools and offscreen texture preparation. Rules and saves run independently. Reproducible engine failures found during browser or device acceptance should be added with their entry point, version, observed behaviour and workaround.
