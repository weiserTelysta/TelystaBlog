# Gallery 与 Ebooks 分区建议

2026-11-13，根据当前内容与代码整理，作者确认后已实现 Gallery／Ebooks 分区。实际书目维护见 [Ebooks 操作指南](ebooks.md)。

## 现状与方向

资源目录有 76 份 Markdown：26 条公开插画、2 条公开图像、48 条插画草稿。未发现 PDF／EPUB／MOBI 电子书条目。`resourceDisplayPolicy.ts` 只展示插画和明确收录的两款 Minecraft 图像，`ResourceExplorer` 已采用等高行画廊与按需 PhotoSwipe 看图。因此公开页面改为 Gallery，符合现有内容和交互。

建议保留两个平级入口：

| 入口 | 网址 | 内容与展示 |
| --- | --- | --- |
| Gallery | `/gallery/` | 插画、角色设计、像素图等视觉作品；沿用现有原比例画廊与看图器 |
| Ebooks | `/ebooks/` | 书籍；小封面、书名、作者、语言和格式，进入独立书籍详情页 |

标题可沿用作者世界观为 `Weiser's Gallery`、`Weiser's Ebooks`。阅读笔记继续放 Blog 的 reading 分类，通过书籍详情的链接关联笔记，书目与阅读笔记各自维护。

## 数据与体验

Gallery 第一阶段可继续读取现有 `resources` 内容集合，保留内容 ID、图像 CDN 地址、草稿状态和下载行为；不用为页面改名同时搬动全部 Markdown 与 R2。保留原有安静、低饱和、原比例展示，作品信息可继续进入现有看图器。

Ebooks 新建独立的 `src/content/ebooks/` 与 Schema。使用固定保存的 `id` 生成 `/ebooks/<id>/`，避免书名改动影响网址。建议字段为书名、作者、译者、语言、简介、封面、出版信息、日期、标签、发布状态，以及可选的来源／许可信息、关联笔记、文件列表。PDF／EPUB 等是同一本书的格式，不拆成重复书目。

书籍详情先静态显示书目信息与可用格式，预览或打开阅读器时再加载文件。列表只下载封面；书籍文件单独按需分发，避免打开栏目即请求整本 PDF。首版无需内置完整 EPUB 阅读器。

### Ebooks 的四列布局与 R2 存储

作者补充的方向：电子书保存在 Cloudflare，桌面每行四项；每项无外边框，左侧封面，右侧依次为书名、作者、格式。按当前页面约 1120px 的内容宽度与约 24–28px 列间距，每项约 260px，可采用 70–80px 封面、约 14–16px 图文间距，余下空间展示文字。

条目以封面、文字与留白分组，背景延续页面底色；书名允许两行，作者使用次级文字，格式用 `EPUB · PDF` 这样的普通文字链接。保留键盘焦点指示。封面使用统一比例的预留区域和 `object-fit: contain`，保留完整书封；图片写入尺寸并懒加载。点击封面／书名进入详情，格式链接可直接下载，同一本书的多种格式共用一条书目。

建议约 1100px 以上四列，850–1100px 三列，540–850px 两列，更窄一列；实际断点通过中文长书名与多作者样本验证。四列属于整页书目网格，每一项内部仍是左右图文排列。

电子书可沿用已有 R2 自定义域名 `assets.telysta.com`，建议单独使用 `ebooks/` 前缀，例如 `ebooks/<固定ID>/<版本>/book.epub`，封面独立为 WebP。文件内容更新时使用新版本路径；仓库维护书目元数据、封面 URL 和各格式文件 URL，构建不下载电子书正文，访问列表也不请求书籍文件。R2 自定义域名可接入 Cloudflare 缓存，正式站点使用这一方式。[Cloudflare：公开桶与自定义域名](https://developers.cloudflare.com/r2/buckets/public-buckets/)

上传为 PDF／EPUB 设置对应 `Content-Type`，需要下载时设置 `Content-Disposition: attachment`，并按版本路径设置缓存元数据。现有图片上传允许列表保持原用途，电子书另设文件上传与校验流程。[Cloudflare：对象上传及 HTTP 元数据](https://developers.cloudflare.com/r2/objects/upload-objects/)

普通文件链接可先完成首版；以后嵌入通过 JavaScript 获取文件的阅读器，再为站点来源配置 R2 CORS。[Cloudflare：CORS](https://developers.cloudflare.com/r2/buckets/cors/)

已实现四列图文书目与响应式收列；目前没有真实电子书，公开页展示空书架，模板保持草稿。测试使用临时书目验证，不向正式站点加入示例书籍。

当前 `resources` Schema 强制要求图片，适配器只向看图器发送展示数据，现有素材上传／清单流程也以图片为中心。电子书需要独立文件字段与验证、下载入口和后台编辑适配；可共享日期解析、封面处理、站点 Layout 与字体管线。

## 迁移顺序与验收

1. 增加 `/gallery/`，更新首页入口、标题、canonical 和 sitemap。`/resources/` 保留为静态跳转，兼容既有 `?type=illustration`／`?type=image` 筛选地址。GitHub Pages 不提供应用服务器重写，沿用 Astro 的静态兼容方案并验证参数保留。
2. 已增加 Ebooks 独立集合、书目列表与详情页，接入内容校验，通过 Markdown 维护；首页入口已启用，暂无真实书目时显示空书架。真实文件按 [Ebooks 指南](ebooks.md) 上传并设置响应头后发布。
3. 功能稳定后再按维护收益调整内部 `resources` 命名，已有 ID、CDN URL 和草稿不因重命名而改变。

验收包括旧地址和筛选兼容、手机／桌面画廊、看图器与下载键盘操作、书籍详情稳定链接、列表无电子书正文请求，以及全量内容检查和 Pages 构建。保持当前长文版式、原生滚动与目录原位淡入。
