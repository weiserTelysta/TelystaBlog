# 资源内容字段指南

资源条目位于 `src/content/resources`，使用 Markdown frontmatter 描述。资源页面是安静的个人资源索引，不是商城。

## 基础模板

```md
---
id: example-resource
title: Example Resource
summary: 一句简短摘要。
type: illustration
status: draft
image: src/assets/images/illustration/example/example.png
gallery:
  - src: src/assets/images/illustration/example/example.png
    label: "01"
    alt: 图片说明
credits:
  - label: Artist
    name: Example Artist
    href: https://example.com
publishedAt: 2026-08-14
updatedAt: 2026-08-14
formats: [PNG]
license: Draft license. Replace before publishing.
actions:
  - type: download
    label: 下载原图
    href: src/assets/images/illustration/example/example.png
    format: PNG
    primary: true
draft: true
---

这里写补充说明。
```

## 必填字段

- `id`：稳定且全站唯一，不要因标题修改而变化。
- `title`：显示标题。
- `summary`：卡片和详情摘要。
- `type`：必须来自 `src/config/content/resourceTypes.ts`。
- `image`：主原图路径。
- `publishedAt`：发布日期。
- `updatedAt`：最后更新日期。

## 状态

- `available`：公开并可正常获取。
- `draft`：不公开。
- `unavailable`：公开展示记录，但下载可能不可用。

旧内容仍支持 `draft` 布尔字段。新草稿同时使用 `status: draft` 和 `draft: true` 更直观；公开前确认两者不会互相冲突。

## 图片字段

- `image`：原图，也是默认下载来源。
- `cover`：可选的卡片显示图。
- `preview`：可选的详情显示图。
- `gallery`：同一资源的多张原图。

这些字段必须使用 `src/assets/images/resources/` 或 `src/assets/images/illustration/` 下、运行时可解析的 PNG、JPG、JPEG、WebP 或 AVIF 本地路径，不能直接引用外部主图。

当原图是 PNG、JPG 或 JPEG 且未明确填写 `cover`/`preview` 时，构建会优先查找同目录自动生成的：

- `<name>.cover.webp`
- `<name>.preview.webp`

它们只是显示产物，下载仍指向原图。

## Gallery

每项支持：

- `src`：本地原图路径。
- `label`：短编号或名称。
- `alt`：对图片内容的简短描述。

同一主题的多个变体放进一个资源的图库，不要为了每张图制造近似重复的资源卡片。

## Credits

每项支持：

- `label`：角色，例如 Artist、Source 或 Commission。
- `name`：名称。
- `href`：可选外部链接。

Credits 用于说明来源和参与者，不替代许可证。

## Actions

支持的 `type`：

- `download`：本地或外部下载。
- `external`：相关外部页面。
- `preview`：视频或演示预览。
- `source`：原始来源页面。
- `mirror`：镜像地址。

常用字段：

- `label`：按钮文字。
- `href`：地址；除禁用项外必须存在。
- `format`：PNG、PSD、ZIP 等。
- `provider`：网盘或服务名称。
- `code`：提取码等附加信息。
- `primary`：主要动作。
- `disabled`：暂不可用。
- `note`：补充说明。

本地下载路径必须指向上述两个资源图片目录中的真实原图。外部页面使用完整 HTTPS URL。

## 许可证

`license` 由作者根据真实授权情况维护。草稿占位许可证不能代表正式授权；自动内容检查不会替作者作法律判断。

## 正文

Markdown 正文适合记录背景、用途、创作说明和限制。摘要保持简短，详细内容放正文。

## 图片生成与缓存

运行：

```sh
npm run resources:images
```

当前参数：

- cover：最大 1200×1600、质量 84、透明度质量 95。
- preview：最大 3200×3200、质量 92、透明度质量 98。
- WebP effort：5。
- 不放大小图，不覆盖原图。

脚本使用 `.tmp/resource-images-manifest.json` 记录原图、目标图、生成参数和生成器版本。只有所有信息匹配时才跳过压缩。

## 发布检查

```sh
npm run content:check
npm run resources:images
npm run check
```

公开前人工确认：

- 资源 ID 唯一。
- 原图和图库路径正确。
- 下载仍指向原图。
- Credits 与 license 已确认。
- 状态不是草稿。
