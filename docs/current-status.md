# 当前状态

更新日期：2026-08-14

## 已完成

- Astro 文章和资源 Content Collections。
- 首页、博客导航、栏目页、文章页与资源页。
- 文章标签、系列导航、年月时间线和右侧目录。
- 资源图库、原图下载、相关动作和状态筛选。
- 资源 `.cover.webp` 与 `.preview.webp` 自动生成。
- 基于清单、原图哈希、目标哈希和参数的增量图片跳过。
- GitHub Actions 资源图片缓存和 Astro 构建缓存。
- `npm run post:new` 中文文章创建命令。
- `npm run content:check` 跨内容检查。
- Node 单元测试和 `astro check`。
- Astro 7 与 unified Markdown 处理器配置。
- GitHub Pages 在完整检查通过后部署。
- 项目内 `$telysta-design-guardian` 风格 Skill。

## 内容系统

文章位于 `src/content/weiser-posts`，资源位于 `src/content/resources`。

文章栏目定义在 `src/config/content/blogCategories.ts`，系列定义在 `src/config/content/blogSeries.ts`。系列 ID 由 Schema 约束，`series` 和 `seriesOrder` 必须同时填写。

资源类型与状态定义在 `src/config/content/resourceTypes.ts`。资源 ID、路径、日期和文章常见 Markdown 问题由内容脚本补充检查。

## 图片系统

公开资源原图继续保存在项目中、进入 `dist/` 并提供下载。

显示版本参数：

- cover：最大 1200×1600，质量 84。
- preview：最大 3200×3200，质量 92。

每次构建仍会扫描并计算哈希，但未变化图片不会重新调用 Sharp 压缩。Astro 仍会完整生成静态站点和部署产物；当前没有页面级增量部署。

文章本地图片由 Astro 优化。文章专属图片采用 Markdown 文件旁的同名目录，共享图片放在 `src/assets/images`。

## 当前维护边界

- 保持当前深色、低饱和、安静的长文风格。
- 不在普通维护任务中大规模修改 UI。
- 不引入外部对象存储、Git LFS 或图片搜索命令。
- 不修改资源压缩质量，除非先进行单独的图片质量评估。
- 不把资源页改造成商城或重型图库。

## 已知风险

- 当前资源原图约 720 MiB，完整生产产物约 795 MiB；数值会随资源增减变化，因此构建、上传和仓库体积仍然较大。
- 图片跳过前仍需读取原图和目标图计算哈希。
- 复杂交互主要集中在分类手风琴、资源详情层和星空背景，后续修改需要单独验证键盘、滚动和 reduced-motion。
- 资源许可证内容需要作者人工确认，自动检查不替代授权判断。

## 日常验证

```sh
npm run post:new -- --help
npm run content:check
npm test
npm run typecheck
npm run check
```

主要文档：

- `docs/article-authoring.md`
- `docs/maintenance.md`
- `docs/resources.md`
- `docs/deployment.md`
