# 文章永久链接与短编号

日期：2026-11-03。所有博客文章统一使用 `WEISER` 加 12 位短 UUID，例：`/blog/WEISERa3f7c92d8e10/`。分类不进入文章编号；栏目与系列仍保留自己的语义网址。

## 写作与身份

```yaml
---
uuid: a3f7c92d8e10
title: 文章标题
publishedAt: 2026-11-03
category: reading
---
```

`uuid` 来自随机 UUID 的前 12 位十六进制字符，共 48 位随机量，属于短编号而非完整的标准 UUID。编号固定保存在 Markdown 中，不从日期、标题、分类或文件路径计算。内容加载器、列表、搜索、系列、WikiLink、canonical、分享信息和 sitemap 共用这个编号。重复编号会使内容检查和构建失败，不能静默覆盖另一篇文章。

- `npm run post:new` 和本地后台的新建入口自动生成编号。
- 在 IDE 直接创建 Markdown 后，运行 `npm run post:identify` 补号。命令只处理缺失编号的文章，保留原稿、YAML 注释和换行格式；重复运行不改变已有编号。非法编号或重复编号需要先人工修正。
- 检查和构建只读，不在 CI 中临时生成随机值。手建文章补号后，应把带编号的源稿提交 Git。
- 改标题、文件名、目录或分类时保留 uuid。复制文章作为新稿时删除复制来的 uuid、redirectFrom、commentId，再补号；不能复用另一篇文章的身份。

## 文件名入口与历史地址

当前文件名仍可访问，例如 `reading/Commerce/双核投放法笔记.md` 的兼容网址是 `/blog/reading/commerce/双核投放法笔记/`，会跳转到短编号地址。该规则沿用历史 slug 规范：目录／英文转小写，`portrait` 对应 `portraits`，`letter` 对应 `letters`。

本次将 20 篇文章的原文件名地址保存到 `redirectFrom`，同时保留两篇 Commerce 笔记迁移前的 reading 地址，以及 Lamy、Serava 的既有跳转。当前路径和已保存历史路径均直接跳转至最终编号，不串联多次跳转。

```yaml
redirectFrom:
  - /blog/reading/双核投放法笔记/
  - /blog/reading/commerce/双核投放法笔记/
```

以后改名之前，将需要长期兼容的旧文件名网址追加到列表，保留已有项。旧地址必须是 `/blog/.../` 形式，不能指向外部地址、分类页或另一篇文章的永久链接。重复编号、旧地址冲突会报错。草稿不生成文章页或公开跳转，也不进入搜索与 sitemap。

`astro.config.mjs` 通过内容索引生成静态 HTML 跳转页，GitHub Pages 无需额外服务器配置。跳转页包含 meta refresh；这是静态跳转，不宣称为 HTTP 301。sitemap 仅收录正式页面。

## 评论关联

Giscus 从 `pathname` 改为 `specific`，使用固定 `data-term`。迁移文章的 `commentId` 保存原 pathname 去掉开头 `/` 的值；渲染时按 Giscus 原规则进行 URI 编码，保留结尾斜杠，使既有讨论继续匹配。

```yaml
commentId: blog/reading/双核投放法笔记/
```

已经发布的文章不要更换 commentId。新文章没有该字段时以 `WEISER<uuid>` 关联评论，后续改名或移动目录仍使用同一讨论。页面中的 Giscus backlink 会指向当前永久链接；远端讨论正文中的既有链接不在本次修改范围内。

## 分类与系列

全部七个分类的所属名统一为 Weiser，中文元数据与英文题签保持一致；原有插画、颜色、两行标题和交互保留。文章编号不包含分类，所以后续调整分类不会影响文章网址。

新增 `byzantine-civilization`（拜占庭文明史）系列，所属分类为 `reading`。《拜占庭的赠礼》为第 1 篇，保留作者完整正文，补齐双语元数据、日期、标签与系列归属。

## 实现入口

| 文件 | 职责 |
| --- | --- |
| `src/lib/postLinks.mjs` | 编号、WikiLink 与兼容地址冲突检查 |
| `src/lib/postLoader.ts` | Astro 内容 ID 使用固定 `WEISER<uuid>` |
| `scripts/lib/post-link-index.mjs` | 读取源稿并建立链接索引 |
| `scripts/lib/post-identity.ts` | 显式补号、保留原稿格式 |
| `scripts/lib/post-scaffold.ts` / `scripts/admin/ui/app.js` | 新建文章自动补号 |
| `astro.config.mjs` | 静态跳转与 sitemap 排除 |
| `src/components/article/ArticleComments.astro` | 固定评论映射 |

验证命令及发布核对见 [部署指南](deployment.md)；日常维护见 [文章写作指南](article-authoring.md)。

本轮已验证 20 篇文章、25 个历史文章入口、搜索、sitemap 与评论键一致；139 项单元测试、11 项后台浏览器测试、类型检查、96 份内容校验及生产构建通过。公开页面与加载稳定性覆盖 48 项场景，并复核手机／桌面中文显示、键盘与减少动态效果。提交 `4cb68c5` 已推送，并通过匹配该 SHA 的 [GitHub Pages 构建和部署](https://github.com/weiserTelysta/TelystaBlog/actions/runs/41567770273)。线上博客列表、拜占庭文章、新系列、搜索与旧地址跳转已逐项核对。
