# Stage Log

## 2026-09-05：资源画廊与系列整理

- 推送后的追加修复：稀疏筛选不再拉伸页首；文章 CDN 图片预留尺寸，评论预留初始高度，文章滚轮取消二次插值。随后完成 22 张独立 cover 生成、R2 上传与校验，列表图片总量下降 88.8%，高清图/原图不变，详见 [加载稳定性记录](loading-stability-2026-09-05.md)。

- 资源页以插画为主，按后续明确要求另收录两款 Minecraft 皮肤；Character、头像、茶花文章配图和草稿不进入画廊。
- 旧的固定多列、横图跨格和客户端测量隐藏方案，改为原比例等高行式画廊。旧“图片与详情分栏”结构由单一全屏看图器替代。
- 仅保留图片、标题、切换、关闭和下载入口；不展示 PSD 下载或作者跳转。标题根据输入方式适时淡出，下载框完整列出同组图片。
- Blog 中 Category / Series 左右分布；系列总索引按 category 分组，过滤空系列，移除历史空配置。
- 本节为当前实现；下文 7 月的等待测量、Motion 布局和旧详情层记录仅供历史回溯，不作为当前规范。
- 详细计划、研究参考和测试范围见 [资源画廊重构记录](resource-gallery-2026-09-05.md)。
- 最新修正：Category / Series 共用对齐样式；图片内集中操作、真实键盘与开场输入队列、阴影/文字显隐、星空暂停；补齐波斯少女、摩尼教、花毛茛与 Minecraft。
- 文档新增统一索引和架构说明，四份旧规划移入 `docs/archive`；旧详情组件及多余浏览器数据字段移除。临时目录删除/归档遇到策略与 OneDrive 权限限制，未完成磁盘清理。

## 2026-07-02

This stage focused on making the resource page feel like a quiet visual index while keeping source assets and downloads maintainable.

### Completed Direction

- The resource page moved from a fixed grid toward a responsive masonry layout that respects each image's aspect ratio.
- Resource display images can now be generated as `.cover.webp` and `.preview.webp` while original images remain available for download.
- Resource cards gained Motion-powered enter, exit, and layout transitions.
- The detail overlay gained multi-image navigation, wheel-based switching, image preloading, pending states, and compact download selection.
- Download files merge gallery originals with local and external actions without turning file formats into resource categories. PSD source files are now filtered from the public download model.
- Back-to-top behavior was adjusted to avoid fighting the resource page's wider visual surface.

### Principles Learned

- It is better to wait briefly and appear in the correct masonry layout than to render immediately in the wrong layout and jump into place.
- Layout animation and hover animation should not fight over the same transform. Put layout motion on an outer wrapper and keep hover polish on inner visual elements.
- Local wheel interactions must stop global scroll side effects when they intentionally control image navigation.
- Resource downloads should stay clear and useful, but the page should not borrow marketplace visual language.
- Generated WebP files are performance artifacts. Original files and Markdown frontmatter remain the content source of truth.

### Current Follow-Up Candidates

1. Group the working tree into clear commit boundaries.
2. Visually test the resource page on desktop and mobile after the current batch of real resources.
3. Add a lightweight resource/content validation script if resource entries keep growing.
4. Keep the new interaction polish rules available as a Codex skill for future UI work.

## 2026-07-01

This stage focused on turning the site from a set of working pages into a more maintainable personal blog system.

### Completed Direction

- The site identity and navigation were simplified around Telysta's Melancholy.
- The ICP footer was removed from the layout.
- Home page content, random profile identity, and random greetings were moved toward configurable data.
- Blog banner usage was reduced so the blog index relies more on the existing starfield atmosphere.
- The article page gained a more capable right-side reading aid with TOC, custom progress rail, and back-to-top interaction.
- Article TOC behavior was refined so it should treat the Markdown article body as the main reading range.
- The resource page moved toward a quieter index model with content-driven resource entries, typed filters, detail overlay, gallery-ready data, compact actions, and fallback image behavior.
- Resource maintenance documentation was added for Markdown frontmatter, gallery entries, credits, and actions.
- Shared configuration and helper boundaries were improved across site, blog, article, home, resources, typography, and interactions.

### Principles Learned

- A page can be technically functional and still visually wrong if its structure uses the wrong language. Resource pages should not inherit storefront or gallery-platform weight.
- Sticky and custom scroll interactions are high-risk. They should be stable first, beautiful second, and never cause layout shift.
- The TOC is a reading helper, not a complete document navigator. It should not compete with the article body or with series navigation.
- Local scroll areas should be isolated from global smooth scrolling.
- More configuration is useful only when it keeps the operator interface clear. Configuration files should remain data-focused; derived behavior belongs in `src/lib`.
- Large visual assets should be treated as source material. Covers and previews are performance tools, not separate resource identities.

### Current Follow-Up Candidates

1. Finish validating article TOC click, highlight, and rail behavior on long posts.
2. Add more real resource entries to test gallery, credits, and action rendering.
3. Review the resource detail overlay after real multi-image resources exist.
4. Add a lightweight validation script for category ids, series ids, resource types, and missing visual config.
5. Keep commit boundaries small before starting the next large feature stage.
