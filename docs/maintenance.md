# Telysta 维护指南

本文件是日常维护的主要入口。所有文本文件使用 UTF-8；不要直接修改 `dist/`，它会在构建时重新生成。

## 项目边界

- `src/config`：可编辑站点文案、栏目、系列、资源类型、视觉映射和交互参数。
- `src/content`：Markdown 文章和资源条目。
- `src/lib`：查找、验证、计数、排序、URL 和运行时逻辑。
- `src/components`：页面渲染与局部交互状态。
- `src/styles`：全局字体、色彩、排版和玻璃表面规则。
- `scripts`：确定性的维护命令。

不要把长期文案写进复杂组件，也不要把数据整理逻辑放进配置文件。

## 常见维护入口

- `astro.config.mjs`：Astro 7 站点配置，以及通过 `@astrojs/markdown-remark` unified processor 接入的 Remark/Rehype 插件。
- `src/content.config.ts`：文章和资源的 Content Collections Schema。
- `src/config/content/blogCategories.ts`：稳定的文章栏目 ID 与显示信息。
- `src/config/content/blogSeries.ts`：稳定的文章系列 ID 与显示信息。
- `scripts/create-post.ts`、`scripts/lib/post-scaffold.ts`、`scripts/templates/post.md`：新文章命令、校验和唯一模板。
- `scripts/validate-content.ts`、`scripts/lib/content-validation.ts`：跨文档内容检查。
- `scripts/prepare-cdn-assets.mjs`、`scripts/generate-cdn-manifest.mjs`：外部素材的增量 WebP 与公开清单。
- `src/lib/resources/resourceItems.ts`：资源图片、下载地址和页面数据的运行时解析。
- `.github/workflows/deploy.yml`：Node 22 检查和 GitHub Pages 部署。

## 日常命令

```sh
npm run dev
npm run post:new
npm run content:check
npm run score:check
npm test
npm run typecheck
npm run check
```

提交前以 `npm run check` 为准。它会完成 Astro/TypeScript 检查、单元测试、内容检查和生产构建。

简谱源文件位于 `src/content/scores`，生成的 SVG 和校验信息位于 `src/generated/scores`。首次维护简谱运行 `npm run score:setup`，之后用 `npm run score:render -- <id>` 增量生成。普通开发和部署只校验源文件哈希，不会重复排版未变化的乐谱。

## 新文章

使用 `npm run post:new` 创建草稿，不再复制内容集合内的模板。命令会读取 `src/config/content/blogCategories.ts` 和 `src/config/content/blogSeries.ts`，避免栏目与系列 ID 重复维护。

文章默认位于 `src/content/weiser-posts/<category>/<slug>.md`，保持 `draft: true`，直到准备公开。完整说明见 [article-authoring.md](article-authoring.md)。

## 文章图片

文章专属原图建议使用同名目录：

```txt
src/content/weiser-posts/portraits/example.md
src/content/weiser-posts/portraits/example/portrait-01.png
```

文章引用 `./example/portrait-01.png`。Astro 会生成网页显示版本，原图仍作为内容源保存。不要手工创建文章 `.preview.webp`。

共享图片放在 `src/assets/images`。只有固定公共 URL、无需处理的静态文件或直接下载附件才放进 `public`。

当前文章 `cover` 仍使用 `/images/posts/...` 公共路径；本轮没有改动封面 Schema 或文章头部组件。

## 资源图片与原图下载

资源条目位于 `src/content/resources`。原图与显示 WebP 保存在作者掌控的外部素材目录，并由 Cloudflare R2 提供；Markdown 统一使用 `asset:` 清单引用。网站构建不生成资源 WebP。

R2 素材的增量 WebP、清单和上传流程见 [cdn-assets.md](cdn-assets.md)。Character 与头像使用已经准备好的专用 WebP 命名；大型插画可由 `assets:prepare` 增量生成。

- `.cover.webp`：最大 1200×1600，质量 94，透明度质量 100。
- `.preview.webp`：最大 3200×3200，质量 96，透明度质量 100。
- `.avatar.webp`：384×384，质量 95，透明度质量 100。
- 图片不会被放大。
- 原图不会被覆盖。

`assets:prepare` 只有在目标缺失、清单缺失、原图变化、目标 WebP 被修改、生成参数变化或生成器版本变化时才调用 Sharp 重压缩。增量记录位于 `.tmp/cdn-image-manifest.json`，缓存只是加速层，不是数据源。

详细字段见 [resource-content-guide.md](resource-content-guide.md)。

## 内容一致性检查

`npm run content:check` 检查：

- 重复资源 ID。
- 分类 ID、系列 ID、系列顺序与重复顺序。
- 发布时间和更新时间。
- 公开文章占位摘要。
- Markdown 本地图片路径和 CDN 清单键。
- 空文章封面、缺失文章封面和正文重复一级标题。
- 资源主图、封面、预览和图库是否使用可解析的 `asset:` 引用。
- Windows 与 Linux 路径大小写差异。
- 容易被 KaTeX 误识别的中文金额 `$...$`。

许可证内容仍需作者人工确认，脚本不会替作者判断授权范围。

## 视觉维护

网站已经具有稳定风格。UI 修改应调用项目 Skill `$telysta-design-guardian`，并遵守：

- 阅读优先，保持深蓝黑、低饱和、留白和轻薄玻璃。
- ACG 只作为身份信号。
- 不把资源页改成商城或重型图库。
- 不因修复一个状态而大规模重排页面。
- 保留键盘焦点、原生语义和 reduced-motion。

设计背景见 `docs/project-knowledge.md` 和 `docs/project-vision.md`。

## 提交前检查

```sh
npm run check
git diff --check
git status
```

同时确认：

- 新文章的 `draft` 状态符合预期。
- 新系列字段成对填写且顺序唯一。
- 资源下载仍指向原图或明确的外部下载地址。
- 新增文本为 UTF-8。
- 没有提交 `dist/`、`.tmp/` 或资源原图。
