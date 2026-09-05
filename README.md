# Telysta's Melancholy

Telysta's Melancholy 是 Weiser 的个人写作空间，使用 Astro 7、React Islands、SCSS 与 Markdown Content Collections 构建。

网站保持安静、深色、低饱和与适合长文阅读的氛围。星空、玻璃表面和轻微 ACG 线索用于建立身份感，不应压过文章内容。

## 当前功能

- 带克制交互和 reduced-motion 支持的 Canvas 星空背景。
- 个人首页、随机问候与可配置档案模块。
- 按年月整理的博客导航和静态栏目页面。
- Markdown 文章、标签、系列导航和文章目录。
- 图片型资源索引、图库预览与 CDN 原图下载。
- R2/CDN 资源清单、原图下载和增量图片准备。
- GitHub Actions 自动检查并部署到 GitHub Pages。

## 项目结构

```txt
src/components            页面组件与局部交互
src/config                站点文案、栏目、系列、资源类型和交互参数
src/content/weiser-posts  Markdown 文章
src/content/scores        可编辑的数字简谱源文件
src/content/resources     Markdown 资源条目
src/assets/images         本地 UI 图片与文章共享图片
src/generated             提交到 Git 的 R2 清单与生成乐谱
src/lib                   数据整理、查找、排序与运行时工具
src/styles                全局视觉、字体与排版规则
scripts                   文章创建、内容检查与图片生成脚本
tests                     Node 单元测试与浏览器回归测试
docs                      中文维护、写作、资源与部署文档
.agents/skills            随项目维护的 Codex Skills
```

## 常用命令

```sh
npm run dev
npm run post:new
npm run content:check
npm run score:check
npm run score:render -- <乐谱 id>
npm test
npm run typecheck
npm run assets:prepare -- --source "<素材目录>"
npm run assets:manifest -- --source "<素材目录>" --collection "characters=<Character 目录>" --collection "avatars=<头像目录>"
npm run assets:sync -- -Source "<素材目录>"
npm run check
npm run test:browser
npm run build
npm run preview
```

- `npm run post:new`：通过中文提示创建新的草稿文章。
- `npm run content:check`：检查跨文件内容规则、路径、日期和 Markdown 常见错误。
- `npm run score:check`：检查生成的 SVG 是否与简谱源文件一致。
- `npm run score:render -- <id>`：只重新生成指定简谱；首次使用先运行 `npm run score:setup`。
- `npm run dev` 和 `npm run build` 都会先执行内容检查，错误会在启动或部署前明确显示。
- `npm run typecheck`：检查 `.astro`、TypeScript 和内容类型。
- `npm run assets:prepare`：在外部素材目录中增量生成高质量 CDN WebP。
- `npm run assets:manifest`：根据一个或多个外部素材目录更新仓库内的公开资源清单。
- `npm run assets:sync`：预演 R2 增量上传；确认后追加 `-Apply`。
- `npm run check`：依次运行类型检查、测试、内容检查和生产构建。

## 图片与原图规则

资源采用分层存储：插画资源、Character 原图与显示图、首页轮换头像位于 Cloudflare R2，通过 `assets.telysta.com` 分发；favicon、站点图标、字体、风琴页视觉和文章图片继续保存在项目中。这样保留原图下载能力，同时避免把资源库重复打进 GitHub Pages 产物。

- R2 普通展示图最长边 3200、质量 95、透明度质量 100；Character 与头像使用对应的高精细 profile。
- Character 使用 `.cover.webp`、`.preview.webp` 与原始 PNG；首页头像使用 `.avatar.webp` 与原始 PNG。

CDN 图片脚本使用原图与目标文件指纹判断是否需要重新压缩。未变化的图片会被跳过；现有 R2 WebP 第一次运行时只会纳入增量缓存，不会被重新压缩。网站构建不再现场生成资源 WebP。

文章专属图片放在文章旁边的同名目录，共享图片放在 `src/assets/images`。`public` 仅用于固定 URL、无需 Astro 处理或需要直接下载的文件。文章无需手工维护 `.preview.webp`。

## 内容维护

统一入口：[开发文档索引](docs/README.md)；目录职责与保留规则见 [架构说明](docs/architecture.md)。旧方案集中于 `docs/archive`，不作为当前实施规范。

- 中文文章写作：[docs/article-authoring.md](docs/article-authoring.md)
- 总体维护：[docs/maintenance.md](docs/maintenance.md)
- 资源维护：[docs/resources.md](docs/resources.md)
- 资源字段详解：[docs/resource-content-guide.md](docs/resource-content-guide.md)
- R2 与 CDN 资源流程：[docs/cdn-assets.md](docs/cdn-assets.md)
- 部署：[docs/deployment.md](docs/deployment.md)
- 当前状态：[docs/current-status.md](docs/current-status.md)
- 最新开发记录：[docs/development-record-2026-09-05.md](docs/development-record-2026-09-05.md)

## Telysta 风格 Skill

项目内的 `$telysta-design-guardian` 用于 UI 调整、阅读布局、动效和可访问性审查。它保护现有风格，不参与普通 Markdown 写作或资源录入。

## 部署

推送到 `main` 后，GitHub Actions 运行 `npm run check`，成功后发布 `dist/` 到 GitHub Pages。

生产域名：<https://telysta.com>
