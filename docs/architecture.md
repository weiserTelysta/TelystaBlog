# 架构与目录维护

更新：2026-09-06。

作者入口见 [配置说明](../src/config/README.md)。`config/pages` 按页面归集可编辑文案，`config/content` 保存分类、系列及额外资源收录；分类/系列 ID 从资料数组派生。配置不依赖组件，组件读取配置并负责安全文本渲染；内部 DOM ID、焦点恢复与滚轮算法不作为作者选项。详情见 [配置整理记录](config-entrypoints-2026-09-06.md)。

## 页面与内容边界

| 位置 | 职责 |
| --- | --- |
| `src/pages` | Astro 路由；文章 URL、pathname 评论映射保持稳定 |
| `src/content/weiser-posts` | 文章原稿，含 Markdown 附件引用 |
| `src/content/resources` | 作者明确收录的资源分组，不是 R2 全量列表 |
| `src/content/scores` / `src/generated/scores` | 简谱源稿 / 可复现 SVG 与校验记录 |
| `src/generated/cdn-assets.json` | 全站共享 CDN 键、显示图尺寸与原图地址，需提交 |
| `src/config` | 栏目、系列、文案和视觉参数 |
| `src/lib` | 内容归一化、发布策略、数据适配和通用运行时 |
| `src/components` / `src/styles` | 页面交互 / 共享样式与设计变量 |
| `scripts` / `tests` / `tests/browser` | 维护命令 / 单元测试 / 真实浏览器回归 |

文章仅通过 `src/pages/blog/[...slug].astro` 渲染，正文和附件后是系列，再到独立 `ArticleComments`。不复制第二套文章 Layout。系列总索引按 category 分组，空系列不展示。

`scripts/rehype-cdn-images.mjs` 从已有 CDN 清单为文章外部图片补充尺寸，避免加载时推开正文；不下载或生成图片。文章滚轮保持原生，Lenis 只保留定点导航的平滑动作，首页/资源页仍使用原有配置。详情见 [加载稳定性记录](loading-stability-2026-09-05.md)。

Category 与 Series 共用 `BlogIndexControl.scss` 的字体、行高、内边距和最小高度。不要再次给某一侧加 `top` 或负 margin 修补基线。

## 资源实现

`resourceItems.ts` 在构建时读取内容与 CDN 清单，仅向 React island 发送图片、标题、类型及下载数据。Credits、许可证和作者正文仍保存在源稿中，不为了简化 UI 删除原始信息，也不再发送旧详情面板所需的冗余数据。

`ResourceExplorer` 输出可直接访问的图片链接，CSS 根据比例排等高行。点击后按需载入 `resourceLightbox.ts`；下载选择独立在 `resourceDownloadPicker.ts`，图片/下载转换与发布政策保持为纯函数。旧 `ResourceDetailOverlay` 和分裂下载按钮已移除，Git 历史可恢复，不并存两套详情状态。

图片上的标题和操作条使用 PhotoSwipe 尺寸计算，不在每次指针移动时测量 DOM。轻微 hover 只变换图片，不更改布局；闲置定时器复用。看图期间暂停 Lenis 和被遮挡的星空，关闭时恢复监听、滚动和焦点。

## 数据保留与清理规则

资源列表 cover 的离线生成由 `scripts/prepare-resource-covers.ts` 负责，复用公开资源筛选规则。`scripts/lib/cdn-covers.mjs` 负责独立索引合并与来源指纹校验；`src/generated/cdn-covers.json` 和主清单提交 Git，图片只上传 R2 `covers/`。`.tmp/cdn-covers` 为可重新生成的准备区，不参与 Astro build，也不作为网站公开目录。

- R2 和作者外部素材目录保存原图、PSD、Character 和头像。仓库保存必要图标、字体、风琴视觉及文章图片；不要为了“本地可见”复制整套原图。
- `characters` 资源草稿未在资源页展示，不等于无用；文章、原稿、许可证与其他手写内容不可因零引用直接删除。
- `.agents/skills` 是项目规范。作者有意删除的 `AGENTS.md` 不重建。
- `dist/`、`.astro/`、`node_modules/` 为可重建产物；构建和测试会使用，不需每次提交前清空。
- `.tmp/cdn-image-manifest.json` 是当前增量缓存；`.tmp/jianpu-ly` 与 `.tmp/lilypond-2.24.4` 是本地乐谱工具，不整目录删除 `.tmp`。
- `.tmp/browser-results` 存测试截图和失败 trace，不提交。浏览器 profile 可能含会话数据，不当作普通截图缓存删除。
- 删除前核对绝对路径、文件内容和引用，避免递归操作越界或碰到 OneDrive 链接。能恢复的旧文档放 `docs/archive`，而非直接丢弃。

本次尝试清理旧空图片目录和约 38.3 MiB 临时产物时，删除被环境策略阻止，可恢复归档也遇到 OneDrive 目录权限错误。因此没有宣称完成磁盘清理；原稿和远端文件均未删除。`.tmp/retired-2026-09-05` 可能保留归档尝试产生的空目录，后续可由作者在文件管理器核查处理。
