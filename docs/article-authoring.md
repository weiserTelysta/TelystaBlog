# 中文文章写作指南

独立介绍页 About 直接编辑 `src/pages/about.md`，保留 frontmatter 的 `layout`、`title`、`description`，正文从段落或二级标题开始；页面标题由布局渲染，不必再写一个 H1。它不属于博客文章，也不出现在文章时间线中。

目录约定：观察笔记放在 `src/content/weiser-posts/notes/`，分类目录使用小写；阅读笔记可继续放在 `reading/Commerce/`、`reading/History/` 等子目录。文章的正式网址统一为 `/blog/WEISER<12位短UUID>/`，由 frontmatter 中固定保存的 `uuid` 决定，改标题、文件名、目录或分类均不改变该网址。完整迁移规则见 [文章永久链接](post-permalinks-2026-11-03.md)。

英文 `titleEn` / `descriptionEn` 仅用于标题和介绍，留空仍回退中文，不会自动翻译正文。既有文章保留双语元数据；单文件中／英／日展示仍在 [方案调研](multilingual-markdown-assessment-2026-09-21.md) 阶段，示例语言块尚不可用于生产文章。

## 文章互相引用

可以用 `[[Telysta]]` 或 `[[Telysta|她的姐姐]]`。只需在目标文章的 frontmatter 中登记 `aliases: [Telysta]`，构建会自动生成指向短 UUID 永久链接的原生链接。改文件名或移动目录时保留 alias 和 uuid。

aliases 是可选字段；只有主动登记名称的文章才能用该名称引用。语法示例见 [WikiLink 记录](wikilinks-2026-09-21.md)，其中九月的文件路由与 pathname 评论方案已由本轮永久链接替代。普通 Markdown 链接推荐使用 `/blog/WEISER.../`，不要把磁盘目录直接当作永久网址。

## 直接新建 Markdown（最少填写）

在已有分类目录中保存 `2026-9-13-文章标题.md`，直接写正文，例如：

```md
# 文章标题

这里写文章的第一段。构建会从正文提取摘要，不需要再手填中英文摘要。
```

保存后先运行 `npm run post:identify`，将固定短 UUID 写入源稿；只需补号一次，重复运行不会更换已有编号。此命令还记录当时的文件名地址及评论标识。检查和构建不会代为生成临时随机编号，缺失编号会明确报错。

标题优先使用正文的一级标题；未写时使用去掉日期的文件名。发布日期从文件名前缀推导（支持 `YYYY-M-D` 和 `YYYY.M.D`），更新日期默认等于发布日期，分类使用 `weiser-posts` 下的第一层目录，支持在其下继续建子目录。已有分类包括 `manuscript`、`collection`、`letters`、`reading`、`life`、`portraits`、`notes`；目录 `Notes` 也能识别。磁盘目录 `letter`、`portrait` 分别对应分类 ID `letters`、`portraits`，新建文章使用单数目录。`life` 目录直接对应 `life` 分类。`essays` 已移除，不再作为别名接受。

省略 frontmatter 时文章默认公开；尚未写完请加上：

```yaml
---
draft: true
---
```

有 frontmatter 时，已有字段优先；缺少或留空的标题、摘要、英文标题、英文摘要和更新日期会自动补全。英文内容暂用中文回退，不自动翻译。自动补全只发生在读取时，不改写 Markdown 文件。

文件须以小写 `.md` 结尾（`.MD` 在 Linux 部署中不会被加载）；填写 frontmatter 时，两条 `---` 必须顶格单独成行。无日期文件名需要填写 `publishedAt`；未知分类、无效 YAML、缺失图片、系列字段不成对仍会报错。普通文章无需填写 `series` / `seriesOrder`，不要留下模板中的孤立序号。

空 frontmatter 可以读取并推导元数据，但发布前仍须运行 `npm run post:identify` 保存编号。填写字段时必须使用 `key: value` 格式，不能把整块元数据写成列表或普通文本；系列序号必须为正整数。

文章列表下方的分类链接统一显示英文 ID；栏目入口未选择时使用 `Category / All Records`，选择后统一为 `Weiser's Manuscript`、`Weiser's Collection` 等所属名称。分类图片继续使用原有角色插画，题签所属名统一为 Weiser，在 `src/config/visuals/categoryVisuals.ts` 维护；选中入口也由题签派生。展开标题按所属名／分类名分成两行，介绍使用 `src/config/content/blogCategories.ts` 中的 descriptionEn。中文栏目元数据用于写作表单等其他位置。

## 创建草稿

需要交互式填写完整双语信息时运行：

```sh
npm run post:new
```

命令会用中文询问中英文标题与摘要、栏目、文件名 slug、日期、标签、系列和文章资源目录，并自动保存 12 位短 UUID。本地后台“新建文章”也会预先生成编号。此命令创建的文章始终为 `draft: true`；与直接新建 Markdown 的默认公开行为不同。

也可以一次提供参数：

```sh
npm run post:new -- --title "文章标题" --title-en "Article title" --description "文章摘要" --description-en "Article summary" --category manuscript --tags "Astro,Blog" --with-assets
```

查看全部参数：

```sh
npm run post:new -- --help
```

命令不会覆盖已有文件。非交互环境必须提供中英文标题、摘要和栏目。

## 文件与 URL

默认文章路径为：

```txt
src/content/weiser-posts/<category>/<slug>.md
```

文件必须以 `.md` 结尾。Astro 会自动发现所有符合规则的文章，不需要在其他文件登记；`npm run build` 现在会先运行内容检查，若误建成无扩展名文件会直接给出明确错误。

对应 URL 为：

```txt
/blog/WEISERa3f7c92d8e10/
```

示例对应 `uuid: a3f7c92d8e10`。`WEISER` 大写，后面的编号固定为 12 位小写十六进制。编号由随机 UUID 截取得到，不从标题或文件名计算；站内检查会拒绝重复编号。

slug 仅决定磁盘文件名，默认从标题生成，保留中文。`--slug` 可以指定日期前缀或其他文件名，不影响永久链接。当前文件名地址仍会生成静态跳转；改名之前，应把需要继续兼容的旧文件名地址加入 `redirectFrom`，保留已经记录的所有旧地址。迁移前文章的旧地址已统一登记。

## Frontmatter

- `uuid`：必填且固定的 12 位短编号；新建工具自动生成，手建文章用 `npm run post:identify` 补齐。复制文章作为新稿时不要复用编号。
- `redirectFrom`：可选的旧文件名网址列表，格式为 `/blog/.../`；列表中的旧地址直接跳转到永久链接。
- `commentId`：固定评论标识；迁移文章已保存旧 pathname 对应值，保留原样。新文章未指定时使用 `WEISER<uuid>`。
- `title`：文章标题。
- `description`：SEO 和文章元信息使用的摘要；正文没有可用段落时，也作为博客列表的回退摘要。
- `publishedAt`：首次发布日期，建议 `YYYY-MM-DD`；日期必须真实存在。
- `updatedAt`：最后更新日期，不能早于发布日期。
- `category`：一个稳定栏目 ID。
- `tags`：更细的主题标签。
- `draft`：`true` 不公开，`false` 公开。
- `series` 与 `seriesOrder`：可选，但必须同时出现，且系列所属分类与文章分类一致。
- `cover`：当前只接受非空的 `/images/posts/...` 公共路径；没有封面时删除该字段，不要保留空字符串。

纯日期在本机和 CI 均按 UTC 解释，文章显示与年月归档保持一致。旧的 `YYYY-M-D` 日期读取时会补零，不改写原稿；例如 `2026-02-30` 会报错，不会自动变成三月。

正文可以用一个一级标题开头，它会作为页面主标题，在正文中自动移除以避免重复；也可以直接从引言段落或二级标题开始。二级标题用于主要章节，三级、四级标题用于章节内的逐层分段，避免为了缩小字号而跳过标题等级。右侧文章目录收录二至四级标题，并按真实结构完整展开。

博客列表会自动提取 Markdown 正文中的第一段有效文字，并跳过标题、代码块、公式、图片、列表和过短片段。希望列表摘要更自然时，应尽早写出一段能独立表达文章内容的正文；无需再手动维护另一份列表摘要。

`description` 不会显示在文章标题下方。文章页标题区只展示标题以及英文发布、更新月日；完整年份仍保存在日期元素和 frontmatter 中。

## 新增栏目或系列

普通新文章不需要登记；运行 `npm run post:new`，从已有栏目和系列中选择即可。

只有真正新增栏目时才需要维护两个入口：

1. 在 `src/config/content/blogCategories.ts` 添加小写、稳定的栏目 ID 与显示文案。
2. 把优化后的风琴页 WebP 放进 `src/assets/images/accordion/`，再在 `src/config/visuals/categoryVisuals.ts` 导入并补充同 ID 的视觉记录。

风琴页图片属于站点 UI，应保留本地优化版 WebP；不要直接导入数 MiB 的 PNG 原图。原图放在仓库外素材目录保存。

新增系列只需在 `src/config/content/blogSeries.ts` 添加稳定的英文 slug ID、所属 `category`、标题和说明；`category` 使用已有栏目 ID，决定系列总索引的分组。没有公开文章的系列不会出现在总索引中。文章中的 `series` 必须使用 `id`，不能填写面向读者的系列标题，并同时填写唯一的 `seriesOrder`。例如页面显示“Telysta 札记”，文章应写 `series: telysta-notes`。`npm run content:check` 会直接报告未知分类、未知系列、缺少配对字段或重复顺序。

“拜占庭文明史”使用 `series: byzantine-civilization`，属于 `reading`；《拜占庭的赠礼》为第 1 篇。后续同系列读书笔记递增 `seriesOrder`。

## 在文章中插入简谱

简谱源文件保存在 `src/content/scores/<id>.jly`，由 `jianpu-ly` 与 LilyPond 生成透明 SVG。文章中使用下列代码块插入，不需要粘贴扫描图片：

````markdown
```score
guihui
```
````

修改简谱源文件后运行 `npm run score:render -- <id>`。日常开发与部署只运行快速的 `npm run score:check`，如果生成文件缺失或落后于源文件，会显示对应的重新生成命令。生成 SVG 和同名 JSON 必须与源文件一起提交。

现有例子：`guihui`（日志 01）、`lead-kindly-light`（02，主旋律版）和 `jesus-source-of-life`（03，含副歌）。调号如 `1=Ab`，附点弱起如 `3/4,4.`；`H:` 中文歌词中 `主_愿` 表示同一连音组中的两个字。转录后必须核对每节歌词、连音、八度点和拍数，并在桌面／手机查看完整谱面；编译成功不代表音乐转录一定正确。不同声部未全部录入时，应明确注明旋律版。

首次编辑简谱时运行一次 `npm run score:setup`。它会把 `jianpu-ly==1.889` 与 LilyPond 2.24.4 便携版放入被 Git 忽略的 `.tmp`，不会安装系统级软件。也可以自行安装工具，并通过环境变量 `PYTHON_BIN`、`LILYPOND_BIN` 指定位置。这些工具只在编辑谱面时需要，普通网站构建不需要安装。

首页随机头像不是 Logo，统一把 384×384 的 `.avatar.webp` 与原图放到 R2 的 `avatars/` 前缀，并在 `src/config/pages/homeProfiles.ts` 使用 `createCdnAvatar('<文件名>.avatar.webp')`。favicon、站点 Logo 与内联图标仍留在本地。

## 图片管理

图片说明已有画师署名、且已确认其主页时，直接把名字写成链接，例如 `*图 1：角色立绘，由 [Hoja](https://x.com/hoja1214) 绘制。*`。没有对应作品或明确主页时保留原文，不猜测作者、不添加空链接。

正文图片现在可以点击或按 Enter 放大，支持滚轮／双指缩放和 Esc 关闭；普通 Markdown 图片无需额外配置。已有图片链接保留作者指定的跳转用途。看图器展示当前图片源，清晰度取决于源图分辨率；不会自动找回未提供的高清原图。完整范围见 [图片放大记录](archive/2026-09/article-image-viewer-2026-09-24.md)。

使用 `--with-assets` 时会创建文章旁边的同名目录：

```txt
src/content/weiser-posts/portrait/mirelle-note.md
src/content/weiser-posts/portrait/mirelle-note/reference-01.png
```

Markdown 引用：

```md
![图片说明](mirelle-note/reference-01.png)
```

这里保存原始 PNG、JPG 或 JPEG，Astro 在构建时生成显示版本。不要手工维护哈希文件或 `.preview.webp`。

多篇文章共用的图片放在 `src/assets/images`。`public` 只用于固定 URL、无需处理或直接下载的文件。

## 数学公式与美元符号

本站启用了 KaTeX。单个 `$...$` 会被当成行内公式。中文金额优先写成“20美元”“2美元”；不要让两个美元符号把一整段中文夹在中间。

## 发布前

1. 完成标题和摘要，确认 uuid 已保存；手建文章先运行 `npm run post:identify`。
2. 检查栏目、标签和系列。
3. 更新 `updatedAt`。
4. 确认图片说明和路径。
5. 将 `draft` 改为 `false`。
6. 运行 `npm run check`。
