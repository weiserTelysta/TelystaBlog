# WikiLink：可选别名与自动跳转

日期：2026-09-21。最终需求：作者只登记 aliases，正文写 `[[名称]]`；程序按目标文章当前位置生成链接，不维护 slug、短地址或 redirectFrom。

## 原因与实施计划

`[Telysta](/portraits/telysta/)` 是正确的 Markdown，但站点没有这个路由。原有文章使用 `/blog/<文件路径>/`，且此前未接入 WikiLink 解析器。

按最终确认的方案执行：建立显式 aliases 索引 → 接入 Markdown tokenizer → 自动使用原有文章路由 → 校验错误与缓存失效 → 测试改名／移动文件及开发热更新 → 更新写作说明。先前讨论的固定短地址与手填旧路径方案已撤回，没有修改路由、评论机制或阅读布局。

采用 [remark-wiki-link](https://github.com/landakram/remark-wiki-link) 的 Micromark 扩展处理双括号，在项目插件中负责名称解析；代码块、行内代码、转义括号和公式不会被当成链接。不使用整篇 Markdown 的字符串替换来生成 HTML。

## 作者只需这样写

在想被引用的那篇文章 frontmatter 中登记：

```yaml
aliases:
  - Telysta
  - 特莉丝塔
```

其他文章中：

```md
她与 [[Telysta]] 是对位关系。
她与 [[Telysta|她的姐姐]] 是对位关系。
也可以写 [[特莉丝塔]]。
```

构建查找 aliases 中的名称，计算目标文章当前 ID 和页面地址，再生成普通 Markdown 链接。作者无需填写 `/blog/…/`、相对路径或历史路径。

- `aliases` 可选；不需要被引用的文章无需登记。不会自动把所有标题／文件名当成别名。
- 名称全站唯一；忽略大小写并按 Unicode NFKC 归一化。`[[Telysta]]` 和 `[[telysta]]` 等价。
- 改文件名、移动目录后，只要保留 alias，所有 WikiLink 会重新解析到新地址。一个别名不能同时属于两篇文章，冲突会指出双方文件。
- 改 alias 名称会影响引用；需要改名时追加新名称，保留仍被使用的旧名称。
- 显示文字作为纯文本渲染，不执行其中的 HTML。
- 本轮支持 `[[目标]]` 和 `[[目标|显示文字]]`。章节锚点继续使用普通 Markdown 链接；不支持块引用、`![[嵌入]]` 或反向链接面板。

**范围区别**：保持有效的是站内 WikiLink 引用。外部收藏、手写 URL 和按 pathname 关联的评论，仍受文件路径变化影响；本轮没有承诺所有旧网页地址永久有效，也没有改变 Giscus 的关联机制。

## 实现与检查

- `src/lib/postLinks.mjs`：与 Astro 一致的文件 ID、别名／路径冲突、目标解析。
- `scripts/lib/post-link-index.mjs`：读取元数据、建立名称索引和摘要。
- `scripts/remark-post-links.mjs`：WikiLink 节点转成标准 Markdown link，复用现有链接样式。
- `src/lib/postLoader.ts`：显式使用原文件 ID；索引变化后让引用文章缓存失效，开发模式串行同步新增、修改和删除。
- 内容检查／后台保存：找不到目标、重复别名、无效字段和公开文章引用草稿会报错，附文件与可用时的行号。草稿正文允许暂时未完成的引用，发布前必须修复。
- 后台预览：显示 WikiLink 文字，沿用隔离预览规则禁用跳转；aliases 在源码模式编辑，现有元数据表单会保留这个字段。
- 摘要与搜索：保留 WikiLink 的显示文字，不残留双括号。

本轮只给 Telysta 登记 `aliases: [Telysta]`，Rhaelysa 正文改回 `[[Telysta]]`；其余人物正文保持不动。

## 验证记录

- 新增七项单元回归，覆盖可选别名、重命名与移动、Unicode 名称、冲突、缺失目标、草稿、代码／公式／转义、显示文字转义及内容报错行号。
- 公开页面 44 项、后台 6 项浏览器回归通过。新场景覆盖 390／1440px、键盘 Enter 导航、无 JavaScript，核对 canonical 和原有 pathname 评论配置。
- 在 `.tmp` 隔离项目中先构建，再只重命名目标文件并保留缓存重建，引用文章的链接自动更新；启动 dev 后只移动／重命名目标文件，不重启服务、不改引用正文，链接再次自动更新。
- 首次浏览器服务器在继承类型检查专用 WASI 环境变量时提前退出；在正常浏览器测试环境重跑后全量通过，未修改系统安全策略。
- 最终 `npm run check` 通过：110 项单元测试、86 个内容文档零错误／警告、类型检查零错误／警告、30 个页面构建成功。依赖审计零漏洞；桌面与手机截图核对未发现阅读样式变化。
- 截图、临时副本和日志位于被忽略的 `.tmp`。
- 2026-09-22 云端验收：代码提交 `37a423d` 已推送，GitHub Actions 的 [构建与 Pages 部署](https://github.com/weiserTelysta/TelystaBlog/actions/runs/35606760273) 均成功。
- 线上 Rhaelysa 正文已将 `[[Telysta]]` 渲染成指向当前 Telysta 文章的链接；来源页与目标页均返回 HTTP 200。目标 canonical 仍为原有 `/blog/portraits/telysta/…/` 地址，评论仍使用 `pathname`。
