# 电子书维护

Ebooks 入口为 `/ebooks/`。桌面每行四项，每项左侧封面、右侧书名／作者／格式，以留白分组；约 1100／850／540px 断点下改为三／二／一列。标题与封面进入书籍详情，格式链接指向 R2。没有公开条目时展示空书架。

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
cover: https://assets.telysta.com/ebooks/example-book/cover.webp
files:
  - format: EPUB
    href: https://assets.telysta.com/ebooks/example-book/v1/book.epub
    bytes: 1048576
  - format: PDF
    href: https://assets.telysta.com/ebooks/example-book/v1/book.pdf
draft: true
publishedAt: 2026-11-13
updatedAt: 2026-11-13
---
```

以上为字段示例，示例地址并非已上传文件。译者、语言、出版信息、文件字节数和两种日期均可省略；正文从段落或 H2 开始。当前格式为大写 `EPUB`／`PDF`，一本书中同一格式只出现一次。

公开时填写作者、简介、封面和至少一个文件，再设 `draft: false`。未填写 `draft` 默认仍为草稿；草稿不进入书架、详情或 sitemap。模板不会作为真实电子书展示。

运行 `npm run content:check` 或 `npm run check` 检查元数据、真实日期、重复 ID、重复格式、R2 域名／路径和扩展名。构建不下载书籍或联网猜测文件是否存在，发布前确认 R2 文件可访问。目前通过 Markdown 维护书目，界面文案位于 `src/config/pages/ebooks.ts`。

## Cloudflare R2

Git 维护书目元数据，封面与电子书存入现有 bucket `telysta-blog-assets` 的独立 `ebooks/` 前缀，通过 `https://assets.telysta.com` 分发，例如 `ebooks/example-book/v1/book.epub`。文件更新使用 `v2/` 等新路径，以区分缓存版本。自定义域名可以接入 Cloudflare 缓存；若要缓存所有书籍格式，可为 `ebooks/` 配置缓存规则，见[官方说明](https://developers.cloudflare.com/r2/buckets/public-buckets/)。

通过 Cloudflare R2 控制台或已有 R2 工具上传文件，上传时设置：

| 文件 | Content-Type | 下载响应 |
| --- | --- | --- |
| EPUB | `application/epub+zip` | `Content-Disposition: attachment` |
| PDF | `application/pdf` | `Content-Disposition: attachment` |
| WebP 封面 | `image/webp` | 正常显示图片 |

下载行为由 R2 响应头保证；跨域链接的 HTML `download` 属性不能单独保证 PDF 下载。R2 支持在上传时填写上述元数据及 Cache-Control，见[官方对象上传说明](https://developers.cloudflare.com/r2/objects/upload-objects/)。现有图片准备／同步脚本继续处理图片；电子书独立上传，不经过图片转换。

封面建议使用小型 WebP；页面已预留尺寸并懒加载，完整显示书封。列表和详情均不预取电子书正文。以后增加 JavaScript 在线阅读器时，再按站点来源设置 [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/)。

## 测试布局

运行 `npx playwright test --config playwright.ebooks.config.ts`。服务临时生成八本公开测试书和一本草稿，构建到 `.tmp/ebooks-browser-dist`，随即移除测试源文件；测试书不提交、不进入正式 `dist/`。覆盖长书名、多作者、各列数、无边框、键盘、详情、格式链接、列表不请求书籍与草稿隔离。测试后运行普通构建可刷新正式内容缓存。
