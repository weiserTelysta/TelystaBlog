# 开发文档

以当前规范为准；历史方案保留背景，不代表仍需实施。

## 当前规范

- [本地后台使用](local-admin.md)：启动入口、保存／冲突处理、素材与写作边界。
- [功能与配置核对](feature-map.md)：首页、Hero、头像、标签页身份、分类、资源与发布的真实实现及缺口。

- [作者配置入口](../src/config/README.md)：改文案、加句子、系列及额外资源的直接入口和例子。
- [当前状态](current-status.md)：已经实现的能力与已知边界。
- [架构与目录](architecture.md)：代码职责、数据来源和清理规则。
- [日常维护](maintenance.md)：修改入口与提交检查。
- [文章写作](article-authoring.md)：Markdown、图片、分类、系列与简谱。
- [资源维护](resources.md) / [字段说明](resource-content-guide.md)：发布条目和原图下载。
- [R2 与 CDN](cdn-assets.md)：图片准备、清单、同步和安全边界。
- [部署](deployment.md)：GitHub Pages 发布流程。

## 开发记录

- [博客图片点击放大](article-image-viewer-2026-09-24.md)：按需 PhotoSwipe、手机缩放、焦点与滚动恢复、失败回退。

- [WikiLink 与自动跳转](wikilinks-2026-09-21.md)：可选 aliases、自动解析目标、文件改名与缓存验证。
- [分类虹彩、资源与英文元数据发布](category-resource-release-2026-09-21.md)：最终 Series 题签、角色配色、Telysta 新资源与发布核验。
- [单 Markdown 中／英／日展示研判](multilingual-markdown-assessment-2026-09-21.md)：单文件语言块、译文缓存、路由和风险；仅调研。
- [分类光泽、英文系列目录与歌谱](category-series-scores-2026-09-20.md)：复合反射、响应式角色图、Cloudflare 核查与日志 02／03 附件。
- [本地管理 UI 与功能补全](admin-ux-plan-2026-09-15.md)：当前实施计划、设计调研、图片处理、新增流程与最新验收。
- [本地写作体验](admin-writing-2026-09-15.md)：文章元数据表单、原文保留与隔离草稿预览。
- [后台第一版计划](admin-plan-2026-09-13.md)：本地优先的技术选择、第一版范围与历史验收。
- [后台技术研判](local-admin-assessment-2026-09-13.md)：云端与本地方案、认证、媒体管线和风险，作为选型依据。
- [文档核对与整理](documentation-audit-2026-09-14.md)：本次发现的偏差、归档清单与检查结果。
- [分类题签修正](category-localization-2026-09-13.md)：角色名、英文所属名称和 letters 分类。
- [系列章节导航](series-navigation-2026-09-13.md)：前后章与系列目录的规则。

- [2026-09-13 文章构建修复](article-build-2026-09-13.md)：失败根因、Markdown 自动补全、英文分类标签与验证结果。

- [阶段日志](stage-log.md)：按日期回溯。

## 历史阶段记录

以下文档保留当时的实现、测量和验收数据；日常操作以当前规范为准。

- [2026-09-06 提交前审核](archive/2026-09/review-2026-09-06.md)：审核结论、非阻断问题与验证边界。
- [2026-09-06 配置入口整理](archive/2026-09/config-entrypoints-2026-09-06.md)：文案归位、单一 ID 来源与配置保护。
- [2026-09-06 链接分享元信息](archive/2026-09/link-sharing-2026-09-06.md)：静态分享图、文章元信息及聊天平台缓存边界。

- [2026-09-05 标签页、搜索与组图操作](archive/2026-09/tab-search-gallery-2026-09-05.md)：角色 favicon、多语言祝福、本地全文搜索和图片两侧滚轮导航。

- [2026-09-05 加载与阅读稳定性](archive/2026-09/loading-stability-2026-09-05.md)：稀疏筛选间距、图片/评论跳动、独立 cover 上云与实测收益。

- [2026-09-05 开发记录](archive/2026-09/development-record-2026-09-05.md)：阅读、交互、评论、系列、资源更新。
- [2026-09-05 画廊迭代](archive/2026-09/resource-gallery-2026-09-05.md)：设计依据、修复根因与验收。

## 历史档案

- [早期架构与设计](archive/project-knowledge.md)
- [项目愿景](archive/project-vision.md)
- [博客方向](archive/BLOG_DIRECTION.md)
- [早期导航方案](archive/blog-navigation-plan.md)
