---
title: "文章标题"
description: "用一两句话概括这篇文章会带给读者什么。"
publishedAt: 2026-06-01
updatedAt: 2026-06-01
category: "manuscript"
tags: ["Astro", "Blog"]
draft: true
cover: ""
# series: "telysta-blog-build"
# seriesOrder: 1
---

# 文章标题

这里写正文。这个文件是博客文章模板，复制它之后请改成新的文件名，并保持 `draft: true`，直到文章准备公开。

## Frontmatter 字段

`title` 是文章标题，会显示在博客列表和文章详情页。

`description` 是文章摘要，适合写一到两句话。它不应该太长，也不要只是重复标题。

`publishedAt` 是首次发布时间，格式建议使用 `YYYY-MM-DD`。

`updatedAt` 是最近更新时间。如果文章后来修改过，记得同步更新它。

`category` 是文章主栏目，只能填写一个当前支持的栏目 id。

`tags` 是补充标签，可以写技术名、作品名、工具名、主题词或情绪关键词。

`draft` 控制是否公开。`true` 表示草稿，`false` 表示公开。

`cover` 是可选主图路径。第一版推荐把文章图片放在 `public/images/posts`，然后写成 `/images/posts/...`。如果不使用主图，可以删除这一行或保留为空字符串。

`series` 是可选系列 id。只有文章属于某个合集时才填写。

`seriesOrder` 是可选系列顺序。只有同时填写 `series` 和 `seriesOrder` 的文章，才会参与系列上一篇/下一篇计算。

## 可用栏目

```txt
manuscript  代码、项目、技术实践
collection  学习笔记、方法整理
essays      随笔、想法、片段
reading     阅读、影视、作品理解
life        生活记录、日常碎片
portraits   人物、角色、创作者观察
```

栏目是文章的主归属，标签是补充描述。不要用标签代替栏目，也不要为了一个临时主题创建新栏目。

## 正文图片

全站通用文章图片建议放在：

```txt
public/images/posts/
```

Markdown 中这样引用：

```md
![图片说明](/images/posts/example/detail-01.webp)
```

## 正文结构示例

### 一个小标题

这里写一段正文。可以保持段落短一些，让阅读节奏更轻。

- 列表项一
- 列表项二
- 列表项三

> 这里可以写引用、摘录或特别想保留的一句话。

```ts
const message = 'Hello, Telysta Blog';
console.log(message);
```

[这是一个链接](https://telysta.com)

## 写作检查

发布前可以检查这些点：

- `title` 是否清晰。
- `description` 是否能概括文章。
- `category` 是否是正确的主栏目。
- `tags` 是否具体而克制。
- `updatedAt` 是否已经更新。
- `series` 和 `seriesOrder` 是否只在需要合集时填写。
- `draft` 是否已经从 `true` 改成 `false`。
