# 2026-09-13：文章底部的系列章节导航

## 调研与方案

本次保留现有系列名称、篇数及留白，在下方增加「上一章 / 目录 / 下一章」。所有文章均显示这三项，固定三等分，无边框、无卡片底色，文字比正文略小。

参考的阅读案例：

- [GOV.UK Pagination](https://design-system.service.gov.uk/components/pagination/)：使用带可访问名称的原生导航链接，前后目标可通过名称说明；采用它的导航语义和 `rel="prev"` / `rel="next"`。GOV.UK 默认隐藏首尾缺失的链接，本项目按作者要求保留置灰入口，维持固定位置。
- [Astro 博客教程](https://docs.astro.build/en/tutorial/0-introduction/)：正文结束后给出下一阅读步骤，同时保留教程目录。采用“继续阅读”和“回到目录”并存的组织方式。
- [The Rust Programming Language](https://doc.rust-lang.org/book/ch01-00-getting-started.html)：顺序章节阅读明确，提供前后章导航快捷键。本项目沿用顺序阅读思路，保留原生 Tab / Enter，不增加全局左右键监听。

执行顺序：检查现有 DOM 与桌面、手机基线 → 保留系列入口并增加三列导航 → 接入公开系列顺序 → 验证各边界、键盘和动效 → 记录开发文档 → 完整构建检查 → 提交并推送 `main`。

## 行为

| 当前文章 | 上一章 | 目录 | 下一章 |
| --- | --- | --- | --- |
| 系列首篇 | 禁用 | 当前系列目录 | 下一篇公开文章 |
| 系列中间篇 | 上一篇公开文章 | 当前系列目录 | 下一篇公开文章 |
| 系列末篇 | 上一篇公开文章 | 当前系列目录 | 禁用 |
| 系列仅一篇公开文章 | 禁用 | 当前系列目录 | 禁用 |
| 无系列 | 禁用 | 禁用 | 禁用 |

- 复用 `getSeriesNavigation()`，按 `seriesOrder` 排序；日期和标题只用于同序号的稳定排序。不是按文章文件名或发布时间推断章节。
- 传入导航计算的文章集合先排除草稿；前后章和显示篇数均基于公开文章。序号之间有空缺时直接跳到相邻公开文章。
- 中间“目录”链接到 `/series/<series-id>/`，不是当前文章右侧的段落目录。
- 可用项为原生 `<a>`；禁用项为无 `href`、无 `tabindex` 的 `<span role="link" aria-disabled="true">`，点击不跳转，键盘跳过。链接的可访问名称包含目标文章标题。
- 不需要客户端 JavaScript，也不增加路由或滚动监听。

## 视觉与动效

- 原有系列名称与篇数保留；导航宽度复用 760px 文章正文容器。
- 三列使用 `repeat(3, minmax(0, 1fr))`，手机端仍保持三等分。每项至少 48px 高，字号 `0.9rem`，小于正文。
- 默认使用站点灰蓝文字，悬停或键盘焦点时变为月光蓝；缺少目标时使用更暗的灰色。
- 无常驻边框或底色；只有键盘操作出现清晰焦点轮廓。
- 颜色变化和箭头位移复用 140ms token，箭头只移动 2px；按下时以 70ms 变淡。
- `prefers-reduced-motion: reduce` 下取消过渡和箭头位移，功能与即时颜色反馈保持完整。
- 保持原有页面配色、文章宽度、系列标题排版和评论区顺序。新出现的导航行是本次有意增加的视觉差异。

## 修改入口

- `src/pages/blog/[...slug].astro`：构建阶段计算每篇公开文章的相邻章节。
- `src/components/article/ArticleSeriesNav.astro`：系列标题与三等分导航。
- `src/config/pages/article.ts` 的 `series.navigation`：可编辑文字及可访问名称。
- `tests/browser/article-series.spec.ts`：章节边界、禁用、响应式、键盘、无 JavaScript、动态效果回归。

普通写作只需要继续填写已有的 `series` 与正整数 `seriesOrder`；无需手工维护上一章或下一章地址。

## 验证与部署

- `npm run check` 通过：137 个文件的 Astro 检查零错误、零警告、零提示，TypeScript 检查通过，84 项单元测试通过，82 个内容文档检查通过，简谱一致性检查通过，生产构建生成 26 个页面。
- 8 项新增 Edge 浏览器测试通过：遍历现有全部公开系列，覆盖首、中、末章与单篇系列；无系列全禁用；320 / 390 / 768 / 1440px 三等分、触控尺寸、字号、无边框、无横向溢出；200% 文字缩放；键盘焦点、禁用项跳过、无 JavaScript 跳转；动效初始、中间、终点、按下、快速中断及减少动态效果。
- 额外 5 项既有浏览器回归通过：4 个尺寸的 Blog / Category / Series 对齐与溢出检查，以及无 JavaScript 的静态分享信息检查。
- 桌面和手机截图复核确认保留原有站点风格；控制台未发现新增页面错误。
- `git diff --check` 通过。未修改 README，未增加依赖或运行时脚本。

工作流仍由 `main` 分支 push 触发，先执行 `npm run check`，再发布 GitHub Pages；没有变更部署权限或跳过检查。推送后按提交 SHA 核实 [部署工作流](https://github.com/weiserTelysta/TelystaBlog/actions/workflows/deploy.yml) 的结果。
