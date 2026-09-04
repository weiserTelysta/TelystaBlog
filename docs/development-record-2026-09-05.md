# 2026-09-05 开发记录：CDN、阅读体验与交互动效

本轮维护继续保留 Telysta 已有的深蓝黑、低饱和、安静留白与轻薄玻璃质感，不进行页面结构重做。修改重点是提高资源清晰度、改善长文阅读和补足交互状态反馈。

## CDN 与 WebP

- 原图、PSD/AI 继续保存在作者素材目录和 Cloudflare R2；网站使用 `assets.telysta.com` 分发。
- `scripts/prepare-cdn-assets.mjs` 保留指纹缓存和增量跳过，不在日常网站构建中重复压缩图片。
- 新增 `display`、`character`、`avatar` 三种生成档位：
  - `display`：最长边 3200，quality 95，alphaQuality 100。
  - `character` cover：最大 1200×1600，quality 94；preview：最长边 3200，quality 96。
  - `avatar`：384×384，quality 95。
- 三种档位统一使用 effort 6、smartSubsample 与 smartDeblock；插画使用 `drawing` 预设，普通展示图使用 `picture` 预设。
- 参数升级会改变生成器版本；已有素材只在明确执行素材命令时重建，网站 `npm run build` 不会处理外部原图。

常用命令：

```powershell
npm run assets:prepare -- --source "C:\Users\weise\Desktop\TelystaImages" --profile display
npm run assets:prepare -- --source "C:\Users\weise\Desktop\TelystaAssets\characters" --profile character
npm run assets:prepare -- --source "C:\Users\weise\Desktop\TelystaAssets\avatars" --profile avatar
```

## 文章阅读页

- 收紧 H2–H6 的段前、段后距离，保留章节分隔感，但避免标题之间出现过大的空洞。
- 代码块使用 Cascadia Code / JetBrains Mono 优先的等宽字体栈，并使用 Astro/Shiki 的高对比暗色主题。
- 代码块加入渐进增强的“一键复制”；无脚本时仍显示原始代码，不影响阅读。
- 代码、公式、简谱和目录继续允许触控板、滚轮与触摸滚动，但视觉上不显示传统滚动条。
- 文章目录使用分支细线与稳定缩进表达 H2–H4 层级；入口改为低存在感的目录刻度，不再使用旋转箭头。

## 数字简谱

- 简谱仍由 `src/content/scores/*.jly` 生成 SVG，构建只检查源文件哈希，不重复运行 LilyPond。
- 简谱保持在约 760px 的正文阅读宽度内，不再向两侧外扩，也不会侵入右侧文章目录。
- 乐谱源文件允许使用 `\break` 按乐句主动换行；《归回》改为每行约五小节的六行排版，避免单行音符过密或整体字号过大。
- 桌面端让谱面自然适配正文宽度；窄屏为了维持音符与歌词可读性保留局部横向拖动，隐藏传统滚动条，并只在窄屏显示查看提示。
- 删除简谱下方重复的署名/转录说明；谱内原有曲名、调号、节拍与歌词对齐继续保留。
- 文字简谱仍放在可展开的备用区域，兼顾复制、检索和无法读取 SVG 时的访问需求。

## 文章目录纠错

- 移除目录滚动区域的渐隐遮罩；目录项从面板顶部开始保持完整可读，不以透明度暗示滚动边界。
- 每次打开目录时清除上一次鼠标浏览留下的临时锁定，并在下一帧按正文当前阅读位置重新计算活动标题。
- 打开后的目录使用即时定位而非平滑追赶，保证右侧高亮项与左侧正文同步；阅读过程中的既有跟随逻辑保持不变。

## 交互动效

- QQ/微信二维码使用原生 `dialog`，加入 220ms 进入和 180ms 退出状态；退出动画完成后才关闭节点并把焦点还给触发按钮。
- Category 风琴卡加入由指针位置驱动的多层虹彩、微弱镜面高光和小角度倾斜；不使用持续自动动画。
- 所有新动效响应 `prefers-reduced-motion`，减少动态时保留状态变化但取消位移与过渡。

## 验收基线

- 桌面、移动端、键盘操作和 reduced-motion 均需检查。
- 提交前运行 `npm run check` 与 `git diff --check`。
- R2 资源先预演、再上传；确认 CDN 可访问后才推送依赖这些资源的网站代码。

实现依据：Astro 官方 Markdown/Shiki 配置、Sharp WebP 输出参数，以及 WCAG 2.2 对焦点与交互动效的建议。
