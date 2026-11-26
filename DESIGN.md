---
name: Telysta — Weiser's Melancholy
description: 安静、成熟、私人的写作与档案空间，阅读和内容操作优先。
colors:
  background: "#070a10"
  surface: "#0b0f17"
  text: "#d8dee9"
  strong: "#edf3fb"
  muted: "#8b95a7"
  soft-lavender: "#b8b2ca"
  focus: "#c8c3de"
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

主站和账户后台共用 `src/styles/tokens.css`。链接、按钮和轻量状态使用低饱和灰紫 `#b8b2ca`，边框与选中面使用同色低透明度。键盘焦点使用较亮的灰紫 `#c8c3de`，灰粉 `#d6a7c8` 用于局部装饰。插画、星空和分形保有各自的色阶。

## Typography

品牌与英文导航使用 Cinzel，中文正文与表单使用系统无衬线字体，首页私密文案保留 LXGW WenKai。完整原字体在 src/assets/fonts/，构建生成 WOFF2 子集。

同一语义角色使用同一变量：品牌 --type-brand-size，导航 --type-nav-size，页标题 --type-page-title-size，正文 --type-body-size，控件 --type-control-size，标签 --type-label-size。页标题上限40px，长书名详情使用独立的 --type-book-title-size、上限29.6px。首页身份Hero保持已有独立字号，不扩散到普通页面。

阅读器书名属于紧凑工具栏标题，使用正文级字号，完整标题可悬停查看。长书名、作者和按钮文案不得挤出视口。

## Layout

主站壳层1080px，文章正文约760px，登录表单上限420px。相关操作紧密分组，避免把表单控件拆到宽页面两端。窄屏保证可点击、可读、无横向裁切，支持200%缩放。

操作后台例外：作者明确采用 Cloudflare 式全屏布局，固定左侧分组导航、紧凑顶部操作栏、右侧任务内容。不沿用文章宽度、Hero、大标题区、装饰题签或重复身份介绍。后台标题只负责当前任务定位，内容从工具栏和表单直接开始。使用固定字号与更紧凑的层级，中文／英文切换覆盖全部界面。

不默认使用「英文题签＋大标题＋中文宣传语」三段式。登录页仅有紧凑任务标题（`--type-task-title-size`）和必要表单，不写欢迎口号。画廊和书室直接呈现筛选与内容，页面名称仍保留语义和 SEO。首页既有的中英文入口名称按作者设定保留。

独立账户 Worker 同样使用主站的 `starfieldRuntime.ts` 与星空样式，采用 subtle 变体；保持控件层级、减少动态及隐藏暂停，不复制动画逻辑。

阅览器使用完整浏览器视口，工具栏以外的空间交给书籍；不保留普通页面的大标题、页头、页脚和顶部留白。系统全屏只由用户点击触发。

## Elevation & Depth

沿用低透明深色表面、细边框和克制层次。列表和分页不额外套卡片；操作状态结合文字、颜色和原生禁用语义表达。

公开页面强调背景连续感。用列线、留白和字色分组，分隔线只在有助于操作或辨识边界的位置出现。站头和首页背景之间保持连续，系列卡片与讨论入口用无边框布局。

## Artwork

作者偏好 Fantasy Aesthetic 和 Dreamy Anime。欢迎在插画、花卉和少量装饰上使用细密的植物卷纹、对称纹样、蕾丝式细节和盛开花瓣。用少量精细装饰承载华丽感。它们适合完整的插画、首页彩蛋、题辞附近或章节末尾的留白，重点色用于局部。

花饰按页面需要少量使用。小花饰由几枚大小错落的碎花瓣组成，轻叠在文字框的右上角，整组约 19–27px 宽。正文的行距和点击范围由原组件决定。独立的花卉插画适合插画本身就是内容的页面。

「见我」用透明百合与红缎带收住短文。桌面插画位于文字右侧，底部贴近末段。窄屏把插画缩到约 80px，放在末段下方靠右。插画随正文原位淡入。透明素材的生成与导出方法见[百合与缎带制作记录](docs/lily-and-ribbon-workflow.md)。

首页社交图标下方的「第一颗星」用 Telysta 的红色侧影和一行龙藏体题字收尾。题字从后脑发结右侧开始，与疏开的发丝部分重叠。文字沿用站点灰紫，题名略带灰粉。站龄按北京时间的日历日更新。龙藏体只为这一句及数字保留 WOFF2 子集，授权随素材保存。[字体来源](https://fonts.google.com/specimen/Long+Cang)

花饰的疏密、分层和局部精修见[花卉装饰 Skill](.agents/skills/telysta-floral-ornament/SKILL.md)。

首页在当前标签页初次打开时固定一次背景抽样，星空为常态，四种分形合计约 12%。彩蛋延迟加载，中央留出头像和文字的空间。使用屏幕像素比与像素预算计算画布，视口外、后台标签页和模态层出现时暂停；减少动态使用静帧，WebGL 失败回退星空。

## Shapes

表单保持 4px 小圆角与稳定边界。键盘焦点使用独立的 `--color-focus` 外轮廓。

## Components

### Navigation

首页「一些无用的路标」保留 Navigation 英文题签和题句。四个入口并列，桌面两列，窄屏一列。每项用左侧淡线和留白建立范围，中文名称与英文短标同排，描述在下方。樱花、桃花、山茶和绣球的主花贴近各入口的右缘。各自的碎瓣通过疏密和朝向形成流势，几片淡瓣伸入描述底层。樱花疏散，桃花错落，山茶用卷瓣，绣球以小花成簇。悬停或键盘聚焦时，主花绕花心轻转，花瓣从根部依次舒展。邻近的小花和碎瓣沿原来的走势错时轻抬、微转。移开或失焦后直接收拢。文字、点击区域和远处碎瓣保持原位。减少动态偏好下仅即时呈现亮度变化。首页文学性分区标题用柔和灰蓝，入口名用柔灰，题签和描述保持更低亮度。独立导航与操作链接采用无下划线样式，键盘焦点保留轮廓。文章正文内的行内链接使用阅读样式。

常规公开账户入口保留Hero中间头像。评论区按2026-11-22的明确要求，可提供低调的「登录后参与讨论」链接；登录后返回原文章／书籍的讨论位置，不新增全站登录栏。账户页左上角品牌链接返回主页，不额外提供 Back to site 等重复返回操作。普通入口 /console/ 与专属管理入口 /telysta-console/ 分开说明，预填邮箱不代表已登录。

登录后不保留展示型页头。品牌链接、语言与账号操作放入紧凑工具栏；内部导航按内容、管理、账户分组，随当前界面语言显示。登录设备替代Session术语，配置以用途说明命名，原文和文件路径按需展开。

### Discussion

文章和书籍共用 `CloudComments.astro`。未登录时，页面直接输出可用的登录链接，登录后回到原讨论。登录入口的花瓣贴在文字右上角，行高与点击区域沿用操作链接的尺寸。悬停时文字轻微变亮，键盘聚焦时显示轮廓。

`FlowerOrnament.astro` 用于系列标题和讨论入口。花瓣进入视口时错时轻移后停在文字角上。减少动态和关闭脚本时直接呈现静态花瓣。

### Category and series

分类风琴打开后以全屏暗底呈现立绘和光栅，顶行只留关闭及必要的返回操作，导航名称「选择文章类目」由辅助技术读取。可滚动时首张立绘贴着轨道内边缘。每张卡片共用一组角色署名和栏目短标。署名沿用 MonteCarlo 花体，栏目短标用 Cinzel，简介使用正文字体。选中后在题签下方展开简介与篇数，保留题签字形和字号，键盘焦点使用单线轮廓。

系列总览采用紧凑页标题、左侧 4∶5 封面、右侧系列名、简介和篇数。桌面两列，窄屏一列。现有封面用公开画廊立绘的本地 WebP 缩略图，按 `artworkId` 对应。后台裁剪的新封面通过 `cover` 字段使用 R2 生成图。

### Forms

注册与登录是独立流程：注册设置用户名、密码并验证邮箱；登录进入已有账户，旧账户通过找回密码补齐凭据；站主只固定邮箱，用户名与密码由站主在私有初始化入口设置。保留 label、email/username/current-password/new-password/one-time-code 自动填充、粘贴、加载和错误反馈。验证码只在需要邮箱验证的步骤出现。状态更新不推动表单跳动，发送与主提交按钮至少44px高。实施进度以 `docs/platform-roadmap-2026-11-16.md` 为准，不把设计约定冒充已上线功能。

### Pagination

**以易用性为依据：上一页、数字页码、下一页紧凑相邻并整体居中，不能分散至页面左右两端。** 可用页码与前后页均能直接点击，保留原生链接、悬停与键盘焦点，首末页的不可用操作明确禁用。

跳页输入只是补充，不能替代直接点击。通常优先44px点击区域；极窄视口至少24px宽、44px高且不重叠。窄屏可用带完整可访问名称的方向箭头，避免分页拥挤。

### Reading controls

文章目录保持原位淡入。电子书目录使用侧栏：电脑端停靠在正文旁并让正文重新排版，手机端使用模态侧栏，点击外部或按Escape关闭并返回触发按钮；关闭按钮固定在头部，仅目录内容滚动。阅读器占满视口，宽屏双页、窄屏单页；正文左右半区点击、方向键／PageUp／PageDown与滚轮均可翻页，但不劫持链接、文本选择与缩放。PDF新标签页交给浏览器，保持Range与鉴权；EPUB／MOBI／AZW3保留HTML清理和无脚本沙箱。

## Do's and Don'ts

- 保留艺术风格、内容结构、配色与字体，优先最小修复和共享变量。
- 实际比较桌面、手机、键盘、减少动态与200%缩放。
- 沿用约140–220ms的状态变化与原位淡入，减少动态时即时完成。
- 正文和操作面保持安静。持续装饰动画仅用于批准的首页背景，避免额外依赖或重型卡片墙。
- 不因UI优化降低服务端鉴权；角色提升只属于固定超级管理员。
- 保持普通审查和精修模式，不启用高权限Live或自动修改流程。
