# Cloudflare R2 与 CDN 资源维护

本指南维护图片素材；画廊入口已改为 `/gallery/`。电子书原文件位于独立 bucket `telysta-library` 的 `books/` 前缀，书目与盘点见 [书室指南](library.md)，网页字段与下载响应头见 [电子书指南](ebooks.md)，不经过本指南的图片压缩／清单流程。

插画原图与 WebP、Character 图片和首页轮换头像存放在 Cloudflare R2 bucket `telysta-blog-assets`，并通过自定义域名 `https://assets.telysta.com` 分发。当前对象前缀为 `telysta-images/`、`characters/`、`avatars/`、文章配图 `blog_imgs/` 和独立列表封面的 `covers/`。自 2026-09-29 起，批量上传允许列表为 PNG／JPG／JPEG／WebP；正文专用 SVG 只按下文的逐文件审查流程上传。PSD 已清理，PSD／AI 不再上传。历史对象 `telysta-images/archive/mhs_test_03.ai` 未在本次 PSD 删除范围内，仍保留远端，但不登记在清单。见 [执行记录](archive/2026-09/r2-resource-update-2026-09-29.md)。仓库不提交 R2 凭据。

2026-10-04 角色现行素材改用 Mirelle 路径，旧 Serava／Sylvaena 对象保留兼容已发布引用；日常维护使用新路径，见 [更名记录](mirelle-rename-2026-10-04.md)。

## 为什么使用清单键

清单生成器现在为原图也记录经过 EXIF 方向校正的宽高。文章直接引用清单中的 JPEG／PNG 原图地址时，可以在下载前预留正确比例；旧清单缺少原图尺寸时需重新生成对应条目，不会借用可能经过裁切的 cover／display 比例，也不会在构建时请求 R2 猜测尺寸。

文章构建缓存包含图片清单摘要；清单变化后会重新渲染文章，无需修改 Markdown 来触发尺寸更新。

资源 Markdown 使用：

```yaml
image: asset:Alice/alice_illustration
gallery:
  - src: asset:Alice/alice_illustration
```

`asset:` 后面的内容对应 `src/generated/cdn-assets.json` 中的键。页面会自动选择同组 `.webp` 显示，并把 PNG/JPG 原图加入下载列表。PSD／AI 不上传，也不登记到公开清单；运行时继续保留工程文件下载拦截。这样以后更换对象存储只需修改清单 origin 或 URL 解析层。

不要把 Cloudflare 控制台地址写进内容。控制台地址只用于管理，不是访客可访问的资源 URL。

## 素材目录约定

作者掌控的外部素材目录是主数据源，建议保持：

```txt
TelystaImages/
  Alice/
    alice_illustration.png
    alice_illustration.webp
    alice_illustration.psd

TelystaAssets/
  characters/
    sky.png
    sky.cover.webp
    sky.preview.webp
  avatars/
    Profile_Weiser.png
    Profile_Weiser.avatar.webp
```

- PNG/JPG/JPEG：访客下载的原图。
- 同名 WebP：页面展示图。
- 同名 PSD／AI：仅作为本地源文件保存，不上传公开 R2、不进入资源清单或下载列表。
- 文件名一旦公开尽量保持稳定；内容发生明显变化时优先使用新文件名，避免 CDN 缓存旧内容。

脚本、密码、rclone 配置、临时文件和访问令牌不得放入素材目录或上传 R2。

## 与博客正文强相关的配图

正文专用参考图、示意图和符号使用 `blog_imgs/<固定文章目录>/`，**每篇一个目录**，不要直接堆放到 `blog_imgs/` 根目录，也不要混入画廊插画、电子书封面或头像目录。新文章建议用固定路由 ID `WEISER<12 位 UUID>` 作为目录名；已有明确目录的文章沿用原路径，标题和本地文件名变化不触发 R2 改名。

本次 Skeb 文沿用已建立的目录：

```text
telysta-blog-assets/
  blog_imgs/
    weiser-hoja-skeb-2026-11-15/
      elden-ring-snow-witch-hat-reference-2026-11-15.webp
      weiser-ear-ornament-reference-2026-11-15.webp
      weiser-hand-ornament-reference-2026-11-15.webp
      elf-ear-cuff-reference-01-2026-11-15.webp
      elf-ear-cuff-reference-02-2026-11-15.webp
      weiser-body-chain-reference-2026-11-15.webp
      layered-necklace-reference-2026-11-15.webp
      annals-floral-emblem-white-2026-11-15.svg
      flower-of-life-six-petals-white-2026-11-15.svg
```

对应索引为 [data/blog-assets/WEISERa234f883ebff.json](../data/blog-assets/WEISERa234f883ebff.json)，记录文章路径、固定 ID、bucket、目录、原文件名与正式文件名的对应、尺寸、字节数和 SHA-256。这个 JSON 是维护入口，不包含凭据，不把本地绝对路径写进去。以后补图修改同一索引，不另起一个相似目录。

处理顺序：

1. 保留本地 PNG／JPEG／原色 SVG，生成有语义的 WebP／白色 SVG 副本。临时名 `image-3.png`、随机截图名不得直接成为公开对象名。新增版本使用新文件名，保留已发表引用所需的旧对象。
2. WebP 沿用展示档位，不放大、不拉伸；已经压缩过的 JPEG 若转为 quality 95 后反而变大，可单独比较较低质量的副本并记录选定质量。本次项链参考图采用 quality 90，其余 WebP 为 95。
3. SVG 保留透明背景，只修改明确的描边／填充颜色。检查不含脚本、事件处理器、`foreignObject` 或外部资源引用；允许图内的 `href="#petal"`。通过单独的明确文件名单上传为 `image/svg+xml`，**不放宽通用批量上传的格式白名单**。
4. 只向上述文章目录上传索引中的文件，不上传 Markdown、备份、原稿、临时预览或目录里的所有内容。上传新对象后再检查公开 URL；提前请求不存在的 URL 可能缓存 404，如发生则只清理这些确切 URL 的缓存。
5. 下载公开 URL，核对 MIME、字节数和 SHA-256，再更新文章引用和共享 CDN 清单。上传素材与发布文章是两件事；作者要求先审阅时保持 `draft: true`，不提交部署文章。

`assets:manifest` 会自动合并 `data/blog-assets/*.json`，因此重建不会丢失正文配图尺寸；公开的 `cdn-assets.json` 只收录展示路径、格式、尺寸和体积，不复制维护索引中的原稿名与校验信息。正文可使用完整 CDN URL；构建会按清单预留图片比例。小型 SVG 可显式设置等比例的 `width`／`height`，避免占满整页。

跨文章复用的已有角色设定图继续引用 `telysta-images/Weiser/` 等原位置，不为每篇文章复制一份。不自动移动或删除历史的平铺配图，以免破坏已发布文章。

博客正文中的图片，以及指向 WebP／PNG／JPEG／SVG 等图片文件的普通正文链接，正常点击会在当前页面打开图片查看器，支持缩放、Escape 关闭并返回原触发位置。慢加载的图片会先在原页等待加载，不跳走；明确标记为下载、打开新窗口或 `data-no-lightbox` 的作者链接保留原行为。Ctrl／Command 等修饰键点击继续使用浏览器的原图打开方式。直接从站外打开 CDN URL 仍是查看原始图片文件，不会进入博客的查看器。

## 日常发布顺序

以下示例使用 Windows 路径；也可以设置环境变量 `TELYSTA_ASSET_SOURCE`，省略前两个命令的 `--source` 参数。

```powershell
npm run assets:prepare -- --source "C:\Users\weise\Desktop\TelystaImages"
npm run assets:manifest -- --source "C:\Users\weise\Desktop\TelystaImages" --collection "characters=C:\Users\weise\Desktop\TelystaImages\TelystaAssets\characters" --collection "avatars=C:\Users\weise\Desktop\TelystaImages\TelystaAssets\avatars"
npm run assets:sync -- -Source "C:\Users\weise\Desktop\TelystaImages"
npm run assets:sync -- -Source "C:\Users\weise\Desktop\TelystaImages" -Apply
npm run check
```

1. `assets:prepare` 增量生成同名 WebP。
2. `assets:manifest` 更新并校验仓库内的公开清单。
3. 第一次 `assets:sync` 是 rclone 预演，不写入 R2。
4. 核对预演后追加 `-Apply`，只复制新增或变化的文件。
5. `npm run check` 验证内容、类型、测试和生产构建。
6. 确认 CDN 文件已经可访问后，再提交并推送网站代码。

上传脚本使用 `rclone copy`，不会删除 R2 上已有对象。它只允许 PNG／JPG／JPEG／WebP，忽略扩展名大小写，并排除嵌套的 `TelystaAssets`；Character 和头像需要以各自目录作为 `-Source`、各自 R2 前缀作为 `-Remote` 单独同步。清单生成器也排除嵌套集合，避免重复登记。需要删除对象时，先核对准确名单并预演，再单独执行，不要把日常上传改成 `rclone sync`。

重新生成同名 WebP 后不需要先手工删除远端文件：`rclone copy` 会上传发生变化的文件并覆盖同名对象。只有资源改名或正式下线后留下的远端孤儿对象才需要清理；删除前必须确认 `src/generated/cdn-assets.json`、文章和页面配置均已不再引用该对象。

## WebP 质量与增量规则

CDN 展示图参数为：

- 最长边 3200 像素，不放大小图。
- WebP quality 95。
- alphaQuality 100。
- effort 6，并启用 smartSubsample 与 smartDeblock。

Character 与头像使用专用档位：cover quality 94、preview quality 96、avatar quality 95。通过 `--profile display|character|avatar` 选择；生成参数发生变化时只在主动运行素材命令后重建，不会拖慢网站构建。

缓存记录位于 `.tmp/cdn-image-manifest.json`。第一次遇到已经存在的 WebP 时，脚本只记录原图和 WebP 指纹，不重新压缩，因此旧文件会保留原有尺寸；以后只有原图变化、WebP 缺失、目标指纹变化或生成参数升级时才按上述参数生成新文件。需要有意识地统一重建全部旧 WebP 时才使用 `--force`。

## 资源列表独立 Cover

公开资源列表优先使用清单的 `cover`；看图器仍使用 `display`，下载仍使用 `original`。无需修改资源 Markdown，常规 build 也不会重新压缩插画。当前档位为最长边 960px / WebP quality 92 / alphaQuality 100，不裁切、不放大小图；两款 Minecraft 像素图直接复用。

```powershell
npm run assets:covers -- --source "C:\Users\weise\Desktop\TelystaImages"
rclone copy .tmp/cdn-covers/files r2:telysta-blog-assets/covers --files-from .tmp/cdn-covers/upload.txt --immutable --checksum --metadata --metadata-set "cache-control=public, max-age=31536000, immutable" --dry-run
# 核对清单后执行上传（copy 不删除旧文件）
rclone copy .tmp/cdn-covers/files r2:telysta-blog-assets/covers --files-from .tmp/cdn-covers/upload.txt --immutable --checksum --metadata --metadata-set "cache-control=public, max-age=31536000, immutable" --transfers 4 --checkers 8
rclone check .tmp/cdn-covers/files r2:telysta-blog-assets/covers --files-from .tmp/cdn-covers/upload.txt --one-way
npm run assets:covers -- --publish
npm run check
npx playwright test
```

准备阶段仅写 `.tmp/cdn-covers/files`、上传列表和计划；不在桌面新建素材副本，不修改公开引用。`--publish` 在逐个下载 CDN 文件并验证哈希后，更新 `src/generated/cdn-covers.json` 和 `cdn-assets.json`，网络校验失败则不发布引用。图片本身不提交 Git。

主清单生成器默认合并独立 cover 索引，并读取本地来源校验 SHA-256。若替换原图导致拒绝沿用旧 cover，先以原有完整 `--source` / `--collection` 参数运行 `assets:manifest -- --without-covers ...`，再重新准备、上传、发布 cover；中间结果不要提交。新增资源按同一流程生成，未运行 cover 维护时仍可回退高清显示图。

`covers/` 使用内容哈希文件名，可长期缓存；上传加 `--checksum`，避免重新生成同一内容后仅因修改时间不同被 `--immutable` 拒绝。发布步骤仍逐字节验证 SHA-256。旧 `telysta-images/` 同名可覆盖对象不自动套用一年 immutable。旧 cover 保留供已部署网页使用，不自动删除。R2 元数据与 CDN 缓存响应分别检查。

## R2 与域名设置

- bucket：`telysta-blog-assets`
- 对象前缀：`telysta-images/`、`characters/`、`avatars/`、`covers/`
- 公开域名：`assets.telysta.com`
- rclone remote：`r2:`

rclone 令牌只需要该 bucket 的对象读写权限。当前令牌不能列出账户下所有 bucket 时，`rclone lsd r2:` 返回 403 并不代表目标 bucket 不可用；应直接检查：

```powershell
rclone lsf r2:telysta-blog-assets/telysta-images --max-depth 2
rclone lsf r2:telysta-blog-assets/characters --max-depth 1
rclone lsf r2:telysta-blog-assets/avatars --max-depth 1
```

普通 `<img>` 展示和下载链接不依赖 CORS。以后若使用前端 `fetch`、Canvas 读取像素或跨域编辑图片，再为 `https://telysta.com` 配置精确的 R2 CORS 规则。

## 哪些资源继续留在仓库

以下内容体积小、参与首屏或构建流程，继续本地保存更可靠：

- favicon、站点图标和内联社交 SVG。
- Logo、favicon 与站点图标。
- 字体和风琴页等关键 UI 装饰的 WebP。
- 文章旁边的专属正文图片。

首页随机轮换头像已经迁移至 `avatars/`；它们不属于站点 Logo。上述 UI 外壳资源没有必要为了“全部上云”而迁移。

## 常见故障

- `CDN asset ... has no display image`：该清单组只有原图/PSD，没有同名 WebP；先运行 `assets:prepare` 和 `assets:manifest`。
- `Unknown CDN asset`：Markdown 中的 `asset:` 键与清单不一致。
- 页面先部署、图片后上传：页面会短暂出现 404；始终先上传 R2，再推送网站。
- 替换同名对象后仍看到旧图：使用新文件名最稳妥；否则等待缓存到期或在 Cloudflare 清理对应 URL 缓存。
- `rclone lsd r2:` 返回 403：令牌可能只授权了指定 bucket，改为直接访问完整 remote 路径。
