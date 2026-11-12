# 高昇客棧实时 3D 角色

`0.glb` 和 `53.glb` 保留 JYX2 固定提交 `773f3e76492f4af277e8c93ced2c8d18ba516f6c` 中小蝦米、段譽的 FBX 网格、UV、主贴图、关节和蒙皮权重。`manifest.json` 记录每个文件的校验值、原始素材路径和动画来源。每个角色实例拥有独立的骨架和动画播放器，在客栈渲染器中使用同一组灯光并参与实时投影。 [JYX2 源码版本](https://github.com/jynew/jynew/tree/773f3e76492f4af277e8c93ced2c8d18ba516f6c)

- 两人使用 `map_Mainrolemove` 移动和 `StandardBeaten` 受击曲线。小蝦米使用 `Mainrolestand_loop` 待机和野球拳绑定的 `PingyizhiAttack`。段譽使用 `DuanyuStand` 和六脉神剑绑定的 `Liumaishenjian`。Unity 人体动作重定向后保存为连续 glTF 骨骼轨道，运行时按输入播放并过渡。攻击轨道仍按此前的 KYS 显示时长压到 0.48 秒。
- `staff.glb` 用 JYX2 的厨子模型表现店小二和掌柜。Unity 源客栈的店小二来自上游标记为未授权的 `Assets/3D/juese` 目录。`guest.glb` 用 JYX2 的侠客弟子模型表现 KYS 桌边宾客。它们属于外观替代，坐标与事件继续由 KYS 场景状态管理。 [店小二来源标记](https://github.com/jynew/jynew/blob/773f3e76492f4af277e8c93ced2c8d18ba516f6c/jyx2/Assets/3D/juese/UNAUTH_ASSETS_FOR_JYX2.md)
- 段譽与宾客有本地制作的坐姿轨道。段譽的坐姿参考源客栈构图，骨骼目标由本项目制作。原 Unity 控制器引用 `EverydayMotionPack` 的坐椅动作。
- Unity 人体动作转成手脚目标及躯干曲线驱动的本地重定向，材质采用接受场景灯光的标准网格材质。原 Unity 卡通着色和手指动作细节属于视觉近似范围。

`createInnActorPool()` 加载本地 GLB，`group` 可挂到场景。`add()` 和 `update()` 使用 `(x, y)` 地图坐标，世界映射为 `(x, yWorld, y)`，脚底位于各角色原点，`yWorld` 默认 0。方向 `0、1、2、3` 分别对应 KYS 上、右、左、下。角色可用 `moving` 切换待机、移动，`pose` 选坐姿或站姿，`action` 指定其他动画，`elapsedMs` 传连续时间戳或用 `deltaMs` 传帧间隔。素材供本地移植验证。 [JYX2 社区素材协议](https://github.com/jynew/jynew/tree/773f3e76492f4af277e8c93ced2c8d18ba516f6c/COMMUNITY_LICENSE_FOR_JYX2)
