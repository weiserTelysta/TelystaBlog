# 分类虹彩、资源发布与英文元数据

日期：2026-09-21。承接 [上一阶段](category-series-scores-2026-09-20.md)；本记录覆盖最终样式和本轮发布核验，多语言仅作调研。

## 计划与完成范围

1. Series 保持现有留白布局，分组标题仅保留 Manuscript、Reading、Portrait、Notes 等分类名；Category 选中状态仍使用英文所属名称，角色卡片保留花体姓名。
2. 缩小分类卡片高光面积、降低强度，以角色配色组织虹彩；前后台继续共用样式，保留八种纹理、键盘反馈和减少动态。
3. 将 Telysta 中亚风格插画加入资源页，准备独立封面和高清 WebP，保留原始 JPEG 下载，核对 R2/CDN 实际文件。
4. 扫描博客空缺元数据，补齐英文标题／摘要和空中文摘要，保留作者正文；核对文档、回归测试与生产构建后提交推送。
5. 调研单 Markdown 中／英／日展示，记录方案与风险，不实现语言路由或翻译接口。

以上实现与调研均已完成；部署状态单独记录于文末。

## 实现与维护入口

- `src/pages/series/index.astro` 复用分类题签的 `name`，不再拼接人物前缀；没有另建分类名称表。
- `src/styles/category-foil.css` 保留细纹、彩色干涉带、表面反射三部分，减小高光带与遮罩范围；混合改为 screen，降低 hover／选中透明度及图片提亮。既有 `tone` 决定角色配色，`foil` 决定纹理与方向，后台预览同步设置 `data-tone`。
- Weiser 使用金／蓝／淡紫，Telysta 使用红玉／紫／金，Rhaelysa 使用红／金／紫，Alice 使用蓝／紫／金，Sylvaena 使用鼠尾草绿／香槟／淡紫。没有定时动画、外部纹理或新增服务依赖。
- 新资源文件：`src/content/resources/illustration/telysta/telysta_central_asian_attire.md`，资源页展示「Telysta · 中亚风格服饰」，署名武郡王。沿用现有看图和下载窗口，不另造一套资源详情页面。
- 补齐 LAMY 2000、Telysta 中亚服饰、Rhaelysa 创作理念三篇文章的 `titleEn`、`description`、`descriptionEn`。英文元数据用于目录和介绍，不表示中文正文已经翻译。

## R2 文件核验

| 用途 | 文件 | 字节 |
| --- | --- | ---: |
| 原图下载 | `telysta-images/Telysta/Telysta_Central-Asia_clouth_half_body.jpeg` | 2,887,269 |
| 高清展示 | 同目录同名 `.webp`，最长边 3200、质量 95 | 2,022,718 |
| 列表封面 | `covers/Telysta/Telysta_Central-Asia_clouth_half_body.f82e05a2da11b1961d5e2ecb2c2f1d08c35aa6d7dc2643951e89ab35577ace0a.webp`，743×960、质量 92 | 267,684 |

- 原图已在 R2；本次仅上传新的高清 WebP 和内容哈希封面，不覆盖其他图片。封面为 `public,max-age=31536000,immutable`。
- 原图、展示图和封面的 CDN 响应字节均与本地 SHA-256 相符；发布脚本核对全部 23 张独立封面后才写入清单。像素图仍保留原格式规则。
- 只合并新资产条目，避免仅扫描 Telysta 子目录时丢掉其他角色／头像清单。源码不包含 R2 凭据；后台自动上传 R2 仍未实现。
- 分类卡片使用 Astro 构建生成的响应式 WebP，与上述 R2 资源是两条管线；不能把 Cloudflare 缓存称为实时图片变换，详见上一阶段核查。

## 检查与边界

- 最终 `npm run check`：103 项单元测试通过，86 个内容文档零错误／警告，Astro 类型检查零错误／警告，三份简谱缓存有效，30 个页面构建完成。
- 当前 Windows 的原生 Satteri 受 Application Control 限制，本机使用已安装的官方 WASI 后端验证；没有修改安全策略或 CI 工作流。Linux 的实际检查由 GitHub Actions 确认。
- 浏览器首轮 41 项中 38 项通过：旧测试硬编码四张文章图，而作者已增加到五张；新增资源测试未等待下载弹窗收起就发送第二次 Esc。修正为检查所有现有图片、逐层等待关闭并验证焦点恢复，不改正文或绕过交互断言。
- 公开页面 41 项场景均已通过：修正后全量运行通过 40 项，余下一项暴露图片 HTML 缓存问题；修复缓存后重跑全部相关 10 项（加载稳定性、Series、分类、歌谱）通过。后台六项回归通过。没有仅凭自动重试忽略失败。
- 深入检查第五张图发现真实缺口：原图 JPEG 不在尺寸补全索引中。清单生成器现读取原图自身的显示尺寸（含 EXIF 方向），文章处理器同时识别 original／display／cover；补充新图元数据，不修改作者 URL，也不使用可能经过裁切的展示图尺寸推算原图。旧清单没有尺寸的原图仍不猜测，需要重新生成相应条目。
- `postLoader` 将图片清单纳入文章 digest，修复「只更新清单、正文不变时仍复用旧 HTML」的问题。本机保留已有缓存完成构建，两篇原有 JPEG 引用均输出 2216×2862 的尺寸，阻断图片请求时仍能预留布局；无需作者改正文或手动清缓存。
- Series 分组对尚未配置角色展示的新增分类回退到稳定 ID，避免读取空角色配置阻断构建。
- 增加原图比例与旧清单兼容回归。安全审计发现 [devalue 畸形输入问题](https://github.com/sveltejs/devalue/security/advisories/GHSA-9rgm-9g3h-6x36)，仅定点更新锁文件中 `devalue` 5.8.1 → 5.9.4；完整依赖审计恢复零漏洞，随后重新执行完整检查。
- 桌面／手机截图已人工检查，保留低曝光的角色虹彩、无横线 Series 分组与图片原比例。截图和临时验证脚本留在被忽略的 `.tmp`。
- 多语言方案见 [专项研判](multilingual-markdown-assessment-2026-09-21.md)：优先单文件完整语言块、构建生成可分享语言 URL；也可只写中文并主动生成译文缓存。当前没有上线语言切换或翻译服务。

## 发布记录

- 代码与内容提交 `2fddbd6` 已推送至 `main`。[GitHub Actions 35543890654](https://github.com/weiserTelysta/TelystaBlog/actions/runs/35543890654) 的 Linux `build` 与 Pages `deploy` 均为 success，验证了实际部署环境。
- 部署后直接请求 `https://telysta.com`（未加缓存绕过参数）：Series 的 Manuscript／Reading／Portrait／Notes 题签正确；资源页包含新插画与对应内容哈希封面；两篇 Telysta 文章均输出原图 2216×2862 尺寸；Rhaelysa 新文与日志 02／03 正常返回，两份简谱已渲染。
- 博客引用的两份线上样式表均正常返回，包含 Telysta 与 Sylvaena 的角色配色规则。原图、展示图、封面的 CDN 字节核验见上文。
- 本次提交不包含线上后台或多语言功能。日志 02 的旧点号 URL 仍未重定向；此项延续作者的文件重命名，旧链接／按路径关联的评论需按实际使用情况处理。
