# 山驿试剑来源

本页是独立白鹭试剑场景。地图、角色、建筑、植被、河流、光效、对白和战斗数值由移植项目创建。场景网格和角色几何由 `trial-world.mjs` 在浏览器生成。

- 场景和战斗数据位于 `trial-data.mjs`。浏览器使用独立的 `ported-games-egret:jy:mountain-inn:1` 本地存档。
- 走格寻路与战斗模拟复用移植项目的 `src/kys-navigation.mjs` 和 `src/mode3-battle.mjs`。KYS 源码采用 BSD 3-Clause 并附加金庸题材用途非营利条件。 [许可证](licenses/KYS-CODE-LICENSE.txt) · [KYS 源码授权](https://github.com/scarsty/kys-cpp/blob/fe4ad958243b495c4144695f4a9c9fa1f82eddde/readme.md#授权)
- 白鹭 WebGL2 与 World3D 运行库固定于 `0348339ca8c24b16223f0e43f2a9696082b714db`。保留 Apache-2.0 授权、项目声明和随引擎附带的 `robust-predicates` 授权。 [引擎来源](vendor/SOURCE.md) · [LICENSE](vendor/LICENSE) · [NOTICE](vendor/NOTICE)

浏览器通过同目录的静态资源启动本页。完整 KYS 移植的本机启动方式见仓库说明。
