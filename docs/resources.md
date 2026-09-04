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
6. 用 `asset:<清单键>` 填写主图和图库；同名原图及 PSD 会自动成为下载项。
7. 填写 Credits、许可证和其他外部动作。
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

R2 资源无需手工压缩。`assets:prepare` 会生成同名 `.webp`：最长边 3200、质量 92、透明度质量 98，并保留原图不变。首次遇到已经存在的 WebP 时只建立指纹记录；以后原图不变就直接跳过。

Character 素材保留 `.cover.webp`、`.preview.webp` 与原始 PNG；首页头像保留 `.avatar.webp` 与原始 PNG。它们在外部素材目录准备完成并上传 R2，不在网站构建期间重新生成。

当前质量偏向保留细节，不使用低质量强压缩。生成文件不会覆盖原图。

如果 WebP、原图哈希、目标哈希、尺寸质量参数和生成器版本都与缓存一致，脚本会跳过重新压缩。CDN 清单必须提交到 Git，增量缓存位于 `.tmp`，不提交。

## 体验原则

- 资源页保持安静、轻量、图片主导。
- 下载动作紧凑明确。
- 不把格式当成分类。
- 不用大面积高饱和色强调下载。
- 原图用于下载，WebP 用于网页显示。
- 修改交互前使用 `$telysta-design-guardian` 审查风格和可访问性。

## 检查

```sh
npm run content:check
npm run assets:manifest -- --source "<素材目录>" --collection "characters=<Character 目录>" --collection "avatars=<头像目录>" --check
npm run check
```

完整 R2 操作与安全规则见 [cdn-assets.md](cdn-assets.md)。
