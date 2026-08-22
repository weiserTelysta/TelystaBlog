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
4. 资源图片准备。
5. Astro 生产构建。

输出目录为 `dist/`，不得提交到 Git。

## 图片缓存与产物

工作流在构建前恢复：

- 资源 `.cover.webp`
- 资源 `.preview.webp`
- `.tmp/resource-images-manifest.json`

脚本会重新核对清单、原图和目标文件哈希，未变化的图片不会重新压缩。Astro Action 还会缓存 `node_modules/.astro` 中的文章图片优化结果。

公开资源原图继续进入 `dist/`，这是当前明确保留的下载能力，不是构建错误。

## 自定义域名

`public/CNAME` 保存 `telysta.com`。Astro 会将它复制到 `dist/CNAME`。

DNS 记录在域名服务商处维护。若以后启用 `www.telysta.com`，需要单独配置并决定是否重定向到主域名。

## 本地检查

```sh
npm run check
npm run preview
```

推送到 `main` 后自动部署。部署失败时先查看类型、测试、内容检查和构建四个阶段中最早失败的一项。
