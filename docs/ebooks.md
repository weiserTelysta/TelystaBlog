# 电子书维护

书室（Library）入口为 `/ebooks/`。桌面每行四项，每项左侧封面、右侧书名／作者／格式，以留白分组；约 1100／850／540px 断点下改为三／二／一列。标题与封面进入书籍详情，格式链接指向 R2。没有公开条目时展示空书架。

## 添加书目

复制 `src/content/ebooks/template.md`，改用新文件名和固定 `id`。一个文件维护一本书，多格式共用该条目。`id` 只接受英文、数字、连字符与下划线，最长 64 字符；保存后保持不变，改书名或 Markdown 文件名不会更改网址。

```yaml
---
id: example-book
title: 书名
authors:
  - 作者
translator: 译者（可省略）
language: 中文
publisher: 出版社（可省略）
publicationYear: 2026
description: 简短的书籍介绍。
cover: https://library-files.telysta.com/covers/example-cover.webp
files:
  - format: EPUB
    href: https://library-files.telysta.com/books/example-book/v1/book.epub
    bytes: 1048576
  - format: PDF
    href: https://library-files.telysta.com/books/example-book/v1/book.pdf
draft: true
publishedAt: 2026-11-13
updatedAt: 2026-11-13
---
```

以上为字段示例，示例地址并非已上传文件。译者、语言、出版信息、文件字节数和两种日期均可省略；正文从段落或 H2 开始。当前格式为大写 `EPUB`／`PDF`／`MOBI`／`AZW3`，一本书中同一格式只出现一次。

公开时填写作者、简介和至少一个文件；有封面时填写真实图片地址，缺少时显示书名占位，再设 `draft: false`。未填写 `draft` 默认仍为草稿；草稿不进入书架、详情或 sitemap。模板不会作为真实电子书展示。

运行 `npm run content:check` 或 `npm run check` 检查元数据、真实日期、重复 ID、重复格式、书库域名／路径和扩展名。构建不下载书籍或联网猜测文件是否存在，发布前确认 R2 文件可访问。目前通过 Markdown 维护书目，界面文案位于 `src/config/pages/ebooks.ts`。

## Cloudflare R2

电子书使用独立 bucket `telysta-library`，公开域名 `https://library-files.telysta.com`；书籍位于 `books/`，封面位于 `covers/`，原图仍存现有图片bucket。已接入632份公开书目、19个中图法大类，每页24项，分类和分页均可无脚本使用。原始697份的盘点、作者补全、公开排除与上传校验见[书室资料指南](library.md)。

`scripts/prepare-library-books.py` 离线准备初次书目与小封面，生成的固定ID保存在 `src/content/ebooks/imported/`。已发布条目更换文件时保留ID，不盲目重新编号。当前不凭相似书名合并不同译本或合集。

公开示例地址只说明字段，不代表文件存在。`ebookSchema.ts` 允许新书库的 `books/`／`covers/`，兼容旧 `assets.telysta.com/ebooks/`；S3 endpoint不能当作访客地址。书籍更版使用新对象路径，保留已发布链接。响应建议：

| 文件 | Content-Type | 打开方式 |
| --- | --- | --- |
| EPUB | `application/epub+zip` | 阅读软件下载 |
| PDF | `application/pdf` | 浏览器查看或保存 |
| MOBI／AZW3 | 相应Kindle格式或 `application/octet-stream` | 下载后打开 |
| WebP封面 | `image/webp` | 正常显示图片 |

强制下载需要 R2 响应头配合；跨域链接的 HTML `download` 属性不能单独保证 PDF 下载。R2 支持在上传时填写上述元数据及 Cache-Control，见[官方对象上传说明](https://developers.cloudflare.com/r2/objects/upload-objects/)。现有图片准备／同步脚本继续处理图片；电子书独立上传，不经过图片转换。

当前封面为最长320×480的小型WebP；页面已预留尺寸并懒加载，完整显示书封。列表和详情均不预取电子书正文。以后增加 JavaScript 在线阅读器时，再按站点来源设置 [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)。

## 测试布局

运行 `npx playwright test --config playwright.ebooks.config.ts`。服务临时生成八本公开测试书和一本草稿，构建到 `.tmp/ebooks-browser-dist`，随即移除测试源文件；测试书不提交、不进入正式 `dist/`。覆盖长书名、多作者、各列数、无边框、键盘、详情、格式链接、列表不请求书籍与草稿隔离。测试后运行普通构建可刷新正式内容缓存。
