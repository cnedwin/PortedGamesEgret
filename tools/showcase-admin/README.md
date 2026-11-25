# 展示站后台

在仓库根目录用 Node.js 运行。首次启动需要设置本机账号，终端会隐藏密码输入。

    node tools/showcase-admin/index.mjs --setup edwin
    node tools/showcase-admin/index.mjs

打开 [展示站后台](http://127.0.0.1:8765/)，用设置的账号登录。拖动左侧游戏调整展示顺序，也可使用上下移按钮。右侧可以编辑中英文简介及替换封面、场景图一、场景图二。上传后先看预览，再保存草稿。

「保存草稿」只写本机，关闭后可以继续改。「发布到展示站」会用本机已有的 GitHub 登录，将实际改动提交到 PortedGamesEgret 的 main，随后由 GitHub Pages 构建。出现同一文件的并行修改时，后台保留草稿并提示冲突。可先备份编辑内容，再使用「同步主干」重新开始。

Windows 的账号校验值与草稿位于 %LOCALAPPDATA%/PortedGamesEgret/showcase-admin。服务只监听本机回环地址。需要改用其他目录或端口时，可以设置 SHOWCASE_ADMIN_DATA 或 SHOWCASE_ADMIN_PORT。

    node --test tools/showcase-admin/*.test.mjs
    node tools/check-showcase.mjs
