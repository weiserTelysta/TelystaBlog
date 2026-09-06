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

日常改文案先看 [作者配置入口](../src/config/README.md)，无需查找组件内部。

- `src/config/site.ts`、`src/components/site/ShareMetadata.astro`：默认分享图及静态 Open Graph/Twitter 信息；文章封面与日期由文章路由传入。详见 [链接分享记录](link-sharing-2026-09-06.md)。
- `astro.config.mjs`：Astro 7 站点配置，以及通过 `@astrojs/markdown-remark` unified processor 接入的 Remark/Rehype 插件。
- `src/content.config.ts`：文章和资源的 Content Collections Schema。
- `src/config/content/blogCategories.ts`：稳定的文章栏目 ID 与显示信息。
- `src/config/content/blogSeries.ts`：稳定的文章系列 ID、所属 category 与显示信息；总索引仅显示有公开文章的系列。
- `scripts/create-post.ts`、`scripts/lib/post-scaffold.ts`、`scripts/templates/post.md`：新文章命令、校验和唯一模板。
- `scripts/validate-content.ts`、`scripts/lib/content-validation.ts`：跨文档内容检查。
- `scripts/prepare-cdn-assets.mjs`、`scripts/generate-cdn-manifest.mjs`：外部素材的增量 WebP 与公开清单。
- `src/lib/resources/resourceItems.ts`：资源图片、下载地址和页面数据的运行时解析。
- `src/lib/resources/resourceDisplayPolicy.ts`：展示已发布插画与两款明确收录的 Minecraft 皮肤，排除 Character、头像和文章配图。
- `src/components/resources/resourceLightbox.ts`：按需加载的全屏看图器与下载选择，替代旧详情分栏。详见 [资源画廊记录](resource-gallery-2026-09-05.md)。
- `src/components/blog/BlogSearch.astro`、`src/lib/blogSearch.ts`：简约搜索交互、匹配与命中句；`src/pages/blog/search-index.json.ts` 在构建时生成已发布文章索引，不要手改生成文件。
- `src/lib/homeProfile.ts`、`src/components/site/TabIdentity.astro`：同一标签页会话共享头像与 favicon，刷新不重新抽取；离开时的多语言标题集中在 `src/config/tabGreetings.ts`。
- `scripts/prepare-favicons.ts`：新增头像方案后运行 `npm run assets:favicons -- --cdn`（或 `--source <本地 avatars 目录>`），检查并提交 `public/favicons/` 的小尺寸 PNG。普通构建不会重新下载生成。详见 [标签页、搜索与组图记录](tab-search-gallery-2026-09-05.md)。
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

## 文章评论

所有公开文章通过 `src/pages/blog/[...slug].astro` 统一渲染，页面顺序固定为“正文 → 系列入口 → 评论”。Giscus 只在该路由的正文主体内加载；评论配置集中在 `src/components/article/ArticleComments.astro`，首页、文章索引、系列页和资源页不会引入评论脚本。

当前使用 `pathname` 映射和 `preferred_color_scheme` 主题。不要修改文章 URL、slug 或路由，否则会改变 discussion 的映射键。评论仓库必须保持公开、启用 Discussions，并安装 Giscus GitHub App。

父页面只能使用 `.giscus` 和 `.giscus-frame` 调整 iframe 的宽度、间距与外部边界，不能用本站 CSS 穿透跨域 iframe。若以后需要让评论内部完全采用 Telysta 配色，可以在本站公开托管一份 Giscus 自定义主题 CSS，并把 `data-theme` 改成该文件的绝对 HTTPS URL；若再加入站内 Light/Dark 切换，则通过 Giscus `postMessage` 的 `setConfig.theme` 同步，不需要更换评论组件或数据层。

系列入口与 `/series/<id>/` 页面继续使用深蓝黑画布、月光蓝状态色、细分隔线和低幅度交互，不使用正文下划线、厚卡片或持续动画。系列 ID 是数据与 URL 的稳定标识，显示标题可以是中文；文章 frontmatter 只能填写 ID。

## 视觉维护

网站已经具有稳定风格。UI 修改应调用项目 Skill `$telysta-design-guardian`，并遵守：

- 阅读优先，保持深蓝黑、低饱和、留白和轻薄玻璃。
- ACG 只作为身份信号。
- 不把资源页改成商城或重型图库。
- 不因修复一个状态而大规模重排页面。
- 保留键盘焦点、原生语义和 reduced-motion。

当前职责与清理规则见 [架构说明](architecture.md)，早期设计背景见 [历史记录](archive/project-knowledge.md)。

## 提交前检查

```sh
npm run check
npm run test:browser
git diff --check
git status
```

同时确认：

- 新文章的 `draft` 状态符合预期。
- 新系列字段成对填写且顺序唯一。
- 资源下载仍指向原图或明确的外部下载地址。
- 新增文本为 UTF-8。
- 没有提交 `dist/`、`.tmp/` 或资源原图。

`test:browser` 先构建，再用独立浏览器测试本机 `127.0.0.1:4322` 预览。Windows 默认使用已安装 Edge，不读取用户浏览器 profile；其他平台先运行 `npx playwright install chromium`。可用 `TELYSTA_TEST_BROWSER` 选择已安装的 channel。不要把 4322 用于其他服务；本地允许复用同项目 preview，CI 不复用。脚本覆盖布局、键盘、遮罩、下载与减少动态，不代替真机触摸手感测试。
