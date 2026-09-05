# 资源画廊重构：计划与实施记录

## 范围与设计取舍

资源页主要展示插画，保留 Telysta 的深蓝黑、无卡片边框、克制月光蓝与安静留白。不展示 Character 素材、头像、茶花文章配图、PSD 下载或作者页面跳转；不修改其他页面的素材用途，不自动发布草稿。

固定四列会把横图缩成细条；横图跨两列的砌砖布局则容易出现高度空洞。这里选择**按原比例分配宽度、同一行高度一致**的 justified gallery：桌面通常每行约 3–4 张，但不强制列数；窄屏自动减少。插画不裁切、不变形，最后一行不强行放大。

这一取舍参考 [Flickr 对 justified view 的介绍](https://blog.flickr.net/en/2012/02/28/announcing-justified-view/)。它不是所有画廊的唯一最佳布局，而是对本站横竖混合插画更合适的折中。

全屏看图采用 [PhotoSwipe 官方方案](https://photoswipe.com/getting-started/)，复用其尺寸适配、缩放、手势与键盘处理，再用站内字体和颜色调整 UI。样式参考与交互依据：[PhotoSwipe 配置](https://photoswipe.com/options/)、[自定义 UI](https://photoswipe.com/adding-ui-elements/)。不再维护旧的“详情面板 → 第二层高清图”两套状态。

## 执行顺序

1. 列表采用按图片比例加权的 CSS Flex 行布局，图片及入口随服务端 HTML 输出，移除客户端测量完成前隐藏图片的依赖。
2. 首次点击按需加载 PhotoSwipe；标题位于图片内侧下缘，前后、下载和关闭集中于同一操作组，不使用窗口边缘的原生箭头。单图不显示左右切换，组内按 `gallery` 顺序浏览。
3. 文字、阴影与操作条约 2.2 秒无操作或鼠标离开图片时淡出，移回或键盘操作时恢复，触屏不要求 hover。看图进入 180ms、退出 160ms，下载选择进入 180ms、退出 160ms；减少动态时关闭这些过渡。
4. 下载使用原生 `dialog`，完整列出所有图片，并指出当前图；Escape 只关闭最上层，关闭后恢复焦点，整个看图流程锁定并恢复背景滚动。
5. R2 仅做只读核对，补充明确的插画分组和已有组的遗漏差分，不把原图复制进仓库。
6. 更新中文文档，执行内容、类型、行为测试与生产构建。真实浏览器视觉/触摸体验单独验收。

## 本次内容补全

- 新增两组：Telysta 克里诺林裙（立绘、设计稿）；Weiser 新艺术风格（插画、配饰）。
- 补齐已有组：Telysta 官服半身、Weiser 官服半身、Rhaelysa 与 Telysta 阶梯场景 04。
- 共加入 7 张既有 R2 插画的内容引用；新条目的日期表示本站收录日期，不声称是创作日期。不虚构许可证。
- 随后按作者明确指定，新增五个条目、八张图：Minecraft 红/黄独立条目（各 1）；波斯少女（立绘、旗帜）；摩尼教（教士、少女、旗帜）；花毛茛（1）。原有振袖组保留三张，封面改为合图。
- `camellia_motif_furisode_both` 是振袖合图，与花毛茛 `ranunculus` 不是同一幅作品，不混为一组。`manichean_woman` 保持 R2 的原键拼写。
- `characters/`、`avatars/`、`blog_imgs/` 仍被排除。Minecraft 仅放行上述两个明确条目，不自动公开其他非插画素材。

## 文件职责

- `ResourceExplorer` / `ResourceCard`：服务端可见的图片索引、原生链接后备、按需打开。
- `resourceLightbox.ts` / `ResourceLightbox.scss`：PhotoSwipe 适配、图片上的简洁 UI、显隐与清理。
- `resourceDownloadPicker.ts`：独立的原生下载对话框。
- `resourceLightboxData.ts`：保持图片顺序、尺寸与替代文本，仅允许图片下载。
- `resourceDisplayPolicy.ts`：画廊发布范围；`resourceDownloadPolicy.ts`：PSD 过滤。
- 已移除旧 `ResourceDetailOverlay` 与下载分裂按钮实现，不保留并行详情体系；旧实现可从 Git 历史恢复。

## 复现根因与性能修正

- 原 Category 使用自然行高，Series 单独设置最小高度，父级再垂直居中；真实 Edge 中桌面标签相差约 3.6px、320px 下约 12.4px。现共用字体/行高/内边距/最小高度，窄屏也使用相同两行结构，不用局部像素偏移。
- PhotoSwipe 原生键盘监听在开场动画结束后绑定，快速方向键会丢失。现在捕获并暂存按键，等 `openingAnimationEnd` 的所有内部监听完成后执行；不能在该事件的前置监听中立即切图，否则相邻图片容器尚未就绪，计数改变但画面空白。
- 工具条依据 PhotoSwipe 当前图片几何定位，读取尺寸不进入指针移动热路径；位置更新合并到一帧，闲置计时器复用。
- 画廊 hover 使用 1.025 倍 transform，不做布局动画；遮罩期间暂停被覆盖的星空 Canvas 与其指针计算，关闭后恢复。没有全站改写滚动手感，也不声称已消除所有设备上的卡顿。
- 前端资源模型移除旧详情面板字段和重复原图 URL；许可证、署名、正文仍保留在 Markdown。

交互实现依据：[PhotoSwipe 自定义 UI](https://photoswipe.com/adding-ui-elements/)、[图片说明与替代文本](https://photoswipe.com/caption/)。浏览器测试依据：[Playwright 浏览器 channel](https://playwright.dev/docs/browsers)、[本地预览服务](https://playwright.dev/docs/test-webserver)。

## 验收与边界

- 内容扩充后为 79 个内容文档、22 个静态页面；108 个文件类型检查无错误、55 项单元测试通过。提交前运行 `npm run check`、`npm run test:browser` 和 `git diff --check`。
- DOM 行为测试覆盖：服务端有图且链接可用、七张差分完整切换、七项原图可选、PSD/作者链接不出现、标题显隐、键盘切换、分层关闭、滚动与焦点恢复。
- 最新指定资源及已有对应组共 13 张图，WebP / 原图共 26 个 URL 的只读 HEAD 检查均返回 200。
- 已用独立 Edge 跑真实页面：320 / 390 / 768 / 1440px 对齐与无横向溢出、开场立即按键、目标图片进入视口、图片内工具条、闲置/离开显隐、下载框分层 Escape 与焦点返回、320px 触屏模拟、减少动态、像素皮肤原始 PNG、hover 不改变布局、星空暂停恢复、生产 HTML 收录范围。九项浏览器测试通过，并检查桌面/窄屏截图。真实 CDN 图片加载允许 20 秒等待，不能把网络下载时间等同于动画卡顿；触控模拟不代表真机手势手感验收。
- 原图抽查缺少 attachment 与 CORS 响应头，所以当前保留“打开原图后保存”的明确提示；若需强制保存框，后续只对原图设置响应头。未修改 R2 权限、元数据或删除文件。
- 不提供 PSD 链接不等于让公开 R2 对象变私有；直接 URL 的访问控制仍属于存储侧配置。
- 新依赖：生产端按需加载 `photoswipe@5.4.4`；`happy-dom` 与 `@playwright/test` 只用于开发测试，不进入浏览器产物。
- 依赖审计另外发现既有开发链 `@astrojs/check → yaml-language-server → ajv → fast-uri@3.1.5` 的高危通告。并非 PhotoSwipe/Happy DOM 引入；本轮未做无关的全量依赖升级，需另行维护验证。
