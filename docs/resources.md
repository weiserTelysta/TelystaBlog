# Resource Maintenance

资源页用于整理可以公开分享的素材、工程和其他文件。它不是商品列表，也不是纯相册，而是一处安静、清晰、可长期维护的资源索引。

## 文件位置

每个资源对应一个 Markdown 文件，推荐按类型放在：

```text
src/content/resources/{type}/{resource-id}.md
```

示例：

```text
src/content/resources/illustration/weiser-bunny.md
```

正式资源图片放在：

```text
src/assets/images/resources/{type}/{resource-id}/
```

当前项目仍兼容已有的测试插画目录：

```text
src/assets/images/illustration/
```

`src/assets/images/logo/` 和 `src/assets/images/accordion/` 是站点视觉资产目录，不作为资源页发布资产路径。

资源图片路径写错会导致构建失败。这样做是为了防止发布后才发现断图或下载入口失效。

## 新增资源流程

1. 把图片放到 `src/assets/images/resources/{type}/{resource-id}/`。
2. 在 `src/content/resources/{type}/{resource-id}.md` 写资源 frontmatter 和详情正文。
3. 新资源使用 `status: available`、`status: draft` 或 `status: unavailable` 表达生命周期。
4. 运行 `npm run build` 验证资源路径、格式和下载入口。

## 核心规则

`id` 是资源唯一标识，不能重复。

`type` 表示资源的内容主归属，只能选一个。

`formats` 表示这个资源提供哪些文件格式。

`actions` 表示用户如何获取这些文件。

`status` 表示资源生命周期。`available` 会公开显示，`draft` 不进入公开资源列表，`unavailable` 会显示资源但表达暂不可用。

旧内容里的 `draft: true` 仍会让资源不进入公开列表；新资源优先使用 `status`。

例如，一张插画同时提供 PNG 和 PSD，它仍然是：

```yaml
type: illustration
formats:
  - PNG
  - PSD
```

PSD 是格式，不是资源类型。百度网盘、下载链接、镜像链接是获取方式，写在 `actions`。

## 类型选择

当前资源类型定义在：

```text
src/config/content/resourceTypes.ts
```

新增资源类型时，只修改这个文件里的 `RESOURCE_TYPES` 配置。类型 id、筛选按钮、URL 参数校验和内容 schema 会从这里派生，不需要去组件里手动补筛选按钮。

现有类型：

`illustration`：插画、立绘、角色图。

`image`：照片、截图、普通图片素材。

`music`：音乐、音频。

`video`：视频、影像。

`project`：工程包、模板、源工程、可继续扩展的项目资源。

`other`：暂时无法归类的资源。

如果一个资源只是附带源文件，不要因此改成 `project`。只有资源本身就是工程、模板或项目包时，才使用 `project`。

## Frontmatter 模板

```yaml
---
id: resource-id
title: Resource Title
summary: 一句话介绍这个资源。
type: illustration
status: available
image: src/assets/images/resources/illustration/resource-id/example.png
cover: src/assets/images/resources/illustration/resource-id/example-cover.webp
preview: src/assets/images/resources/illustration/resource-id/example-preview.webp
publishedAt: 2026-06-06
updatedAt: 2026-06-06
formats:
  - PNG
  - PSD
variantCount: 3
license: 仅供个人学习、预览与交流使用，请勿商用或二次分发。
actions:
  - type: download
    label: 下载 PNG 原图
    href: src/assets/images/resources/illustration/resource-id/example.png
    format: PNG
    primary: true
  - type: external
    label: 下载 PSD 源文件
    href: https://example.com
    format: PSD
    provider: 网盘名称
    code: 提取码
    note: 这里可以写差分、文件大小或其他说明。
---

这里写资源详情介绍。可以说明资源包含什么、适合如何使用、是否有差分或注意事项。
```

## 日期字段

`publishedAt` 表示资源第一次在本站公开的日期。

`updatedAt` 表示资源信息、预览图、下载链接或文件版本最近更新的日期。

资源列表默认按 `updatedAt` 倒序排列。不要用网盘上传时间代替 `publishedAt`，除非它确实就是资源在本站公开的时间。

## actions 说明

`download` 用于站内可直接下载的资源。

`external` 用于网盘、对象存储或其他外部页面。

`preview` 用于只提供预览入口。

`source` 用于源工程或源码入口。

`mirror` 用于备用下载地址。

除非 `disabled: true`，否则每个 action 都必须提供 `href`。本地 `href` 必须能解析到 `src/assets/images/resources/` 或 `src/assets/images/illustration/` 中的文件；外链和 `mailto:` 会原样保留。

动作文案要清楚直接，例如：

```yaml
label: 下载 PNG 原图
label: 打开百度网盘
label: 下载 PSD 源文件
```

不要把下载入口写得过度隐喻。诗性表达可以出现在页面标题、简介和空状态，操作入口应该优先服务用户理解。

## 图片策略

`image` 是必填字段，表示资源的主图或原图入口。

`cover` 和 `preview` 是可选优化字段。没有 `cover` 时，资源列表会使用 `image`；没有 `preview` 时，详情层和高清预览会使用 `image`。

资源较少或测试阶段，可以只写 `image`。这样能先把资源放进系统，不必每次手动准备多张图片。

正式资源建议逐步分离：

`cover` 用轻量图片，服务资源列表。

`preview` 用较清晰图片，服务详情预览。

`actions.href` 用于原始下载文件、网盘链接、PSD、工程包或其他获取方式。

大文件、PSD、工程包、视频文件建议走网盘、对象存储或其他外链，不建议直接放进站点首屏资源链路。

当前暂不实现自动缩略图生成。等资源数量变多，再考虑用构建脚本根据 `image` 统一生成 `cover` 和 `preview`。

## 体验原则

资源页的视觉目标是暗场索引，不是素材市场，也不是商品列表。

资源卡片只保留判断信息：图片、标题、类型、格式。简介、许可和下载说明放在详情层里。

图片承担主要 ACG 气质，UI 保持低对比、细边、轻动效。

资源卡片的文字不要直接压在图片亮部上。列表应优先保证识别和可读性。

桌面端资源页采用类型索引和资源网格的结构。类型筛选服务定位，资源卡片服务浏览。

详情层应该尽量轻，不做厚重的页面内页面。图片预览、资源说明和下载入口要清楚，但不要出现破坏气质的明显滚动条。

详情图可以进入高清预览。高清预览只负责看图，不承载下载和复杂文字。
