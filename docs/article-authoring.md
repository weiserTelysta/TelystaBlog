# 中文文章写作指南

## 创建草稿

推荐直接运行：

```sh
npm run post:new
```

命令会用中文询问标题、摘要、栏目、slug、日期、标签、系列和文章资源目录。新文章始终以 `draft: true` 创建。

也可以一次提供参数：

```sh
npm run post:new -- --title "文章标题" --description "文章摘要" --category manuscript --tags "Astro,Blog" --with-assets
```

查看全部参数：

```sh
npm run post:new -- --help
```

命令不会覆盖已有文件。非交互环境必须提供标题、摘要和栏目。

## 文件与 URL

默认文章路径为：

```txt
src/content/weiser-posts/<category>/<slug>.md
```

对应 URL 为：

```txt
/blog/<category>/<slug>/
```

slug 默认从标题生成，会保留中文，转换空格并删除不适合作为路径的字符。日期只保存在 frontmatter，不自动写进 URL；需要日期前缀时可以通过 `--slug` 明确指定。

## Frontmatter

- `title`：文章标题。
- `description`：列表、SEO 和文章元信息使用的摘要。
- `publishedAt`：首次发布日期。
- `updatedAt`：最后更新日期，不能早于发布日期。
- `category`：一个稳定栏目 ID。
- `tags`：更细的主题标签。
- `draft`：`true` 不公开，`false` 公开。
- `series` 与 `seriesOrder`：可选，但必须同时出现。
- `cover`：当前只接受非空的 `/images/posts/...` 公共路径；没有封面时删除该字段，不要保留空字符串。

页面的文章头部已经输出主标题，正文不要再重复一级标题。正文从段落或二级标题开始。

## 图片管理

使用 `--with-assets` 时会创建文章旁边的同名目录：

```txt
src/content/weiser-posts/portraits/sylvaena-note.md
src/content/weiser-posts/portraits/sylvaena-note/reference-01.png
```

Markdown 引用：

```md
![图片说明](./sylvaena-note/reference-01.png)
```

这里保存原始 PNG、JPG 或 JPEG，Astro 在构建时生成显示版本。不要手工维护哈希文件或 `.preview.webp`。

多篇文章共用的图片放在 `src/assets/images`。`public` 只用于固定 URL、无需处理或直接下载的文件。

## 数学公式与美元符号

本站启用了 KaTeX。单个 `$...$` 会被当成行内公式。中文金额优先写成“20美元”“2美元”；不要让两个美元符号把一整段中文夹在中间。

## 发布前

1. 完成标题和摘要。
2. 检查栏目、标签和系列。
3. 更新 `updatedAt`。
4. 确认图片说明和路径。
5. 将 `draft` 改为 `false`。
6. 运行 `npm run check`。
