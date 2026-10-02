# Serava 更名与 Telysta 插画更新日志

## 计划与边界

1. 将现行角色名称由 Sylvaena 统一为 Serava，修正新文章中混用的 Sevara；覆盖分类卡片与分类入口、首页头像身份、资源条目、文章和系列配置。
2. 更新本地素材名和 R2 的原图、WebP、头像、花卉参考图、独立封面地址，重新生成清单；不重新压缩原图，不上传 PSD。
3. 保留《2026-9-24-コクノコ委托》的文件名、页面 URL 和正文中的 Sylvaena。按作者确认，仅更新其中图片链接。R2 旧对象保留兼容已交给画师的引用。
4. 补齐 Telysta 插画更新日志的中英文元数据、日期、两组作品说明、七张图及资源入口；检查旧委托、新文章、分类与资源页后发布。

## 实现

- 分类仍为 `life`，题签为 `Serava / Life`，选中后显示 `Serava's Life`；仅更新身份名称和图片文件名，保留原有字体、配色、裁切与动画。
- 首页身份 ID 改为 `serava`，头像使用 `avatars/Profile_Serava.avatar.webp`，对应 32／48 px 本地 favicon 同步更名。资源移入 `illustration/serava/`，使用 `asset:Serava/serava_…`。
- 桌面 `TelystaImages/Sylvaena` 更名为 `Serava`，对应图片及本地 PSD 的文件名前缀改为 `serava_`；PSD 仍仅本地保存。头像文件同步改名。
- R2 新建 `telysta-images/Serava/` 下四组原图／WebP、两份头像文件及 `blog_imgs/serava-white-oriental-poppy-reference-2026-09-24.webp`；两份列表封面使用新的 Serava 路径。旧 Sylvaena 对象作为兼容地址保留，不再用于现行资源登记。
- 新设计理念文章统一为 `2026-9-29-Serava的设计理念.md`，保留 `aliases: [Serava]`；修正 frontmatter 整体缩进，补齐英文标题与简介，新增 `serava-notes` 系列。
- 神戸新一委托沿用作者已移动到 Serava 目录的文件，更新参考图名称和链接。コクノコ委托继续使用 `/blog/portraits/sylvaena/2026-9-24-コクノコ委托/`。
- Telysta 日志保留作者原有两段文字，新增细剑版与自由设计两节，七张图均使用已发布的 R2 WebP，原图下载沿用资源页；人物资料通过 `[[Telysta]]` 自动链接。
- 历史开发日志保留当时的 Sylvaena 名称，不改写历史记录；当前名称以本文为准。

## 验证

- 11 个新命名图片对象通过 CDN 下载 SHA-256 核对；两张新路径封面连同其余 24 张封面通过发布脚本哈希验证。R2 共 335 个对象，其中 13 个使用 Serava 名称，PSD 仍为 0。
- CDN 清单 `--check` 通过：118 组图片，74 个封面，0 个工程源文件；图片与旧对象内容相同。
- 委托内容与修改前快照比较，仅四个图片 URL 变化；作者此前已改为 Serava 的标签保持原样。文件名、路由、日文正文和图片说明中的 Sylvaena 未改动。
- 首次单元测试发现新首页身份缺少同名 favicon；补齐两份本地图标更名后，`npm run check` 通过：类型检查 0 错误／警告，111 项单元测试通过，92 份内容通过校验，生产构建生成 34 页。
- 37 项浏览器回归通过：桌面／手机分类题签、系列章节顺序、旧委托图片放大、资源封面／图库／原图下载、键盘焦点、减少动态效果和加载稳定性。
- 另外逐页核对新 Telysta 日志（七张图片均有预留尺寸、WikiLink 正确）、Serava 设计理念文章和旧委托 URL；文章及分类截图保持原有视觉样式。
