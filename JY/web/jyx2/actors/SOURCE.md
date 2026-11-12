# JYX2 角色动作

角色取自 JYX2 固定提交 `773f3e76492f4af277e8c93ced2c8d18ba516f6c`。小蝦米使用 `Zhujue.prefab` 引用的 `Zhujue-mixamo-Running.fbx`、`ZhuJue1 1.mat` 和 `Tex2.png`。段譽使用 `Duanyu.prefab` 引用的 `DuanYu.fbx`、`GJ4_mat.mat` 和 `Purple.jpg`。`manifest.json` 记录模型、材质、贴图、技能配置和动作的源路径与 Git blob。 [JYX2 固定版本](https://github.com/jynew/jynew/tree/773f3e76492f4af277e8c93ced2c8d18ba516f6c)

| 动作 | 本地使用 |
| --- | --- |
| 待机 | 小蝦米使用 JYX2 `Mainrolestand_loop`，段譽使用角色专属 `DuanyuStand`。 |
| 移动 | 两人使用 JYX2 控制器引用的 `map_Mainrolemove`。 |
| 攻击 | 小蝦米使用野球拳现行技能配置绑定的 `PingyizhiAttack`，段譽使用六脉神剑技能配置绑定的 `Liumaishenjian`。完整源动作重采样至 12 帧，KYS 中用 0.48 秒显示。 |
| 受击 | 两人使用 JYX2 全局战斗配置引用的 `StandardBeaten`。 |
| 格挡、闪身、倒地 | 在相同角色骨骼上制作 KYS 模式 3 的动作变体。格挡用角色战斗待机曲线作底，闪身用移动曲线作底，倒地基于受击姿势加本地跌倒变体。 |

离线转换从 FBX 读取网格、UV 和蒙皮，再用 Unity `.anim` 的手脚目标、根姿态与躯干曲线重定向到角色骨骼。Unity Humanoid 重定向器和角色材质由浏览器端转换近似，手指、材质光照和姿态细节可能与 Unity 输出有差别。Egret 游戏运行时按 KYS 朝向与状态选择 PNG 帧。伤害与角色坐标由原战斗逻辑计算。

小蝦米与段譽各有 7 张动作表，每表 4 个朝向。每格为 96×112，脚底锚点固定 `(48,81)`。帧从左至右排列，朝向从上至下为 KYS `0、1、2、3`。源动作与生成人物均仅用于这次本地移植。 [原项目素材协议](https://github.com/jynew/jynew/tree/773f3e76492f4af277e8c93ced2c8d18ba516f6c/COMMUNITY_LICENSE_FOR_JYX2)

战斗 48 加入林平之的 JYX2 原版角色模型和贴图。战斗 133 加入何太沖、唐文亮、岳不群和慕容復。新增角色使用同一转换流程，各有 7 张四朝向动作表，每格 128×128，脚底锚点 `(64,89)`。移植为林平之和岳不群选用松风剑法动作，为唐文亮选用平一指的攻击动作，为何太沖选用两仪剑法动作，为慕容復选用慕容剑法动作。KYS 技能判定仍使用各角色的原技能 ID。`manifest.json` 记录每个动作的来源。
