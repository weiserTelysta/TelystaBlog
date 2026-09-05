# 筛选间距、阅读稳定性与资源加载

## 本轮已修复

1. **稀疏筛选拉伸页首**：`ResourceExplorer` 有视口级 `min-height`，但 Grid 使用默认 stretch 分配剩余高度。只剩两张皮肤时，子 Grid 的标题、说明、筛选之间被撑开；1440px 实测标题位置偏移约 50px。外层与 hero 增加 `align-content: start`，不更改正常留白、画廊比例或字体。
2. **文章图片无预留尺寸**：原生 Markdown 外部图片没有 `width` / `height`，慢加载后改变正文高度。新增 `rehype-cdn-images.mjs`，从本地 CDN 清单补尺寸与比例，不访问 R2、不生成新的 WebP、不修改作者 Markdown。保留作者明确的尺寸，未知外部图片不猜尺寸；首张保持 eager，其余 lazy，异步解码。
3. **评论高度变化与滚动手感**：官方 Giscus 客户端通过消息调整 iframe 高度，默认占位仅 150px。现在评论外层与 iframe 预留 420px（不限制最大高度），缓解初次展开对后续内容的影响。文章滚轮不再经过 Lenis 的二次插值，使用原生滚动；目录/回顶等定点跳转仍保留平滑路径，其他页面不改滚轮手感。不全局禁用浏览器滚动锚定，也不强行固定评论区高度。

依据：[web.dev 布局偏移优化](https://web.dev/articles/optimize-cls)、[Giscus 官方客户端](https://github.com/giscus/giscus/blob/main/client.ts)、[Lenis 配置与 iframe 限制](https://github.com/darkroomengineering/lenis)。动态 iframe、图片尺寸缺失和滚动插值属于不同问题，不能仅调整动画时长或增加模糊掩盖。

## 缓存与加载的实际情况

2026-09-05 只读检查 `assets.telysta.com`：抽查 WebP 为 `CF-Cache-Status: HIT`，`Cache-Control: max-age=14400`，有 ETag 与 Last-Modified。没有证据支持“R2 完全没缓存”。Cloudflare 边缘命中与浏览器本地复用是两层缓存，不是一回事。

独立 Edge 的一次桌面实验：初次加载图片传输约 18.8 MiB；刷新仍有约 11.7 MiB 图片传输；随后从 Blog 返回同一资源页，图片新增传输为 0。此数值取自 CDP 网络传输事件，不使用跨域 Resource Timing 的零值猜缓存，也不把 `200` 直接当作重新下载。数据与窗口、已加载范围和缓存状态有关，不是所有访客的固定结果。

优化前，清单中 `telysta-images` 的 54 张显示图合计约 63.3 MiB，均无独立 cover。公开画廊仅选其中一部分，但列表直接加载最长边 3200px 的高清图。`loading="lazy"` 只能推迟请求，不能减小单张图片，也不能保证刷新时不发请求。

参考：[Cloudflare R2 缓存](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/)、[默认缓存行为](https://developers.cloudflare.com/cache/concepts/default-cache-behavior/)、[web.dev 图片性能](https://web.dev/learn/images/performance-issues)。

## 独立缩略图方案（本日后续已执行）

1. **先处理列表载荷**：为公开画廊生成独立缩略图，起步可测试最长边 960px、WebP 质量 92；根据高密度屏幕和细节抽查调整。此参数是候选，不是对所有插画的固定最佳值。Minecraft 64px 像素图直接复用，不上采样。
2. **继续使用 R2**：缩略图在作者素材准备阶段生成、上传，更新 CDN 清单 `cover`；现有资源解析器已优先用 `cover`，不需要第二套详情页，也不恢复每次 Astro 构建生成全库 WebP。
3. **详情和下载不变**：点开仍使用现有高质量 3200px 展示图；下载仍指向原始 PNG/JPG，不改 PSD 公开策略。
4. **最后调整缓存**：缩略图采用内容版本化文件名后，可考虑 `public, max-age=31536000, immutable`。目前同名 WebP 会被覆盖更新，不能直接给这些 URL 加一年 immutable，否则读者可能长期看到旧稿。先检查发布/缓存失效策略，再修改对象元数据；不用随机时间戳破坏缓存。
5. **验证收益**：同一浏览器与视口比较冷/暖加载实际传输、首屏显示时间与长任务，同时检查缩略图文字/线稿、横图比例和高密度屏效果。

初次稳定性修复未修改云端；后续经作者授权，已生成并上传独立 cover，详情高清图不变。没有加入 Service Worker、localStorage 图片缓存或大文件代理。具体维护步骤见 [R2 与 CDN](cdn-assets.md)。

### Cover 实施结果

- 公开列表 24 项：22 张插画 cover，另 2 张 Minecraft 像素图复用原显示图，不放大。Character、头像、茶花文章配图不纳入生成范围。
- 直接读取作者目录中的 PNG/JPG 原图，最长边 960px、WebP quality 92、alphaQuality 100，保留比例与透明通道。抽查透明立绘、横版场景与画廊呈现；cover 不是用于阅读细小设定文字的高清版本。
- 22 张列表图片体积由 **31,960,070 → 3,572,502 bytes**，减少 **88.8%**。R2 路径为 `covers/<原清单键>.<完整 SHA-256>.webp`；哈希取生成文件内容，不使用时间戳。
- `assets:covers` 只准备 `.tmp/cdn-covers`；上传经过 dry-run、限定上传清单与 rclone check（22 个文件、零差异）。`--publish` 再逐一 GET 公开 URL，核对 SHA-256 和字节数后才更新仓库清单。
- 独立 `src/generated/cdn-covers.json` 记录来源指纹与 cover 引用。常规 `assets:manifest` 自动合并，并校验来源内容，防止下次生成清单时丢失封面或继续引用过期 cover。普通 Astro build 不运行生成、上传或网络校验。
- R2 22 个新对象设置 `public, max-age=31536000, immutable`。rclone 需要同时传入 `--metadata` 和 `--metadata-set`；首次遗漏 `--metadata` 后已对本次新对象补齐，未动旧高清图。公开 CDN 已缓存的响应抽查仍为 `max-age=14400`，不宣称浏览器一年缓存已全网生效；待旧响应到期后复查，如仍为四小时再检查 Cloudflare 规则。未全站清缓存，也未修改网站 URL 来绕过缓存。

### 同口径传输量复测

独立 Edge、1440×1000、CDP `Network.loadingFinished.encodedDataLength`；首屏请求完成后测普通刷新，再从 Blog 返回。只统计 CDN 图片传输，不统计 HTML/JS/字体；不把以下结果解释为所有设备的固定加载时长。

| 场景 | 改前 | Cover 接入后 |
| --- | ---: | ---: |
| 首次进入（14 个图片响应） | 18.8 MiB | 2.20 MiB |
| 普通刷新（24 个图片响应） | 11.7 MiB | 1.22 MiB |
| Blog 返回资源页（24 个图片响应） | 0 bytes | 0 bytes |

刷新中请求数增加包含懒加载范围变化，不能一概当作重复下载。列表带宽问题已明显改善；这次未取得可严格对照的首屏耗时/长任务基线，因此不将体积降幅声称为等比例的速度或帧率提升。

实现参考：[Sharp WebP 参数](https://sharp.pixelplumbing.com/api-output/#webp)、[rclone S3 元数据](https://rclone.org/s3/#metadata)。

## 验收

- 用挂起的 CDN 图片请求验证正文在下载前即有尺寸和高度。
- 检查筛选两款皮肤后页首位置不变。
- 模拟 Giscus iframe 从 150px 更新到 520px，检查上方阅读位置不变；这是父页面布局测试，不冒充真实 GitHub 评论内容测试。
- 监听文章滚轮期间的状态，确认未启用 Lenis 平滑插值。
- 全量 `npm run check` 与 `npx playwright test`；触控实际手感与特定设备上的微小卡顿仍需人工复核。

执行结果：Astro/TypeScript 零错误，60 项单元测试、79 个内容文档检查、22 页生产构建通过；14 项 Edge 浏览器测试通过。主 CDN 清单完整来源重建 `--check` 通过，确认独立 cover 不会在下次清单维护时丢失。

本次将 `8ec4a60` 之后的稳定性修复与独立 cover 接入一起提交。新增回归验证：列表只请求 cover，打开看图器后请求大于 960px 的高清图；下载仍为原图且不暴露 PSD。
