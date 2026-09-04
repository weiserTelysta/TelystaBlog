---
title: 阶段更新：采用Cloudflare对象存储作为必要资源分发系统
description: 技术更新，我们的博客页面采用了Cloudflare作为内容分发的工具，可以大幅度提升体验，并且可以支持后续的大型文件下载了。
publishedAt: 2026-8-30
updatedAt: 2026-8-30
category: manuscript
tags:
  - Cloudflare
  - Blog
draft: false
series: weiser-blog-construction-records
seriesOrder: 2
---
## 进度介绍
目前，由于Github仓库有一定的容量限制，而同时我们的网站希望能够将一些必要的资源快速且高效的分发。在权衡利弊之后，我选择使用Cloudflare R2对象存储作为必要资源的承载方式。

正好，今天新图到了，可以顺便展示一下我们所实现的成果：

![Telysta 角色立绘](https://assets.telysta.com/telysta-images/Telysta/telysta_crinoline_character_illustration.webp)

这样一来，所有资源上Cloudflare之后，访问速度能有普遍性的提升，同时我们的代码仓库的压力也能够有相当程度的减轻。在很长的一段时间之内，不必再担心“爆仓”的问题了。虽然从某种意义上讲，这个问题本身就是我们一开始的架构不太好以及我们想要分享的资源过大导致的。
## 细枝末节
碎碎念啊，碎碎念，有一些小地方值得记录一下，防止以后自己都忘了。
### 存储内容
目前首先需要的，是将一些值得分享的图片释放出来，主要是Png类以及Psd类，正是其带来的压力。因此才会有我们这次改进。为了方便展示，我已经提前对其做了必要的压缩，同时采用了Webp格式进行分发。

但是，我们网站的一些Icon之类的资源，还未完成上Cloudflare化，当然，我也是有些犹豫，这些是否有必要。使用Github Page构建，其所占的大小也不大。
### 同步工具
超过300MB大小的文件已经无法从Cloudfalre网页端进行同步，必须通过密钥系统自行上传。

目前我所采用的技术是rclone，一个对本地文件和云存储进行管理的工具，主要是通过命令执行，没用图形化工具主要是cyberduck太丑了，比起丑陋的简单，我可能更加愿意选择优雅吧。当然，用脚本肯定是又快又好了。

#### 同步脚本：
```powershell
$source = "C:\Users\weise\Desktop\TelystaImages"
$remote = "r2:telysta-blog-assets/telysta-images"

rclone copy $source $remote `
    --transfers 8 `
    --checkers 16 `
    --exclude "upload_cloudflare.ps1" `
    --progress

if ($LASTEXITCODE -ne 0) {
    Write-Error "R2 上传失败"
    exit 1
}

Write-Host "R2 同步完成"
```
#### rclone的常见命令
**复制/增量上传**：
```
rclone copy local remote
```

**移动文件**：
```
rclone move resource target
```

**远端同步**：
```
rclone sync local remote
```
这个命令主要是让远端变得和本地完全一样。

**查看文件**：
```
rclone ls r2:telysta-blog-assets/telysta-images
```

**查看文件总数以及容量**：
```
rclone size r2:telysta-blog-assets/telysta-images
```

**删除文件**：
```
rclone delete ...
```
### 域名解析
对于容器，是可以借用cloudflare进行直接的解析的，目前我采用多个解析是`assets.telysta.com`。刚好域名快到期了，顺手续费了5年的额度。

目前来看，一切运行的都挺好，只是内容写作实在是太麻烦太累了，而且总是觉得没什么可以写的，生活里面的压力和琐事还有诱惑也好多，唉┑(￣Д ￣)┍。
