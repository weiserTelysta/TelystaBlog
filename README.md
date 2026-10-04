# Weiser's Melancholy

[访问网站](https://telysta.com) · Weiser 的个人主页、博客与原创角色资源库。使用 Astro、React、SCSS 和 Markdown，构建后通过 GitHub Pages 发布，图片由 Cloudflare R2 分发。

## 启动网站与本地后台

首次使用需要 Node.js 22.12 或更新版本，在仓库根目录运行 `npm ci` 安装依赖。

| 要做什么 | 命令 | 打开地址 |
| --- | --- | --- |
| 修改文章、头像、问候语、分类、系列与联系方式 | `npm run admin` | http://127.0.0.1:4323/ |
| 查看网站效果 | `npm run dev` | http://localhost:4321/（以终端输出为准） |
| 查看正式构建 | `npm run check`，再 `npm run preview` | 以终端输出为准 |

后台和网站预览使用两个终端分别启动，按 Ctrl+C 停止。后台地址必须使用 **127.0.0.1**，不要改为 localhost；它只在本机运行，没有 telysta.com 上的在线管理入口。后台保存只写本地文件，不会自动 push 或上传 R2。

**[本地后台完整使用说明](docs/local-admin.md)**：新增文章／身份／系列、图片上传、保存冲突、端口设置和功能限制。

## 按任务查找

| 任务 | 直接入口 |
| --- | --- |
| 用后台编辑网站 | [后台使用说明](docs/local-admin.md) |
| 手写 Markdown、草稿、日期、系列、图片 | [文章写作](docs/article-authoring.md) |
| 用 `[[Mirelle]]` 等别名关联文章 | [WikiLink](docs/wikilinks-2026-09-21.md) |
| 修改站点文案、Hero、头像、导航与角色卡片 | [配置文件地图](src/config/README.md) |
| 编辑 About | [About Markdown](src/pages/about.md) |
| 新增资源下载条目 | [资源维护](docs/resources.md) · [字段说明](docs/resource-content-guide.md) |
| 转 WebP、上传原图和封面到 R2 | [CDN 操作流程](docs/cdn-assets.md) |
| 测试、排错和代码维护 | [维护指南](docs/maintenance.md) |
| 提交、推送和核对线上发布 | [部署指南](docs/deployment.md) |
| 查询现有功能与边界 | [功能与配置](docs/feature-map.md) |
| 查看近期变更、待办与历史 | [当前状态](docs/current-status.md) · [阶段日志](docs/stage-log.md) · [文档索引](docs/README.md) |

## 常用操作

```sh
npm run post:new       # 按提示创建草稿
npm run content:check  # 检查内容和跨文件引用
npm run check          # 类型、单元测试、内容和生产构建
npm run test:browser   # 页面交互／移动布局回归
npm run test:admin     # 本地后台回归
```

公开前检查 draft、图片地址和预览效果。代码推送至 main 后，GitHub Actions 检查通过才会部署；[查看部署结果](https://github.com/weiserTelysta/TelystaBlog/actions/workflows/deploy.yml)。R2 素材须提前上传，Git push 不会代替素材发布。

## 文件放在哪里

| 路径 | 用途 |
| --- | --- |
| src/config/ | 站点、首页、分类、系列、角色与资源配置 |
| src/content/weiser-posts/ | 博客 Markdown |
| src/pages/about.md | About 正文 |
| src/content/resources/ | 资源条目，原图不放这里 |
| src/content/scores/ | 简谱源文件；改后运行 `npm run score:render -- <id>` |
| src/generated/ | 提交到 Git 的 CDN 清单和生成乐谱 |
| src/assets/、public/ | 本地图标、字体、文章图片和后台上传图片 |
| scripts/admin/ | 本地后台；不随静态站点发布 |
| docs/ | 当前操作指南与开发记录；archive/ 保存历史 |

不要直接编辑 dist/；.tmp/ 是不提交的缓存、日志和临时文件。资源原图与 WebP 由 R2 提供，PSD／AI 只保留本地，不上传。

网站保留安静、深色、低饱和的阅读氛围。涉及布局、字体或动效时遵循项目内 [Telysta Design Guardian](.agents/skills/telysta-design-guardian/SKILL.md)，普通 Markdown 编辑不需要重新设计界面。
