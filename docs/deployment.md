# 部署指南

Telysta Blog 使用 GitHub Actions 构建，并发布到 GitHub Pages。

## GitHub Pages 设置

在仓库 `Settings → Pages` 中：

1. 将 Source 设置为 `GitHub Actions`。
2. 首次部署成功后确认自定义域名为 `telysta.com`。
3. DNS 验证完成后启用 `Enforce HTTPS`。

## 构建流程

工作流位于 `.github/workflows/deploy.yml`，使用 Node 22、Astro 7 和 `withastro/action@v6`。

CI 构建命令为：

```sh
npm run check
```

该命令依次完成：

1. Astro 与 TypeScript 检查。
2. Node 单元测试。
3. 内容一致性检查。
4. Astro 生产构建。

文章在类型检查与构建时共用自动补全规则，支持直接新建日期文件名的 Markdown；用法和公开/草稿默认值见 [文章写作指南](article-authoring.md)。内容检查不会自动改写源文档，`npm run build` 还会检查已生成简谱是否与源文件一致。

输出目录为 `dist/`，不得提交到 Git。

## 图片与产物

既有插画资源、Character 和 R2 首页头像不进入 `dist/`，而是从 Cloudflare R2 下载。本地后台新增的头像、角色图和二维码保存在 `public/media/`，随静态站点发布；对应图片地址为 `/media/...`。favicon、字体、风琴页视觉和文章图片也随静态网站发布，文章图片由 Astro 优化。

CI 不保存 R2 密钥，不生成资源 WebP，也不会在部署时上传素材；R2 上传和 `src/generated/cdn-assets.json` 更新由作者在推送前完成。Astro Action 仍可复用 Astro 自身的构建缓存。

完整流程见 [cdn-assets.md](cdn-assets.md)。

## 自定义域名

`public/CNAME` 保存 `telysta.com`。Astro 会将它复制到 `dist/CNAME`。

DNS 记录在域名服务商处维护。若以后启用 `www.telysta.com`，需要单独配置并决定是否重定向到主域名。

## 本地检查

```sh
npm run check
npm run preview
```

推送到 `main` 后自动部署。部署失败时先查看类型、测试、内容检查和构建四个阶段中最早失败的一项。

提交涉及交互时，另运行 `npm run test:browser`；涉及本地后台时运行 `npm run test:admin`。这两组浏览器检查目前不在 Pages 工作流中，不能从 Actions 的构建成功推断它们已经执行。

当前这台 Windows 电脑若出现 Satteri 原生模块被 Application Control 阻止的错误，请查看 [已验证的 WASI 兼容方式](admin-ux-plan-2026-09-15.md#本机构建环境的区别)。本地兼容方式不修改 CI 环境，也不随 Git 提交临时依赖。

## 发布结果核对

1. 推送后进入 [部署工作流](https://github.com/weiserTelysta/TelystaBlog/actions/workflows/deploy.yml)，核对运行对应的提交 SHA，避免把上一次绿色结果当成本次发布成功。
2. 确认 `build` 和 `deploy` 作业均成功，再检查 `https://telysta.com/`、本轮修改的页面及静态资源。
3. 若部署成功但页面仍旧，检查响应缓存和产物内容；不要仅凭首页 HTTP 200 判断新版本已经生效。

本地管理入口仍是 `npm run admin` → `http://127.0.0.1:4323/`。`scripts/admin/` 不在 Pages 产物中，没有线上写入接口或 GitHub 登录入口。保存内容只改变本地文件；提交和推送由作者执行。
