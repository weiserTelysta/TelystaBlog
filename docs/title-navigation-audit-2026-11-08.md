# 标题与页面跳转排查

排查开始：2026-11-08；规则与字体方案更新：2026-11-13。依据生产站 `https://telysta.com` 的 HTTP／Chromium 请求记录及本地代码，初始版本为 `3ea4538`。保持现有字形、版式与目录原位淡入行为，原字体库完整保留。

## 标题不一致

《拜占庭的赠礼》frontmatter 的 `title` 为 `《拜占庭的赠礼》阅读笔记`，生产正文的 H1 原为 `拜占庭的赠礼`。本地 H1 已改为 `拜占庭的赠礼阅读笔记`，但这行改动尚未提交。原系统按正文 H1 显示，因此线上仍使用旧正文标题。

11 月 8 日曾将需求误解为 frontmatter 优先并发布 `af0846f`；11 月 9 日作者明确要求 **正文 H1 优先**。最终规则恢复为正文 H1 → `title` → 去日期文件名，覆盖列表、文章、系列、搜索、分享／结构化数据及后台，并发布本地 H1 更新。文章页直接使用统一解析结果，正文 H1 渲染时移除，页头只显示一次；递增内容渲染版本避免复用旧缓存。其他正文改动不因修复标题而被覆盖。

## 导航与加载

确认存在的额外请求：导航配置使用 `/blog`，首页资源入口使用 `/resources`，分类“全部”链接使用 `/blog`。生产服务器先返回 301，再请求带尾斜杠的 HTML。已统一为 `/blog/`、`/resources/`；文章、系列和分类详情原有链接已经使用尾斜杠。

站点使用 Astro 静态多页输出，点击链接发起普通文档请求，没有 SPA 路由拦截、跳转前 API、运行时 Markdown 转换或资源清单查询。博客正文与资源列表 HTML 不依赖 React 下载完成才出现；交互模块随后初始化。

### 修复前实测

Chromium、1440×1000、不限速，每个冷访问使用新的浏览器 context。以下仅为本次网络下的单次观测，不代表访客全国线路或稳定性能基准：

| 冷访问规范地址 | HTML 首字节 | 首次内容绘制 | DOMContentLoaded | load |
| --- | ---: | ---: | ---: | ---: |
| `/blog/` | 464 ms | 824 ms | 1,479 ms | 1,982 ms |
| `/resources/` | 483 ms | 924 ms | 859 ms | 2,347 ms |
| 拜占庭文章短链接 | 440 ms | 956 ms | 1,930 ms | 2,133 ms |

另一次从首页实际点击：Blog 的 301 等待约 300 ms，下一次 HTML 请求约 586 ms；Resources 的 301 约 294 ms，下一次请求约 282 ms。修复能确定消除这次额外请求，不能将冷热缓存之间的全部时间差算作修复收益。

响应记录中 HTML 为 `cf-cache-status: DYNAMIC`、`cache-control: max-age=600`；JS／CSS 命中 Cloudflare 缓存，图片 cover 为一年 immutable 缓存。冷访问中，小脚本也有数百毫秒等待，并存在模块依赖逐层发现；这是网络请求与交互初始化成本。记录的首屏文字先于脚本全部完成出现，未发现足以解释数秒卡住的主线程长任务。

Resources 的部分懒加载 cover 请求约 2.5–3 秒，采样结束仍有三张图片在下载。`load` 不代表所有懒加载图片完成，图片完成也不代表导航刚刚发生。文章评论来自 Giscus，属于另外的第三方请求。

### 从首页跳转的关键差异

直接冷开内页遗漏了一个重要条件：首页使用的 LXGW WenKai Lite TTF 为 **13,872,424 字节**，文字通过 `font-display: swap` 先显示，但字体请求仍在后台传输。离开前的首页请求可能与新 HTML／CSS 竞争连接与带宽，因此“内页自身没有请求大字体”不能排除字体影响。

修正尾斜杠后的线上回测中，Blog／Resources 首次内容绘制曾分别为 3.076 秒／5.604 秒。随后以新浏览器 context 重现“首页 DOMContentLoaded 后点击 Resource Index”：

| 条件 | Resources HTML 首字节 | 首次内容绘制 | 主线程长任务 |
| --- | ---: | ---: | --- |
| 正常加载首页，点击时大字体仍未下载完 | 8,139 ms | 13,100 ms | 无 |
| 仅通过 CDP 阻止这份大字体请求 | 133 ms | 364 ms | 无 |

第一组 HTML 请求在约 2 ms 已发出，8.1 秒才收到首字节；随后两份小 CSS 又等约 4.9 秒。HTML 的 Server-Timing 显示 Cloudflare origin 约 188 ms，不能将全部等待解释成服务端生成页面。对照没有通过 Playwright 路由拦截禁用 HTTP 缓存。两组网络条件仍可能波动，但请求记录与对照强烈指向首页大字体传输造成的争用，符合“首页已显示，点击其他页面却很慢”的反馈。

最终按作者要求，三款字体都在构建时从完整原字体中提取当前文案需要的字形，生成 WOFF2。文楷收集 `src/components/home/` 与 `src/config/pages/home.ts`，与现有首页字体角色一致；Cinzel／MonteCarlo 收集全站文本源码。源码中的额外字与 ASCII 作为安全余量，Unicode／HTML 数字实体一并识别。新字随下一次构建自动进入子集，完整原字体仍保存在仓库，不发送整库给浏览器。使用 [subset-font 的 HarfBuzz/WASM 工具链](https://github.com/papandreou/subset-font)，没有新增 Python 或远端字体服务依赖。

当前文案生成的字体大小（字节，之后会随文案变化）：

| 字体 | 原始 TTF | WOFF2 子集 |
| --- | ---: | ---: |
| LXGW WenKai Lite | 13,872,424 | 61,380 |
| Cinzel（保留可变字重） | 126,348 | 27,176 |
| MonteCarlo | 389,516 | 113,384 |

### 结论边界与复查

已定位标题的本地／发布差异、多余 301，以及从首页离开时大字体仍在传输的负担。用户补充“地址已变但页面迟迟不显示”，与观测到 HTML 之后 CSS 仍等待数秒的阶段一致。没有证据支持改成客户端路由即可解决问题。秒数属于本次网络的样本，不能保证所有访客固定达到同一速度；CDN、访问线路、图片和第三方请求仍有各自成本。

继续排查时，在同一浏览器／网络下分别记录：点击后旧页面停留、地址变化后白屏、内容出现后仍转圈。DevTools Network 开启 Preserve log，先关闭缓存录制冷访问，再开启缓存录制第二轮；关注 Document 的重定向／Waiting／下载，以及阻塞样式、脚本依赖、图片和第三方请求。首页与内页应在同样缓存条件比较。

HTTP 复查示例（去掉或补回尾斜杠比较请求次数）：

```bash
curl -sS -L -o /dev/null -w 'status=%{http_code} redirects=%{num_redirects} first_byte=%{time_starttransfer}s total=%{time_total}s\n' https://telysta.com/blog/
```

原始观测保存在本地 `.tmp/navigation-2026-11-08/`：`network-before.json`、`browser-before.json`、`cold-pages.json`、`live-cold-after.json`、`home-navigation-control.json`。其中带 `after` 的冷访问记录仅在尾斜杠修复后，尚未包含字体修复。临时测量文件不提交；上述数值是关键结果摘录。

## 字体维护

完整源字体保持在 `src/assets/fonts/`，不得删除或用子集覆盖。`scripts/web-fonts.mjs` 在 Astro 配置阶段准备 `.astro/web-fonts/*.woff2`、`fonts.scss` 与 `manifest.json`；缓存不提交，生产只输出实际引用的子集。字体内版权／授权信息保留，[文楷 OFL](../public/fonts/OFL-LXGW-WenKai-Lite.txt)、[Cinzel OFL](../public/fonts/OFL-Cinzel.txt)、[MonteCarlo OFL](../public/fonts/OFL-MonteCarlo.txt) 随站发布。

日常直接使用原有命令，新增文字会自动生成新子集，GitHub Actions 使用相同流程：

```bash
npm run check
# 本地写作开发，文字变化时自动更新字体子集
npm run dev
```

字符集合、原字体内容与锁文件共同决定缓存键；集合不变时复用字体，更新 CSS 后开发服务器热刷新。字体加载保持 `font-display: swap`。文楷当前仅用于首页；未来如果在其他页面引入该字体，应同时扩展生成器的收集范围。运行时任意用户输入不属于静态子集，未收录字符使用既有系统字体回退。

## 本地验证

2026-11-13 完成验证：`npm run check` 通过，类型检查零错误／警告，141 项单元测试，96 份内容零错误／警告，3 份简谱校验，41 页构建。12 项相关浏览器场景通过，覆盖首页 WOFF2 下载、手机／桌面版式、分类弹窗、键盘导航，以及列表、搜索、系列、H1、Open Graph 和 JSON-LD 的正文标题一致性。关闭 JavaScript 仍能导航。新增生僻字后实际 cmap 自动包含该字；另在真实开发页面验证字体 HMR，移除测试字符后恢复原子集。三份原始字体的 Git 内容哈希均未变化。生产端请求在部署后复查。
