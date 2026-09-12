# 2026-09-13 文章构建修复

## 失败原因

本地 `npm run build` 复现了内容检查失败：

1. `letters/2026-9-12-Lamy2000的使用体验` 没有 `.md` 扩展名，Astro 不收录。已补扩展名，正文不变。
2. `Notes/catholic-observation-log/2026.9.11-天主教考察日志02.md` 的 frontmatter 整块缩进两格，分隔线没有顶格，无法识别。已只移除元数据区域的共同缩进。
3. Lamy 文档还留有空英文标题、空中英文摘要、`category: letters` 和没有系列名称的 `seriesOrder: 1`。空字段现在可自动补全，`letters` 兼容到已有 `essays` 分类；无含义的空系列和孤立序号已从该文档移除。
4. 校验器错误地把正文开头缩进两格的合法 H1 判成“不是第一个内容”。现按前方是否存在非空内容判断。

现有目录整理不是这次失败原因；但目录会影响 URL。`blog-constructioin` 沿用作者目录名称，不擅自改名。文章已有明确日期时不会用文件名覆盖，例如日志 02 的原有 `publishedAt` 保持不变。

## 后续写作规则

完整用法见 [文章写作指南](article-authoring.md)。最简方式是在已有分类目录下新建 `YYYY-M-D-标题.md`，写标题和正文后推送到 `main`。

- 标题：已填 `title` 保留；未填则取正文 H1 或去掉日期的文件名。文章页面仍优先展示正文 H1。
- 日期：未填 `publishedAt` 时取文件名前缀；`updatedAt` 默认等于发布日期，不使用构建时间。
- 分类：未填时取 `weiser-posts` 下第一层目录，支持大小写归一；`letters` 是 `essays` 的兼容别名，并未新增栏目。文件 URL 仍保留 `letters` 目录。
- 摘要：从正文有效段落提取；没有可用段落时回退标题。
- 英文：留空时回退到对应中文字段，不自动翻译。
- 可选字段：空封面、空系列、空序号视为未填写；实际填写了系列或序号时，仍须配对且有效。
- 发布：直接新建 Markdown 默认公开；草稿须填写 `draft: true`。`post:new` 命令仍默认创建草稿。

两条 frontmatter 分隔线必须顶格；扩展名、损坏的 YAML、无法推导的日期/分类、无效系列和缺失资源仍会明确报错。不能保证任意损坏的 Markdown 或外部部署服务故障都能自动修复。

## 实现入口与显示约定

- `src/lib/postMetadata.ts`：内容检查与构建共用的自动补全规则，不写回源文件。
- `src/lib/markdownSource.ts`：内容检查与构建共用的 frontmatter / 正文分隔处理，兼容空元数据、BOM 与换行格式。
- `src/lib/postLoader.ts`：包装 Astro 官方 `glob()` 的 `parseData()`，保留原有路由、相对图片处理和开发监听；规则改变时需要更新摘要版本以刷新内容缓存。API 依据：[Astro 内容加载器文档](https://docs.astro.build/zh-cn/reference/content-loader-reference/)。
- `scripts/lib/content-validation.ts`：检查同一份补全后的元数据，保留无法安全推导的问题报告。
- `scripts/remark-article-title.mjs`：无 frontmatter 的文章也移除正文重复 H1。
- `src/components/blog/BlogPostItem.astro`：文章下方显示 `manuscript`、`collection`、`essays`、`portraits` 等英文 ID。栏目入口和名称保持原样；布局、颜色、字体、动效均保持既有风格。

## 验证

- `npm run check` 通过：Astro/TypeScript 无错误、警告或提示，84 项单元测试通过，82 个内容文档检查零错误零警告，简谱检查通过，最终构建生成 26 个页面。
- 临时创建只有日期文件名、H1 和正文的 Markdown，实际运行 Astro 生产构建并在 Edge 中打开，确认标题只显示一次、摘要自动生成。验证后已删除临时文章，并重新完成全量检查和构建。
- Edge 在 1440px 与 390px 下验证 Blog 列表：分类均显示英文 ID、无横向溢出；确认 manuscript 分类页标签一致，Lamy 文章返回 200 并包含正文摘要。截图人工复核保持原有风格。
- 新增回归覆盖：中文回退、纯 Markdown、letters 别名、空字段、孤立序号、缺失日期、损坏的 frontmatter、缩进 H1、无 frontmatter 的标题去重。
- `git diff --check` 通过。GitHub Actions 仍执行 `npm run check`，没有跳过任何构建门槛。

## 提交前代码质量审核

- 修复空 frontmatter（两条相邻的 `---`）被误判无效的问题，正确保留正文和报错行号。
- 拒绝列表、标量和显式 `null` 形式的 frontmatter，避免错误填写的字段被静默丢弃并触发默认公开行为；空 frontmatter 仍合法。
- 补齐 `seriesOrder` 正整数检查，拒绝零、负数、小数、非数字和布尔值，接受数字字符串。
- 合并校验器和加载器重复的分隔逻辑。标题、摘要已完整填写时，加载器不再为补全元数据重复读取 Markdown；只有缺少正文推导字段时才额外读取。
- 元数据缓存版本提升至 2，分类集合和别名转换函数移到模块级复用。
- 三项新增回归测试先复现失败，再验证修复通过。Edge 实际构建验证同时覆盖纯 Markdown 与空 frontmatter，临时文章均已清理。
- 暂存区检查确认四篇目录迁移的文章内容完全一致；Lamy 文档清理了空字段后的行尾空格。审核后创建本地提交，不推送或触发部署。
