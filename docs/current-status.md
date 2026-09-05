# 当前状态

更新日期：2026-09-05

## 已完成

- 会话角色 favicon 与首页头像同步；标签页隐藏时随机多语言祝福，返回恢复原标题。
- Blog/栏目页按需本地全文搜索；组图图片两侧箭头与防惯性连跳的滚轮导航，放大和下载弹窗滚动隔离。

- Astro 文章和资源 Content Collections。
- 首页、博客导航、栏目页、文章页与资源页。
- 文章标签、年月时间线，以及默认关闭、无边框、由正文右下缘低对比刻度触发的 H2–H4 文章目录。
- Category / Series 共享对齐入口；系列总索引按 category 分组，自动排除空系列。
- 文章底部“正文与附件 → 系列 → Giscus 评论”，其他页面不加载 Giscus。
- 原比例等高行式画廊、按需全屏看图、图片内聚操作与原图选择下载，不展示 PSD 或作者跳转。
- 稀疏资源筛选不拉伸页首；文章 CDN 图片在构建时补尺寸，评论预留高度，文章滚轮使用原生滚动（定点导航仍平滑）。
- Cloudflare R2/CDN 资源清单，以及原图、Character 和首页头像分发。
- 22 张独立插画 cover 上传 R2 `covers/`，列表体积降低 88.8%；2 款像素图复用，详情高清图与原图不变。封面发布前校验 CDN 字节，清单重建保留封面并验证来源。
- 基于原图哈希、目标哈希和参数的 CDN 图片增量跳过。
- GitHub Actions 中的 Astro 构建缓存。
- `npm run post:new` 中文文章创建命令。
- `npm run content:check` 跨内容检查。
- Node 单元测试、`astro check` 和独立 Edge / Chromium 浏览器回归测试。
- Astro 7 与 unified Markdown 处理器配置。
- GitHub Pages 在完整检查通过后部署。
- 项目内 `$telysta-design-guardian` 风格 Skill。

## 内容系统

文章位于 `src/content/weiser-posts`，资源位于 `src/content/resources`。

文章栏目定义在 `src/config/content/blogCategories.ts`，系列定义在 `src/config/content/blogSeries.ts`。系列 ID 由 Schema 约束，`series` 和 `seriesOrder` 必须同时填写。

资源类型与状态定义在 `src/config/content/resourceTypes.ts`。资源 ID、路径、日期和文章常见 Markdown 问题由内容脚本补充检查。

## 图片系统

插画原图、PSD/AI、Character 资源和首页轮换头像通过 Cloudflare R2 提供；仓库提交 `asset:` 清单，网站构建不再生成资源 WebP。

显示版本参数：

- 普通 display：最长边 3200，质量 95。
- 资源列表 cover：最长边 960，质量 92，内容哈希文件名。
- Character cover：最大 1200×1600，质量 94。
- Character preview：最大 3200×3200，质量 96。
- avatar：384×384，质量 95。

只有作者主动运行素材准备命令时才会扫描原图并计算哈希；`assets:prepare` 对未变化图片跳过压缩。独立 `assets:covers` 会重新生成当前公开列表的候选 cover，相同输出保持相同 URL，上传时跳过已有版本。Astro 仍会完整生成静态站点和部署产物；当前没有页面级增量部署。

文章本地图片由 Astro 优化。文章专属图片采用 Markdown 文件旁的同名目录，共享图片放在 `src/assets/images`。

## 当前维护边界

- 保持当前深色、低饱和、安静的长文风格。
- 不在普通维护任务中大规模修改 UI。
- 不引入图片搜索命令，也不在 CI 中保存 R2 凭据。
- 资源压缩参数按显示用途分档；升级参数前先做局部清晰度与体积评估。
- 不把资源页改造成商城或重型图库。

## 已知风险

- 资源迁移后，生产产物已由约 598.8 MiB 显著缩小；数值会随本地 UI 与文章图片变化。原图仍完整保存在作者素材目录和 R2 中。
- 运行 `assets:prepare` 时仍需读取原图和目标图计算哈希。
- 复杂交互主要集中在分类手风琴、资源详情层和星空背景，后续修改需要单独验证键盘、滚动和 reduced-motion。
- 资源许可证内容需要作者人工确认，自动检查不替代授权判断。
- 移出看图图片或闲置约 2.2 秒后隐藏文字与操作阴影；键盘/触控保留可发现性，键盘支持左右和 Escape。看图期间暂停背后星空绘制，关闭后恢复。
- 资源原图尚无强制下载响应头，目前在新标签打开后保存；隐藏 PSD 链接不等于将 R2 对象设为私有。
- 临时目录清理受到环境策略与 OneDrive 权限限制，未完成删除；具体保留规则见 [架构说明](architecture.md)。

## 日常验证

```sh
npm run post:new -- --help
npm run content:check
npm test
npm run typecheck
npm run check
npm run test:browser
```

主要文档：

- `docs/article-authoring.md`
- `docs/maintenance.md`
- `docs/resources.md`
- `docs/deployment.md`
