# Stage Log

## 2026-09-15：提交前审查

- 修复新增分类后文章列表仍读取旧分类集合的问题，补充修复前失败、修复后通过的回归断言；文章列表、保存检查和元数据表单统一读取当前配置。
- 完整公开页面 33 项、后台 6 项浏览器回归通过；依赖审计零漏洞。完整类型／单元／内容／生产构建检查与环境限制见 [验收记录](admin-ux-plan-2026-09-15.md#提交前审查2026-09-15)。
- 更新部署指南中本地新增图片的归属，明确后台不随 Pages 发布为在线服务；按现有 `main` 工作流发布并核对对应提交的 Actions 结果。以下各节保留当时尚未推送的阶段状态。

## 2026-09-15：本地管理 UI 与新增流程

- 对照实际反馈补齐头像、分类角色和系列新增；新分类与系列立即可用于文章，无需重启后台。设计调研与实际范围见 [本轮计划](admin-ux-plan-2026-09-15.md)。
- 采用可搜索摘要列表与单项编辑；共享前后台社交 SVG、光泽 ID 和纹理，补上前台未消费 foil 预设的问题，保留花体角色名、英文题签和中文介绍。
- 上传头像生成 WebP 与 32/48px favicon，角色图保持比例，二维码输出无损 WebP。新图片保存在 `public/media`，源码与 R2 原资产继续可用；未实现 R2 自动上传。
- 独立的新增适配器保留现有 TS 表达式和注释，预检所有文件版本，普通失败时检查后恢复本次写入；未开放分类／系列删除、强制回退或云端登录。
- 完整检查在官方 WASI 后端通过：154 个检查文件、98 项单元测试、82 个内容文档、26 页；后台六项浏览器场景通过。普通原生检查仍受当前 Windows Application Control 限制，具体环境与后续验证见本轮计划。未提交、推送或宣称线上部署完成。

## 2026-09-15：本地写作表单与草稿预览

- 对照第一版完成情况，优先补齐文章元数据表单与未保存正文预览，计划和调研见 [写作阶段记录](admin-writing-2026-09-15.md)。
- 以 YAML 节点范围修改实际变更字段，保留正文、未知字段、无关注释和 CRLF；表单先应用到源码，保存继续检查文件版本与分类／系列一致性。
- 预览采用无权限 sandbox iframe 与 CSP，支持常见 Markdown 和原生公式；HTML 以代码展示，链接不跳转，不运行评论或脚本。未增加云端入口、发布按钮或 R2 写入。
- 全项目检查通过（95 项单元测试、82 个文档、26 页），4 个后台浏览器场景通过；10 篇真实文章的只读表单／预览验证通过。验收与限制见该阶段记录，仍未提交／推送。

## 2026-09-14：文档核对与本地后台第一版

- 对照配置、组件、内容脚本和部署工作流建立 [功能地图](feature-map.md)，补齐 Hero、会话头像、favicon、隐藏标签页祝福的区别。
- 修正资源按钮位置、PSD 可见性、草稿默认值与过时清理状态；七份旧阶段记录移入 `archive/2026-09`，保留历史证据并修复链接。
- 后台改为本地优先，素材选择复用 R2 登记，历史第一版只读；见 [计划](admin-plan-2026-09-13.md) 与 [文档整理记录](documentation-audit-2026-09-14.md)。
- 代码级检查 Keystatic 本地写入后，采用固定 TS 声明的受限适配器；试装 CMS 依赖已移除。新增 `npm run admin`、14 个功能入口、原始 Markdown 编辑与草稿创建、版本冲突校验、素材选择／受限上传和只读 Git 历史；使用与限制见 [后台说明](local-admin.md)。
- 使用现有 semver 范围执行非强制依赖修复，锁定 Astro 7.3.2、Markdown 处理器 7.3.1、Sharp 0.35.4 等版本，未添加 CMS 运行依赖。分享图浏览器测试改为读取站点配置。
- 本轮完整检查通过：91 项单元测试、82 个内容文档和 26 个静态页面；32 项公开页面与 2 项后台浏览器回归通过。真实本地服务的配置预演、素材读取和项目检查也通过，具体边界见计划验收记录。尚未提交／推送。

## 2026-09-13：系列章节导航

- 保留文章底部系列名称与篇数，增加无边框的三等分「上一章 / 目录 / 下一章」；缺少目标或无系列时保留禁用入口。
- 基于公开文章的系列顺序生成原生链接，支持键盘和无 JavaScript；140ms 轻微提亮与 2px 箭头位移，减少动态效果模式下即时切换。
- 调研、状态规则和验证详见 [系列章节导航开发记录](series-navigation-2026-09-13.md)。

## 2026-09-06：作者配置入口

- 搜索、系列索引、看图下载与复制提示从组件归入现有页面配置；分类与系列取消重复 ID 名单。
- 新增额外资源收录配置、有效性检查与作者编辑指南。保持样式、文案和交互不变，详见 [配置整理](archive/2026-09/config-entrypoints-2026-09-06.md)。

## 2026-09-06：链接分享元信息

- 公共 Layout 静态输出分享标题、简介、图片和规范 URL；文章复用 cover 与日期，没有封面则回退固定 Weiser 头像。
- 不修改随机头像/favicon、页面外观或文章路由，详见 [分享记录](archive/2026-09/link-sharing-2026-09-06.md)。

## 2026-09-05：标签页、搜索与组图操作

- 新增本地角色 favicon、九种语言隐藏标签页祝福和按需静态全文搜索。
- 组图箭头按新要求移到图片左右中部，下载/关闭位置不变；加入滚轮手势阈值和放大/下载框隔离。
- 保留排版、Category / Series 对齐、高清图与下载政策，详见 [本轮记录](archive/2026-09/tab-search-gallery-2026-09-05.md)。

## 2026-09-05：资源画廊与系列整理

- 推送后的追加修复：稀疏筛选不再拉伸页首；文章 CDN 图片预留尺寸，评论预留初始高度，文章滚轮取消二次插值。随后完成 22 张独立 cover 生成、R2 上传与校验，列表图片总量下降 88.8%，高清图/原图不变，详见 [加载稳定性记录](archive/2026-09/loading-stability-2026-09-05.md)。

- 资源页以插画为主，按后续明确要求另收录两款 Minecraft 皮肤；Character、头像、茶花文章配图和草稿不进入画廊。
- 旧的固定多列、横图跨格和客户端测量隐藏方案，改为原比例等高行式画廊。旧“图片与详情分栏”结构由单一全屏看图器替代。
- 仅保留图片、标题、切换、关闭和下载入口；不展示 PSD 下载或作者跳转。标题根据输入方式适时淡出，下载框完整列出同组图片。
- Blog 中 Category / Series 左右分布；系列总索引按 category 分组，过滤空系列，移除历史空配置。
- 本节为当前实现；下文 7 月的等待测量、Motion 布局和旧详情层记录仅供历史回溯，不作为当前规范。
- 详细计划、研究参考和测试范围见 [资源画廊重构记录](archive/2026-09/resource-gallery-2026-09-05.md)。
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
