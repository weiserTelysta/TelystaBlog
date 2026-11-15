---
name: Telysta — Weiser's Melancholy
description: 安静、成熟、私人的写作与档案空间，阅读和内容操作优先。
colors:
  background: "#070a10"
  surface: "#0b0f17"
  text: "#d8dee9"
  strong: "#edf3fb"
  muted: "#8b95a7"
  moon-blue: "#9cc7e8"
  dusty-pink: "#d6a7c8"
  border: "rgba(255, 255, 255, 0.08)"
typography:
  brand:
    fontFamily: "Cinzel, Trajan Pro, Times New Roman, serif"
    fontSize: "0.9rem"
    fontWeight: 560
    letterSpacing: "0.025em"
  navigation:
    fontFamily: "Cinzel, Trajan Pro, Times New Roman, serif"
    fontSize: "0.84rem"
    fontWeight: 520
    letterSpacing: "0.055em"
  page-title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.9rem, 3vw, 2.5rem)"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "1rem"
    lineHeight: 1.75
  book-title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(1.45rem, 2.3vw, 1.85rem)"
    fontWeight: 550
    lineHeight: 1.45
  control:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    lineHeight: 1.5
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "0.8125rem"
rounded:
  control: "4px"
  panel: "6px"
  compact: "2px"
spacing:
  small: "8px"
  medium: "16px"
  page-gutter: "24px"
components:
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.control}"
    padding: "11px 13px"
---

# Telysta Design System

## Overview

保持已有的暗色、编辑式排版和私人档案气质，内容与阅读优先。依据是现有源码、作者明确反馈以及项目的 telysta-design-guardian Skill。

当前工作是精修。先修交互、对齐、间距、字号、留白和响应式；新的主观审美方向先提出建议，获得授权后实施。新引入的审查工具不能替换项目既有视觉语言。

## Colors

色值与字体的代码来源是 src/styles/tokens.css，由主站 Sass 和账户 Worker 资产构建共同使用。月光蓝用于链接、焦点及轻微状态，灰粉作辅助强调。保持深蓝黑背景与低饱和度，不添加霓虹、大面积品牌色或装饰性渐变。

## Typography

品牌与英文导航使用 Cinzel，中文正文与表单使用系统无衬线字体，首页私密文案保留 LXGW WenKai。完整原字体在 src/assets/fonts/，构建生成 WOFF2 子集。

同一语义角色使用同一变量：品牌 --type-brand-size，导航 --type-nav-size，页标题 --type-page-title-size，正文 --type-body-size，控件 --type-control-size，标签 --type-label-size。页标题上限40px，长书名详情使用独立的 --type-book-title-size、上限29.6px。首页身份Hero保持已有独立字号，不扩散到普通页面。

阅读器书名属于紧凑工具栏标题，使用正文级字号，完整标题可悬停查看。长书名、作者和按钮文案不得挤出视口。

## Layout

主站壳层1080px，文章正文约760px，登录表单上限420px。相关操作紧密分组，避免把表单控件拆到宽页面两端。窄屏保证可点击、可读、无横向裁切，支持200%缩放。

阅览器使用完整浏览器视口，工具栏以外的空间交给书籍；不保留普通页面的大标题、页头、页脚和顶部留白。系统全屏只由用户点击触发。

## Elevation & Depth

沿用低透明深色表面、细边框和克制层次。列表和分页不额外套卡片；操作状态结合文字、颜色和原生禁用语义表达。

## Shapes

表单保持4px小圆角与稳定边界。键盘焦点使用月光蓝2px外轮廓，不因视觉简洁隐藏焦点。

## Components

### Navigation

公开账户入口只保留Hero中间头像。账户头部使用英文 Back to site 返回主页，不耦合书室。普通入口 /console/ 与专属管理入口 /telysta-console/ 分开说明，预填邮箱不代表已登录。

### Forms

邮箱与发送验证码组成同一操作组，验证码单独成组，提交操作明确。保留label、email/one-time-code自动填充、粘贴、加载和错误反馈。状态更新不推动表单跳动，发送与主提交按钮至少44px高。

### Pagination

**以易用性为依据：上一页、数字页码、下一页紧凑相邻并整体居中，不能分散至页面左右两端。** 可用页码与前后页均能直接点击，保留原生链接、悬停与键盘焦点，首末页的不可用操作明确禁用。

跳页输入只是补充，不能替代直接点击。通常优先44px点击区域；极窄视口至少24px宽、44px高且不重叠。窄屏可用带完整可访问名称的方向箭头，避免分页拥挤。

### Reading controls

目录原位淡入，原生对话框管理焦点，Escape关闭并返回触发按钮。正文保持可读行宽，阅读器本身占满视口。PDF保留Range，EPUB保留HTML清理、沙箱和逐次资源鉴权。

## Do's and Don'ts

- 保留艺术风格、内容结构、配色与字体，优先最小修复和共享变量。
- 实际比较桌面、手机、键盘、减少动态与200%缩放。
- 沿用约140–220ms的状态变化与原位淡入，减少动态时即时完成。
- 不添加无关装饰、依赖、持续动画或重型卡片墙。
- 不因UI优化降低服务端鉴权；角色提升只属于固定超级管理员。
- 保持普通审查和精修模式，不启用高权限Live或自动修改流程。
