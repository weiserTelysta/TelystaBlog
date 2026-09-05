# Cloudflare R2 与 CDN 资源维护

插画原图、PSD/AI、Character 资源和首页轮换头像存放在 Cloudflare R2 bucket `telysta-blog-assets`，并通过自定义域名 `https://assets.telysta.com` 分发。当前对象前缀为 `telysta-images/`、`characters/` 和 `avatars/`。仓库只提交公开资源清单，不提交 R2 凭据。

## 为什么使用清单键

资源 Markdown 使用：

```yaml
image: asset:Alice/alice_illustration
gallery:
  - src: asset:Alice/alice_illustration
```

`asset:` 后面的内容对应 `src/generated/cdn-assets.json` 中的键。页面会自动选择同组 `.webp` 显示，并把 PNG/JPG 原图加入下载列表。PSD 可以继续作为作者源文件保存在素材目录和 R2，但网站运行时会过滤 PSD，不向访客生成下载链接。这样以后即使更换对象存储，只需修改清单 origin 或 URL 解析层，不必批量重写文章。

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
- 同名 PSD：仅作为作者源文件保存，不进入公开下载列表。
- AI 等其他源文件是否公开必须逐项确认授权；不要把 PSD 作为 `actions` 下载项重新暴露。
- 文件名一旦公开尽量保持稳定；内容发生明显变化时优先使用新文件名，避免 CDN 缓存旧内容。

脚本、密码、rclone 配置、临时文件和访问令牌不得放入素材目录或上传 R2。

## 日常发布顺序

以下示例使用 Windows 路径；也可以设置环境变量 `TELYSTA_ASSET_SOURCE`，省略前两个命令的 `--source` 参数。

```powershell
npm run assets:prepare -- --source "C:\Users\weise\Desktop\TelystaImages"
npm run assets:manifest -- --source "C:\Users\weise\Desktop\TelystaImages" --collection "characters=C:\Users\weise\Desktop\TelystaAssets\characters" --collection "avatars=C:\Users\weise\Desktop\TelystaAssets\avatars"
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

上传脚本使用 `rclone copy`，不会删除 R2 上已有对象，并排除 PowerShell、BAT、CMD 和常见系统文件。需要删除远端对象时，应先用 `rclone lsf` 核对精确路径，再单独执行删除，不要把日常上传改成 `rclone sync`。

重新生成同名 WebP 后不需要先手工删除远端文件：`rclone copy` 会上传发生变化的文件并覆盖同名对象。只有资源改名或正式下线后留下的远端孤儿对象才需要清理；删除前必须确认 `src/generated/cdn-assets.json`、文章和页面配置均已不再引用该对象。

## WebP 质量与增量规则

CDN 展示图参数为：

- 最长边 3200 像素，不放大小图。
- WebP quality 95。
- alphaQuality 100。
- effort 6，并启用 smartSubsample 与 smartDeblock。

Character 与头像使用专用档位：cover quality 94、preview quality 96、avatar quality 95。通过 `--profile display|character|avatar` 选择；生成参数发生变化时只在主动运行素材命令后重建，不会拖慢网站构建。

缓存记录位于 `.tmp/cdn-image-manifest.json`。第一次遇到已经存在的 WebP 时，脚本只记录原图和 WebP 指纹，不重新压缩，因此旧文件会保留原有尺寸；以后只有原图变化、WebP 缺失、目标指纹变化或生成参数升级时才按上述参数生成新文件。需要有意识地统一重建全部旧 WebP 时才使用 `--force`。

## R2 与域名设置

- bucket：`telysta-blog-assets`
- 对象前缀：`telysta-images/`、`characters/`、`avatars/`
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
