# 配置入口

修改文案不需要进入组件。按用途选择文件，保存 UTF-8，保留字符串引号、逗号与必要占位符。

| 想修改什么 | 文件 / 字段 |
| --- | --- |
| 网站名称、简介、导航、分享图 | `site.ts` |
| 首页介绍、段落、社交链接、QQ/微信信息 | `pages/home.ts` |
| 首页随机句子 | `pages/homeGreetings.ts` 的 `HOME_GREETINGS` |
| 头像、名称、权重、启用状态 | `pages/homeProfiles.ts` 的 `HOME_PROFILES` |
| 离开标签页时的随机祝福 | `tabGreetings.ts` 的 `TAB_GREETINGS` |
| Blog 标题、搜索提示、系列总索引文案 | `pages/blog.ts`，尤其 `search` / `seriesIndex` |
| 文章日期前缀、目录、系列、复制提示 | `pages/article.ts`；复制状态在 `codeCopy` |
| 资源页介绍、筛选、看图按钮、下载提示 | `pages/resources.ts`；`viewer` / `download` |
| 分类、系列名称及归属 | `content/blogCategories.ts` / `content/blogSeries.ts` |
| 非插画 Image 的额外画廊收录 | `content/resourceGallery.ts` 的 `featuredImages` |
| 分类卡片图片与视觉映射 | `visuals/categoryVisuals.ts`（高级维护） |

## 增加一句祝福

在 `tabGreetings.ts` 数组中追加一行，不必修改组件或测试条数：

```ts
'愿你今天也能遇见温柔的事。',
```

至少保留一句非空文字。首页随机句子是另一份配置，新增对象示例：

```ts
{
  id: 'a-gentle-day',
  text: '愿你今天也能遇见温柔的事。',
  dayAffinity: 0.5,
},
```

`id` 必须唯一；`dayAffinity` 在 0–1 之间，越接近 1 越偏白天，越接近 0 越偏夜间（是偏好，不是严格时段）。`weight` 可省略，默认 1；不要把全部句子权重设为 0。`mood` 是可选标注。换行用 `\n`。

## 修改提示文案

只修改配置字段的文字；不写 HTML。`{count}`、`{limit}`、`{index}` 是运行时填数的占位符，请保留。按钮的 `ariaLabel` / `label` 同样是给键盘和屏幕阅读器用户看的说明，不能留空。

## 添加系列与分类

只往 `BLOG_SERIES` 或 `BLOG_CATEGORIES` 添加完整对象，ID 列表和 TypeScript 类型自动派生，不再手工修改第二份名单。系列的 `category` 填已有分类 ID。已有 ID 涉及文章引用、URL 与评论映射，改显示标题不等于改 ID。

新系列需有公开文章引用才会出现在索引。新分类还需在 `visuals/categoryVisuals.ts` 配置图片与文案映射，类型检查会提醒缺项；不要忽略错误。两份主配置至少保留一项。

## 资源和头像

插画继续通过 `src/content/resources` 添加，不在这里维护全部作品。需要额外显示 Image 类型时，将条目 `image` 的完整 `asset:` 键加入 `featuredImages`。名单不能使草稿、Character、头像、文章配图公开，也不放开 PSD 下载。

新增或换头像后运行 `npm run assets:favicons -- --cdn` 并检查生成图标。`enabled: false` 可停用头像；至少保留一个启用项。同一标签页的随机结果仍保留在 sessionStorage，改配置不等于每次刷新重抽。

## 不属于日常文案入口的内容

- `interactions/`、`pages/article.ts` 的 TOC 行为参数：高级交互调优，需要回归测试。
- `src/styles/`：字体、间距和配色规范，不随文案整理迁移。
- Giscus 仓库/映射、焦点恢复、DOM ID、滚轮防惯性等属于集成或内部实现，暂不包装成普通作者选项。
- 不修改 `src/generated/`、`dist/` 或编译后的 JS 来编辑内容。

## 生效与检查

本地开发通常会更新预览；正式网站仍需构建、提交并部署。修改后运行 `npm run check`，涉及 UI 文案长度或新选项时再运行 `npm run test:browser`。文案配置自身与结构测试不固定条数；测试中的文章样本和截图仍可能需要随内容变化维护。

完整维护规范见 [维护指南](../../docs/maintenance.md)。
