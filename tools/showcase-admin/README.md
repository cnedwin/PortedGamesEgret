# 展示站后台

在仓库根目录用 Node.js 运行。首次启动需要设置本机账号，终端会隐藏密码输入。

    node tools/showcase-admin/index.mjs --setup edwin
    node tools/showcase-admin/index.mjs

打开 [展示站后台](http://127.0.0.1:8765/)，用设置的账号登录。拖动左侧游戏调整展示顺序，也可使用上下移按钮。右侧可以编辑中英文简介及替换封面、场景图一、场景图二。上传后先看预览，再保存草稿。

「保存草稿」只写本机，关闭后可以继续改。「发布到展示站」会用本机已有的 GitHub 登录，将实际改动提交到 PortedGamesEgret 的 main，随后由 GitHub Pages 构建。出现同一文件的并行修改时，后台保留草稿并提示冲突。可先备份编辑内容，再使用「同步主干」重新开始。

Windows 的账号校验值与草稿位于 %LOCALAPPDATA%/PortedGamesEgret/showcase-admin。服务只监听本机回环地址。需要改用其他目录或端口时，可以设置 SHOWCASE_ADMIN_DATA 或 SHOWCASE_ADMIN_PORT。

## 线上部署

用这一目录作为 Docker 构建上下文，或在 Node.js 24 托管服务上运行 index.mjs。服务配置一个 HTTPS 域名，代理保留访问域名作为 Host，并只将容器端口提供给 HTTPS 入口。运行单个实例，将持久卷挂载到容器的 /data。容器初始化 /data/state 后降权运行，默认端口为 8080。健康检查使用 GET /healthz。

Render 可创建 Docker Web Service，把 Root Directory 设为 tools/showcase-admin，Dockerfile 及构建上下文沿用该目录。选用支持持久磁盘的计算实例并挂载 1 GB 到 /data。从实际服务地址确定 PUBLIC_ORIGIN 和 GitHub 回调。部署分支可独立于主干，使展示内容合并时只刷新 GitHub Pages。费用以 Render 控制台为准。

在 GitHub 注册 GitHub App，启用用户授权和短期用户令牌，用实际 HTTPS 域名加 /auth/github/callback 作为回调地址。应用只安装到 cnedwin/PortedGamesEgret，仓库权限为 Contents 和 Pull requests 的 Read & write，Metadata 保持只读。关闭无关的 Webhook 和设备登录功能。

| 线上配置 | 内容 |
| --- | --- |
| SHOWCASE_ADMIN_MODE | github |
| SHOWCASE_ADMIN_PUBLIC_ORIGIN | 真实的 HTTPS 来源地址，不带路径或末尾斜线 |
| SHOWCASE_ADMIN_GITHUB_CLIENT_ID | GitHub App 的 Client ID |
| SHOWCASE_ADMIN_GITHUB_CLIENT_SECRET | 在托管平台的密钥设置中保存 Client Secret |
| SHOWCASE_ADMIN_GITHUB_USER_IDS | 授权编辑者的 GitHub 数字账号 ID，逗号分隔。cnedwin 的 ID 为 633442 |
| SHOWCASE_ADMIN_DATA | 持久卷内数据目录的绝对路径，容器默认 /data/state |
| PORT | 服务平台的内部端口，Docker 默认 8080 |

登录由 GitHub 完成。授权令牌只在服务进程的短期会话中使用，重启后需要重新登录。在线保存写入持久卷。提交审核只创建主干的 Pull Request，目录和截图经过审核合并后才会由 GitHub Pages 发布。处理审核后回到后台选择「同步主干」以继续编辑。合并成功才载入新版并清空已发布草稿；未合并而关闭的 PR 会恢复原草稿及编辑基准，以新的提交编号重新审核。若主干的同一内容已变更，重新提交会提示冲突并保留草稿，不会自动覆盖。

线上验收通过后，把实际 HTTPS 地址填入 showcase/admin-url.js 的 ADMIN_URL，随页面发布管理入口。应从两台电脑分别测试登录及草稿续编，另用未获授权的账号确认写入被拒。

    node --test tools/showcase-admin/*.test.mjs
    node tools/check-showcase.mjs
