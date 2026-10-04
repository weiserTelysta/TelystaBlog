# Mirelle 更名与素材迁移

## 当前约定

角色现用英文名为 Mirelle；中文名“米蕾勒”仅在设计理念文章的姓名段说明。此前配置使用 Serava，作者也曾写作 Sevara／Severa，均指同一角色。

## 实施范围

- 分类卡片花体名字、Life 分类入口、首页头像名称与 alt、系列资料、资源标题与说明、角色文章及标签统一使用 Mirelle。图片、配色、裁切和交互不变。
- 设计理念文章登记 Mirelle、米蕾勒及旧名别名，WikiLink 可以继续自动查找当前文章。
- 按作者追加要求，文章目录、文件名、系列 ID、资源 ID、首页身份 ID 与 favicon 已全量迁移为 mirelle。旧两篇文章和旧系列地址仅提供跳转，不再承载正文或出现在站内导航／搜索／sitemap。旧名 WikiLink 别名移除，保留 Mirelle 与米蕾勒。
- コクノコ委托保留原文件名、URL、日文正文及 Sylvaena 原称；只同步四个图片地址和已有角色标签。
- 桌面 TelystaImages/Serava 更名为 Mirelle，图片与本地 PSD 的文件名前缀同步，头像源文件同步更名。PSD 仅本地保存，不上传。
- R2 在原 bucket telysta-blog-assets 内复制 13 个对象到 Mirelle 新地址：4 组原图／WebP、2 个头像对象、2 张封面与 1 张花卉 WebP。旧对象保留为兼容地址，不清空或重建 bucket。
- 更新 CDN 主清单与封面索引；内容哈希、尺寸、压缩质量保持不变，先验证新 CDN 地址再部署页面。

## 验证

- 类型检查 0 错误／0 警告、116 项单元测试通过，生产构建生成 35 页。
- 18 项相关浏览器测试通过：分类英文题签、栏目入口、资源封面／图库／原图下载，以及旧委托的图片放大、触摸与键盘操作。
- 首批验证检查了显示名与图片；后续网址迁移见下节。
- assets:manifest --check 通过，118 组资源、0 个源文件；本地 PSD 保留但未进入上传与公开清单。
- 13 个新 R2 对象逐一比较源／目标 MD5 与大小；有本地源文件的对象还与本地字节计算结果一致。13 个 CDN 地址均返回 200，Content-Length 与对象大小一致。旧 R2 对象保留不删除。
- 初次经 CDN 全量下载大尺寸原图遇到超时，改用 R2 对象哈希与本地源文件核验，并单独检查 CDN 响应；不将超时误记为完整 SHA-256 下载验证通过。
- コクノコ委托与修改前快照比较，仅四个图片地址和既有角色标签变化。home.ts 未改动。

原始执行日志、迁移清单和逐图结果位于本地 .tmp/mirelle-rename-2026-10-04/（verified-assets.json、r2-verified.log、manifest-check.log、check.log、browser.log），不提交临时文件。

## 追加：全量网址迁移与文档入口

- 设计理念正式地址：/blog/portraits/mirelle/2026-9-29-mirelle的设计理念/；系列地址：/series/mirelle-notes/。神戸新一委托也进入 mirelle 目录；コクノコ委托按原约定保留。
- GitHub Pages 静态部署使用 Astro 生成的 HTML refresh 跳转，旧页面 canonical 指向新地址；这不是 Cloudflare HTTP 301 规则。依据 [Astro 路由文档](https://docs.astro.build/en/guides/routing/#redirects)。
- Giscus 使用 pathname 关联讨论，因此新地址使用新的评论映射；没有改写评论仓库，旧讨论仍在 GitHub。历史访客身份无法匹配旧 ID 时会按现有规则重新选择有效身份。
- R2 现行引用已全为 Mirelle；旧对象只作为兼容备份，不再次上传或删除历史图片。
- README 直接提供后台启动命令、访问地址与任务入口；本地后台操作集中在 local-admin.md。docs 索引区分操作、待办和记录，不将阶段计划作为启动前置阅读。
- 追加验证：类型检查 0 错误／0 警告，116 项单元测试、35 页生产构建及 14 项相关浏览器测试通过。覆盖三条旧址跳转、新 canonical、搜索／sitemap 无旧名、新系列链接、Mirelle 头像与 favicon、旧委托和资源下载。
- 当前 src／public／scripts 与搜索索引、sitemap 全量扫描无 Serava／Sevara／Severa；旧名称只保留于显式跳转表、跳转回归用例和历史文档。45 份 README／开发文档中的相对文件链接均有效；home.ts 未改动。
- 本轮日志：.tmp/mirelle-rename-2026-10-04/routes-check.log、routes-browser.log。
