# 资源维护

本文件是新增和整理资源的中文操作入口。完整字段定义见 [resource-content-guide.md](resource-content-guide.md)。

## 文件位置

```txt
src/content/resources/              资源 Markdown
src/assets/images/resources/        新资源原图目录
src/assets/images/illustration/     现有兼容原图目录
```

原图是数据源和访客下载目标，必须保留。公开资源原图会继续进入网站产物。

## 新增流程

1. 先确认图片是否已经存在于共享资源目录。
2. 没有时，为该资源创建稳定目录并放入原图。
3. 在 `src/content/resources` 创建对应 Markdown。
4. 初始使用草稿状态。
5. 填写主图、图库、Credits、下载动作和许可证。
6. 运行 `npm run content:check`。
7. 运行 `npm run resources:images`。
8. 本地预览卡片、详情和下载。
9. 确认授权后公开。

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

资源无需手工维护显示图。脚本会为 PNG、JPG 和 JPEG 生成：

- `.cover.webp`：列表显示。
- `.preview.webp`：详情显示。

当前质量偏向保留细节，不使用低质量强压缩。生成文件不会覆盖原图。

如果 WebP、原图哈希、目标哈希、尺寸质量参数和生成器版本都与清单一致，脚本会跳过重新压缩。CI 会恢复历史缓存，再只处理变化的项目。

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
npm run resources:images
npm run check
```
