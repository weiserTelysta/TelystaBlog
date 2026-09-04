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

文件必须以 `.md` 结尾。Astro 会自动发现所有符合规则的文章，不需要在其他文件登记；`npm run build` 现在会先运行内容检查，若误建成无扩展名文件会直接给出明确错误。

对应 URL 为：

```txt
/blog/<category>/<slug>/
```

slug 默认从标题生成，会保留中文，转换空格并删除不适合作为路径的字符。日期只保存在 frontmatter，不自动写进 URL；需要日期前缀时可以通过 `--slug` 明确指定。

## Frontmatter

- `title`：文章标题。
- `description`：SEO 和文章元信息使用的摘要；正文没有可用段落时，也作为博客列表的回退摘要。
- `publishedAt`：首次发布日期。
- `updatedAt`：最后更新日期，不能早于发布日期。
- `category`：一个稳定栏目 ID。
- `tags`：更细的主题标签。
- `draft`：`true` 不公开，`false` 公开。
- `series` 与 `seriesOrder`：可选，但必须同时出现。
- `cover`：当前只接受非空的 `/images/posts/...` 公共路径；没有封面时删除该字段，不要保留空字符串。

页面的文章头部已经输出主标题，正文不要再重复文章标题。正文从引言段落或二级标题开始；二级标题用于主要章节，三级、四级标题用于章节内的逐层分段，避免为了缩小字号而跳过标题等级。右侧文章目录收录二至四级标题，并按真实结构完整展开。

博客列表会自动提取 Markdown 正文中的第一段有效文字，并跳过标题、代码块、公式、图片、列表和过短片段。希望列表摘要更自然时，应尽早写出一段能独立表达文章内容的正文；无需再手动维护另一份列表摘要。

`description` 不会显示在文章标题下方。文章页标题区只展示标题以及英文发布、更新月日；完整年份仍保存在日期元素和 frontmatter 中。

## 新增栏目或系列

普通新文章不需要登记；运行 `npm run post:new`，从已有栏目和系列中选择即可。

只有真正新增栏目时才需要维护两个入口：

1. 在 `src/config/content/blogCategories.ts` 添加小写、稳定的栏目 ID 与显示文案。
2. 把优化后的风琴页 WebP 放进 `src/assets/images/accordion/`，再在 `src/config/visuals/categoryVisuals.ts` 导入并补充同 ID 的视觉记录。

风琴页图片属于站点 UI，应保留本地优化版 WebP；不要直接导入数 MiB 的 PNG 原图。原图放在仓库外素材目录保存。

新增系列只需在 `src/config/content/blogSeries.ts` 添加稳定的英文 slug ID、标题和说明；文章中的 `series` 使用这个 ID，并同时填写唯一的 `seriesOrder`。`npm run content:check` 会直接报告未知分类、未知系列、缺少配对字段或重复顺序。

## 在文章中插入简谱

简谱源文件保存在 `src/content/scores/<id>.jly`，由 `jianpu-ly` 与 LilyPond 生成透明 SVG。文章中使用下列代码块插入，不需要粘贴扫描图片：

````markdown
```score
guihui
```
````

修改简谱源文件后运行 `npm run score:render -- <id>`。日常开发与部署只运行快速的 `npm run score:check`，如果生成文件缺失或落后于源文件，会显示对应的重新生成命令。生成 SVG 和同名 JSON 必须与源文件一起提交。

首次编辑简谱时运行一次 `npm run score:setup`。它会把 `jianpu-ly==1.889` 与 LilyPond 2.24.4 便携版放入被 Git 忽略的 `.tmp`，不会安装系统级软件。也可以自行安装工具，并通过环境变量 `PYTHON_BIN`、`LILYPOND_BIN` 指定位置。这些工具只在编辑谱面时需要，普通网站构建不需要安装。

首页随机头像不是 Logo，统一把 384×384 的 `.avatar.webp` 与原图放到 R2 的 `avatars/` 前缀，并在 `src/config/pages/homeProfiles.ts` 使用 `createCdnAvatar('<文件名>.avatar.webp')`。favicon、站点 Logo 与内联图标仍留在本地。

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
