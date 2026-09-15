# 当前功能与配置核对

核对日期：2026-09-15。依据当前工作区的配置、组件、内容加载器、维护脚本与部署工作流；不等同于这些未提交修改已经在线上部署。本文描述已实现能力；本地后台见 [使用说明](local-admin.md)，阶段进度及后续增强见 [实施计划](admin-plan-2026-09-13.md)。

## 身份、首页与文案

| 功能 | 当前行为 | 真实入口 |
| --- | --- | --- |
| 站点名称与描述 | 默认页面标题、SEO 介绍与首页描述；页面可以提供自身标题和描述 | `src/config/site.ts`、`src/config/pages/*.ts`、`src/layouts/Layout.astro` |
| 分享图 | 固定默认 Weiser 图，文章可提供封面；静态输出分享元信息，不随访客头像或隐藏标题变化 | `site.ts` 的 `shareImage`、`ShareMetadata.astro`、`src/lib/shareMetadata.ts` |
| 页脚 | 只有可选 `icpRecord` 文本，当前未设置所以不显示；尚无通用版权／多链接页脚编辑模型 | `site.ts`、`src/components/site/SiteFooter.astro` |
| 首页 Hero 欢迎语 | 当前 13 条；按访客本地小时、`dayAffinity` 和 `weight` 加权抽取；短句逐字、长句／多行淡入，减少动态时直接显示 | `pages/homeGreetings.ts`、`src/lib/homeGreeting.ts`、`HomeIntro.tsx` |
| 标签页离开祝福 | 当前 9 条多语言字符串；每次页面转为隐藏时随机一次，回来恢复页面原标题，不是后台定时轮播 | `src/config/tabGreetings.ts`、`src/components/site/TabIdentity.astro` |
| 头像方案 | 当前 7 套；字段含稳定 ID、角色名、头像、alt、tone、权重、启用状态。默认项是数组第一项 | `pages/homeProfiles.ts` 的 `HOME_PROFILES` / `DEFAULT_HOME_PROFILE` |
| 访问身份与 favicon | 同一标签页会话保留角色，首页头像与动态 favicon 共用选择；存储失效时退回页面内存。不是每次刷新重新抽头像 | `src/lib/homeProfile.ts`、`HomeIntro.tsx`、`TabIdentity.astro` |
| 图标准备 | 既有头像由 R2 提供，后台新增头像保存在本地 `public/media`；每套对应的 32／48px favicon 本地生成并提交，运行时加载 48px；Apple 图标保持固定 | `scripts/prepare-favicons.ts`、`scripts/admin/catalog.ts`、`public/favicons/`、`Layout.astro` |
| 首页介绍与区块 | 介绍段落、资源路标、排序与启用；现有区块类型为 `profile` / `resources` | `src/config/pages/home.ts`、`HomeArchive.astro` |
| 导航与社交 | 顶部导航独立于首页社交链接；社交图标是固定类型集合，不是任意上传图标 | `site.ts` 的 `navItems`、`home.ts` 的 `HOME_SOCIAL_LINKS`、`SocialIcon.astro` |
| QQ／微信二维码 | `imageSrc` 使用源码资源地址、`/media/` 本地地址或 R2 HTTPS 地址；后台支持选择与上传无损 WebP，保存前核对本地引用存在 | `home.ts` 的 `HOME_QR_CONTACTS`、`HomeSocialNav.astro` |

Hero 句子没有语言字段，也没有精确的“几点到几点”开关，`mood` 只是可选标注；标签页祝福只是字符串数组，没有 ID、语言标签、权重或时段结构。此前计划中的语言／时段筛选属于待设计的后台能力，不能当作现有字段。头像与 Hero 句子独立抽取，角色没有绑定专属句库。

头像 ID 还关联 `/favicons/<id>-48.png` 和会话存储，改显示名不等于改 ID；后台新增头像会生成本地 WebP 与 32/48px 图标，也可沿用手工维护的 R2 流程。禁用全部头像时网站逻辑仍回退默认项，本地后台已阻止关闭全部有效方案或清空句库。

## 博客与阅读

| 功能 | 当前行为与配置 |
| --- | --- |
| 分类 | 正式 ID 为 `manuscript`、`collection`、`letters`、`reading`、`life`、`portraits`、`notes`；当前工作区已取消 `essays`，没有别名或重定向 |
| 分类入口 | 总览 `Category / All Records`；选中后是 `Weiser's Manuscript`、`Telysta's Collection` 等英文所属名称 |
| 角色卡片 | 收起时花体角色名＋英文分类小字；展开后中文标题与介绍。题签在 `visuals/categoryVisuals.ts`，中文栏目在 `content/blogCategories.ts` |
| 卡片比例 | `.category-accordion__card` 当前 CSS 宽:高为 **2:5**，不是 1:2。图片以 cover 裁切，可设置 `imagePosition` 与 `imageScale`；原图比例、卡片框比例、头像 1:1 是不同概念 |
| 文章创建 | 日期文件名＋正文可自动补标题、日期、摘要和分类；英文空字段回退中文。直接新建 Markdown 默认公开，`post:new` 默认草稿 |
| 系列 | 配置系列 ID、所属分类与文案；文章填写配对的 `series` / `seriesOrder`。目录与前后章按公开文章排序自动生成 |
| 导航与目录 | `Series / All Series` 与分类入口对齐；文章底部三等分前后章／系列目录，缺失目标禁用，无系列全禁用；正文 H2–H4 目录是另一个功能 |
| 搜索 | 构建静态索引，页面按需加载，搜全部公开文章；包含正文及元数据，不是语义／拼音搜索 |
| Markdown | 支持数学公式、代码复制、本地／CDN 图片、简谱引用；简谱排版是主动维护命令，普通构建只检查是否过期 |
| 评论 | 仅文章路由加载 Giscus，使用 pathname 映射；移动已有文章路径会影响链接与评论关联 |

已有独立 `npm run admin` 本地写作和配置后台，默认 `127.0.0.1:4323`；支持原始 Markdown、草稿创建、14 个配置入口、素材选择、源码对照、冲突校验与只读历史。没有站内英文路由切换器、在线写作后台、GitHub 登录管理入口、后台恢复按钮或自动 R2 上传。英文元数据存在并可参与搜索，不代表已有双语站点。

## 资源与发布

R2 是文件存储与分发层，`src/generated/cdn-assets.json` 是资源地址／尺寸索引，`src/content/resources` 才是作者维护的作品条目。三者不能互相代替：R2 有文件不等于资源页应公开，选择已有图片不等于必须把图片再次上传到仓库。

- 当前画廊展示公开插画及明确收录的两款 Minecraft 皮肤；不自动纳入 Character、头像、文章配图或草稿。
- 列表优先独立 cover，看图使用高清 display，下载选择仅保留允许的图片格式。Schema 能记录其他动作，不代表当前看图器渲染全部动作、Credits、许可证和正文。
- 看图箭头在图片两侧中部，下载／关闭在图片底部右侧；旧版“四按钮集中底部”的记录已归档。
- PSD 不产生网站下载链接，但公开 bucket 中的对象仍可能通过已知 URL 访问；UI 隐藏不构成访问控制。
- R2 准备、cover、上传与 favicon 生成由维护命令主动运行；`assets:sync` 实际用 `rclone copy`，默认预演，不做远端删除。普通部署不执行 R2 上传。
- `.github/workflows/deploy.yml` 在 `main` push／手动触发后执行 `npm run check` 再发布 Pages；当前无 PR 检查／预览工作流。浏览器测试是独立命令，不在该部署检查中自动执行。

## 确认存在的维护缺口

- 本地后台为登记过的字段增加保存校验，但尚无覆盖全仓所有配置业务约束的统一运行时 schema；手动改源码仍需完整检查。
- `featuredImages` 测试检查重复与公开范围，但没有完整交叉验证每个配置键确实匹配真实资源条目。
- 分享图浏览器测试已读取 `SITE_CONFIG`；静态声明、绝对地址与文章封面规则继续由已有测试保护。
- 当前草稿过滤只控制页面输出，不改变公开 Git 仓库的可见性。
- 旧文档中的测试数、传输量和清理失败是当时记录，不用于推断今天的线上缓存、测试通过状态或文件系统权限。

本地后台已增加文章元数据表单、隔离草稿预览，以及头像配套创建、分类角色联动新增、系列新增和八种共享光泽。成组保存会核对版本并处理普通写入失败，仍不是数据库事务。尚未提供文件删除／重命名、已有图片替换、全站素材引用反查或 R2 自动上传。当前范围与后续顺序见 [最新计划](admin-ux-plan-2026-09-15.md)。
