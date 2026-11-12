# KYS 剧情道具 3D 素材

`story-props.glb` 使用 JYX2 提供的模型，以 KYS 原图和事件槽确定尺寸、朝向和显示状态。原版来源固定为 `cnedwin/jynew@773f3e76492f4af277e8c93ced2c8d18ba516f6c`。

- 宝箱沿用 `BuildingParts/Others` 的 `Baoxiang_01_Close.FBX`、`Baoxiang_02_Open.FBX`、`Baoxiang_02_Animation.FBX` 和对应纹理。矮箱及苔绿箱按 KYS 原图调整比例和材质。
- 木柜复用小蝦米居已移植的 JYX2 `Sark_1` 模型和门轴。
- 百花谷的船沿用 `Transportation` 的 `Boat_01.FBX` 和对应纹理，由原作船的相邻两格组成一个实例。
- 圣堂的天书沿用 `Model_02` 的 `Book.FBX` 和对应纹理作为封面。摊开的内页和铜制书架按 KYS 原图制作。
- 金蛇剑沿用 `Moedl_05/Mesh/jinshejian.FBX`，金色材质和插剑石按 KYS 原图制作。
- 梅庄的酒坛从 `BuildingParts/Shinei/Mesh/Alcohol_01.FBX` 提取单坛模型，按 KYS 原图制作陶土材质、红色封口和扎绳。

开箱、取剑、摆放天书和船的生成由 KYS 原始事件更新图号。3D 道具据此更新显示。
