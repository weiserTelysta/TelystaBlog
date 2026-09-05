# 资源维护

本文件是新增和整理资源的中文操作入口。完整字段定义见 [resource-content-guide.md](resource-content-guide.md)。

## 文件位置

```txt
src/content/resources/              资源 Markdown
src/generated/cdn-assets.json       R2 公开资源清单
C:\Users\weise\Desktop\TelystaImages       大型插画素材源
C:\Users\weise\Desktop\TelystaAssets       Character 与头像素材源
```

原图是数据源和访客下载目标，必须保留。资源原图保存在作者掌控的外部素材目录，并通过 Cloudflare R2 分发；不需要把它们重复放入网站仓库。favicon、站点图标、字体和风琴页等关键 UI 视觉继续在仓库内保存。

## 新增流程

1. 在外部素材目录中为资源建立稳定目录，放入 PNG/JPG 原图；PSD/AI 尽量与原图同名。
2. 运行 `npm run assets:prepare -- --source "<素材目录>"`，只生成缺少或已经过期的高质量 WebP。
3. 运行 `npm run assets:manifest -- --source "<素材目录>"`，更新公开清单。
4. 先运行 `npm run assets:sync -- -Source "<素材目录>"` 预演，确认后追加 `-Apply` 上传 R2。
5. 在 `src/content/resources` 创建 Markdown，初始使用草稿状态。
6. 用 `asset:<清单键>` 填写主图和图库；同名 PNG/JPG 原图会自动成为下载项，PSD 只保留为作者源文件，不会在网站公开。
7. 在源文件中维护 Credits、许可证；新看图器不展示作者跳转或额外详情。
8. 运行 `npm run check`，本地预览卡片、详情和下载。
9. 确认授权后公开并推送。

项目不提供自动图片搜索命令；共享资源是否复用由作者维护。

## 类型与格式

资源只能选择一个主类型：

- `illustration`
- `image`
- `music`
- `video`
- `project`
- `other`

PNG、PSD、ZIP 和网盘是交付格式，不是资源类型。

## 图片策略

R2 资源无需手工压缩。`assets:prepare` 的 `display` 档位会生成同名 `.webp`：最长边 3200、质量 95、透明度质量 100，并保留原图不变。首次遇到已经存在的 WebP 时只建立指纹记录；以后原图不变就直接跳过。

Character 素材保留 `.cover.webp`、`.preview.webp` 与原始 PNG；首页头像保留 `.avatar.webp` 与原始 PNG。它们在外部素材目录准备完成并上传 R2，不在网站构建期间重新生成。

当前质量偏向保留细节，不使用低质量强压缩。生成文件不会覆盖原图。

如果 WebP、原图哈希、目标哈希、尺寸质量参数和生成器版本都与缓存一致，脚本会跳过重新压缩。CDN 清单必须提交到 Git，增量缓存位于 `.tmp`，不提交。

## 体验原则

- 资源页保持安静、轻量、图片主导。
- 以明确发布的插画为主，另按作者要求独立展示红/黄两款 Minecraft 皮肤。R2 清单不是发布清单：`characters/`、`avatars/` 和 `blog_imgs/`（包括茶花文章配图）不进入资源页，也不会把草稿自动公开。
- 使用等高、变宽的行式画廊，保留原比例；不强制四列或横图跨两格。末行不拉满，不裁切插画。容器上限 1120px，桌面间隔 12px，移动端 8px。
- 点图直接进入全屏看图器，按同一条目的 `gallery` 顺序左右切换。标题和操作位于图片内侧下缘，前后、下载、关闭四个按钮相邻，不分散在窗口角落。鼠标离开图片或约 2.2 秒未操作后隐藏整个文字/阴影层，键盘操作时恢复；触控不依赖 hover。
- ArrowLeft / ArrowRight 切图，Escape 逐层关闭。开场动画中的按键在初始化完成后执行，避免丢键或选中尚未就绪的空图片容器。
- 鼠标移入画廊图片轻微放大至 1.025 倍，不影响相邻布局；减少动态时关闭放大。Minecraft 皮肤按整数倍显示，下载保留原始 PNG。
- 下载动作通过小型选择对话框完整列出，不使用只能看到少量项目的下拉菜单。
- 不把格式当成分类。
- 不用大面积高饱和色强调下载。
- 原图用于下载，WebP 用于网页显示。
- PSD 不生成公开下载链接；若要从公网彻底禁止直接访问，还应将其移出公开 R2 域名或改放私有 bucket。
- 修改交互前使用 `$telysta-design-guardian` 审查风格和可访问性。

### 原图保存与 R2 响应头

下载选择框列出完整 PNG/JPG 等图片，不列出 PSD、作者跳转或其他工程文件。跨域原图当前会在新标签打开，用户可右键或长按保存。2026-09-05 抽查发现 R2 原图未返回 `Content-Disposition: attachment`，也没有允许本站读取响应的 CORS 头，不能仅靠前端的 `download` 属性保证自动弹出保存框。

如后续希望点击即下载，优先为**原图对象**配置 `Content-Disposition: attachment`；不要为网页使用的 WebP 配置此头，也不要为此引入大文件内存代理或公开 secret。本轮未改动 R2 元数据、权限或删除远端文件。

本次选择依据、执行步骤与待验收项见 [资源画廊重构计划与记录](resource-gallery-2026-09-05.md)。

## 检查

```sh
npm run content:check
npm run assets:manifest -- --source "<素材目录>" --collection "characters=<Character 目录>" --collection "avatars=<头像目录>" --check
npm run check
npm run test:browser
```

完整 R2 操作与安全规则见 [cdn-assets.md](cdn-assets.md)。
