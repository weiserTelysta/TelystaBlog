# 文档导航

日常操作从下面直接进入具体指南，不必先翻计划或阶段日志。更新：2026-10-04。[回到项目首页](../README.md)

## 常用入口

| 要做什么 | 操作与指南 |
| --- | --- |
| 打开管理后台 | `npm run admin` → http://127.0.0.1:4323/；[完整使用说明](local-admin.md) |
| 打开网站预览 | 另开终端 `npm run dev`；[环境与排错](maintenance.md) |
| 写文章与插入图片 | [文章写作](article-authoring.md) |
| 引用另一篇文章 | [WikiLink](wikilinks-2026-09-21.md) |
| 修改首页、问候语和配置 | [配置文件地图](../src/config/README.md) |
| 编辑 About | [Markdown 源文档](../src/pages/about.md) |
| 新增资源条目 | [资源维护](resources.md) · [完整字段](resource-content-guide.md) |
| 上传 R2、转 WebP、更新封面 | [CDN 操作流程](cdn-assets.md) |
| 检查与部署 | [维护指南](maintenance.md) · [部署指南](deployment.md) |
| 查功能和工程结构 | [功能与配置](feature-map.md) · [架构](architecture.md) |

## 当前状态与待办

- [当前状态](current-status.md)：近期完成与尚未实现的能力。
- 后台现有功能、保存和图片处理统一以 [本地后台](local-admin.md) 为准；[后台阶段计划](admin-ux-plan-2026-09-15.md) 保留执行过程与剩余计划，不作为启动指南。
- [云端后台研判](local-admin-assessment-2026-09-13.md)：线上认证与 R2 上传仍未实施。
- [多语言 Markdown 研判](multilingual-markdown-assessment-2026-09-21.md)：方案研究，尚未实施正文语言切换。

## 变更记录

这些文档解释当时的决策与验证；日常使用不需要逐份阅读。

- [阶段日志](stage-log.md)：按日期检索全部变更。
- [Mirelle 全量迁移](mirelle-rename-2026-10-04.md)：名称、网址、ID 与 R2。
- [导航两列与系列中文标题](home-series-language-2026-10-03.md)。
- [SEO、Markdown About 与星空恢复](seo-about-2026-10-02.md)。
- [原生滚动与目录整理](scroll-performance-2026-10-02.md)。
- [九月档案](archive/2026-09/README.md)：旧阶段方案和验收，保留历史，不当作当前规范。

维护文档时优先更新对应操作指南；计划、排错过程与数字记录留在阶段日志，不再为同一操作创建多个入口。
