# Telysta's Melancholy

Telysta's Melancholy 是 Weiser 的个人写作空间，使用 Astro 7、React Islands、SCSS 与 Markdown Content Collections 构建。

网站保持安静、深色、低饱和与适合长文阅读的氛围。星空、玻璃表面和轻微 ACG 线索用于建立身份感，不应压过文章内容。

## 当前功能

- 带克制交互和 reduced-motion 支持的 Canvas 星空背景。
- 个人首页、随机问候与可配置档案模块。
- 按年月整理的博客导航和静态栏目页面。
- Markdown 文章、标签、系列导航和文章目录。
- 图片型资源索引、图库预览与原图下载。
- 资源封面和预览 WebP 自动生成。
- GitHub Actions 自动检查并部署到 GitHub Pages。

## 项目结构

```txt
src/components            页面组件与局部交互
src/config                站点文案、栏目、系列、资源类型和交互参数
src/content/weiser-posts  Markdown 文章
src/content/resources     Markdown 资源条目
src/assets/images         需要由构建系统处理的图片和资源原图
src/lib                   数据整理、查找、排序与运行时工具
src/styles                全局视觉、字体与排版规则
scripts                   文章创建、内容检查与图片生成脚本
tests                     Node 单元测试
docs                      中文维护、写作、资源与部署文档
.agents/skills            随项目维护的 Codex Skills
```

## 常用命令

```sh
npm run dev
npm run post:new
npm run content:check
npm test
npm run typecheck
npm run resources:images
npm run check
npm run build
npm run preview
```

- `npm run post:new`：通过中文提示创建新的草稿文章。
- `npm run content:check`：检查跨文件内容规则、路径、日期和 Markdown 常见错误。
- `npm run typecheck`：检查 `.astro`、TypeScript 和内容类型。
- `npm run resources:images`：为资源原图生成显示用 WebP。
- `npm run check`：依次运行类型检查、测试、内容检查和生产构建。

## 图片与原图规则

资源原图保存在项目中，并继续进入公开网站产物，作为访客下载目标。网页列表和详情优先使用自动生成的轻量显示版本：

- `.cover.webp`：资源卡片，质量 84，透明度质量 95。
- `.preview.webp`：资源详情，质量 92，透明度质量 98。

图片脚本使用清单、原图 SHA-256、目标文件 SHA-256 和生成参数判断是否需要重新压缩。未变化的图片会被跳过；GitHub Actions 会恢复这些 WebP 和清单缓存。

文章专属图片放在文章旁边的同名目录，共享图片放在 `src/assets/images`。`public` 仅用于固定 URL、无需 Astro 处理或需要直接下载的文件。文章无需手工维护 `.preview.webp`。

## 内容维护

- 中文文章写作：[docs/article-authoring.md](docs/article-authoring.md)
- 总体维护：[docs/maintenance.md](docs/maintenance.md)
- 资源维护：[docs/resources.md](docs/resources.md)
- 资源字段详解：[docs/resource-content-guide.md](docs/resource-content-guide.md)
- 部署：[docs/deployment.md](docs/deployment.md)
- 当前状态：[docs/current-status.md](docs/current-status.md)

## Telysta 风格 Skill

项目内的 `$telysta-design-guardian` 用于 UI 调整、阅读布局、动效和可访问性审查。它保护现有风格，不参与普通 Markdown 写作或资源录入。

## 部署

推送到 `main` 后，GitHub Actions 运行 `npm run check`，成功后发布 `dist/` 到 GitHub Pages。

生产域名：<https://telysta.com>
