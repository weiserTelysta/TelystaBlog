# R2 图片整理与三组新资源

本批提交 `a923bfb` 的 [GitHub Actions 构建与部署](https://github.com/weiserTelysta/TelystaBlog/actions/runs/36455518940) 已成功。随后角色更名为 Serava，参见 [后续更名记录](serava-rename-2026-09-29.md)；下文保留本批执行时的名称和数量。

## 范围与计划

以 `C:\Users\weise\Desktop\TelystaImages` 为本地主数据源，核对 R2 全桶对象清单；新增三组资源，删除远端全部 PSD，仅同步 PNG／JPG／JPEG 原图与 WebP。保留本地工程文件、既有远端图片和历史 URL。

| 资源 | 图库 |
| --- | --- |
| Sylvaena · 礼魂插画 | 1 张场景插画 |
| Telysta · 细剑版服饰 | 全身插画、服装设定、细剑设计，共 3 张 |
| Telysta · 新服饰设计 | 全身插画、造型对照、服装设定、设计草图，共 4 张 |

资源收录日期为 2026-09-29，不推定作品创作时间或画师署名。原有 Telysta 服饰在本地移入 `archive/Telysta_Legacy`，同步修改该条目的清单键；远端旧图片仍保留，避免影响文章或外链。

## 上传与清单规则

- `sync-r2-assets.ps1` 使用有序允许列表，仅接受 PNG／JPG／JPEG／WebP，忽略扩展名大小写，排除嵌套 `TelystaAssets`；继续使用 `copy`，不删除未同步对象。
- `generate-cdn-manifest.mjs` 不再登记 PSD／AI，移除源码独占条目；保留 `sources: []` 数据结构以兼容消费者。资源 Markdown 同步清理 PSD 格式声明与显式下载动作。
- 嵌套的 Character、头像分别映射 `characters/`、`avatars/`，不会复制到插画前缀；准备脚本跳过 `TelystaAssets`，避免使用普通插画参数处理头像。
- 过滤规则依据 [rclone 官方过滤文档](https://rclone.org/filtering/)，允许列表末尾明确排除其余文件。

## 远端 PSD 清理

全桶清点共 323 个对象，其中 27 个 PSD、6,110,872,179 字节（约 5.69 GiB）。删除名单先预演，再用 `--files-from-raw` 与 `--max-delete 27` 精确执行。

两个无同名本地副本的旧文件 `Telysta_officialoutfit.psd`、`Telysta_officialoutfit_halfbody.psd` 已先下载备份，核对大小后删除远端副本。备份最终保存在 `C:\Users\weise\Desktop\TelystaImages\archive\R2_Source_Backup_2026-09-29\Telysta\`，不会被新的上传规则同步。其余本地 PSD 未改动。备份与操作日志不提交 Git。

## 验收

- R2 删除后全桶复查 PSD 数量为 0。上传八组原图／WebP 和三组迁移到归档目录的原图／WebP，共 22 个对象；这 22 个对象的 CDN 字节均与本地 SHA-256 相符。
- 封面上传后全桶共 322 个对象，PSD 为 0；既有 `telysta-images/archive/mhs_test_03.ai` 不属于本次指定删除的 PSD，予以保留。它已从公开清单排除，未来同步不会上传 AI。
- 独立列表封面增加三张、迁移一张，26 张当前封面全部通过发布脚本的 CDN SHA-256 核对。新资源仍使用小封面，高清图只在看图器打开后加载。
- 清单重新生成与 `--check` 一致，含 118 组图片、0 个工程源文件。新增回归覆盖大写 PNG／PSD、AI 排除、嵌套头像集合的前缀映射；实际调用上传脚本的本地隔离试验只复制 PNG／WebP，PSD、AI、文本和嵌套头像均被过滤。
- 首次封面上传被 `--immutable` 的时间戳比较阻止；加入 `--checksum` 后完成比对与发布，没有关闭不可变对象保护。
- 浏览器回归发现：旧版 Telysta 移入归档后，创作理念文章仍引用旧 URL，清单无法提供图片尺寸。同步更新两处文章图片地址，恢复图片下载前的高度预留；旧远端对象仍保留，外部历史链接可继续访问。
- `npm run check` 通过：类型检查无错误／警告，111 项单元测试通过；修正文章引用后再次生产构建成功。本地构建包含作者同时编辑中的文章，本次提交仅包含资源更新及相关图片引用。
- 13 项相关浏览器测试全部通过，覆盖 390／1440 px 新资源封面、八张图库图像、对应原图下载、旧资源、键盘焦点、减少动态效果和加载稳定性；已检查两种宽度的资源页截图。
