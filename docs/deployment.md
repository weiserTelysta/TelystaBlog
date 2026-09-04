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

输出目录为 `dist/`，不得提交到 Git。

## 图片与产物

插画资源、Character 和首页轮换头像不进入 `dist/`，而是从 Cloudflare R2 下载。favicon、字体、风琴页视觉和文章图片仍随静态网站发布，文章图片由 Astro 优化。

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
