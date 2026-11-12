# JYX2 UI 素材来源

这五张 PNG 原样取自 `jynew/jynew` 固定提交 `773f3e76492f4af277e8c93ced2c8d18ba516f6c` 下的 `jyx2/Assets/BuildSource/UI/Common/`，逐个核对过 Git blob。仅随本次本地 KYS 预览使用。 [原始素材目录](https://github.com/jynew/jynew/tree/773f3e76492f4af277e8c93ced2c8d18ba516f6c/jyx2/Assets/BuildSource/UI/Common) · [原项目素材协议](https://github.com/jynew/jynew/tree/773f3e76492f4af277e8c93ced2c8d18ba516f6c/COMMUNITY_LICENSE_FOR_JYX2)

| 文件 | 原始用法 |
| --- | --- |
| `image-kuangjy.png` | ChatUIPanel 对白、头像和姓名边框，BagUIPanel、SelectRolePanel、XiakeUIPanel 面板组件。九宫格的左、右边距为 25，顶、底边距为 27。 |
| `bag-kuang.png` | Jyx2ItemUI 选中格。 |
| `bag-kuang-on.png` | XiakeUIRoleItem 选中框。 |
| `bag-kuang-None.png` | RoleItem 与 XiakeUIRoleItem 的默认透明背景。 |
| `checkmark.png` | RoleItem 的出战选中标记。 |

对白位置参照 ChatUIPanel 及其控制器，角色头像与台词框分别绘制。KYS 的 Cifa 分页与上下位置继续生效。背包保留原面板的左侧物品说明、右侧分类和五列道具格，队伍界面沿用头像、等级、生命与选中标记。Unity 预制体的内建黑色遮罩用 CSS 复现，字形使用浏览器系统中文字体。 [对白预制体](https://github.com/jynew/jynew/blob/773f3e76492f4af277e8c93ced2c8d18ba516f6c/jyx2/Assets/Prefabs/Jyx2UI/ChatUIPanel.prefab) · [背包预制体](https://github.com/jynew/jynew/blob/773f3e76492f4af277e8c93ced2c8d18ba516f6c/jyx2/Assets/Prefabs/Jyx2UI/BagUIPanel.prefab) · [队伍预制体](https://github.com/jynew/jynew/blob/773f3e76492f4af277e8c93ced2c8d18ba516f6c/jyx2/Assets/Prefabs/Jyx2UI/SelectRolePanel.prefab)

标题使用同一提交的原版墨绘 `imagelogin2.png` 和题字 `imagelogo.png`，分别保存为 `title-ink.png` 与 `title-logo.png`。菜单、存档和设置交互由移植项目实现。 [登录美术目录](https://github.com/cnedwin/jynew/tree/773f3e76492f4af277e8c93ced2c8d18ba516f6c/jyx2/Assets/BuildSource/UI/Login)
