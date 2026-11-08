# 标题与页面跳转排查

日期：2026-11-08。依据生产站 `https://telysta.com` 的 HTTP／Chromium 请求记录及本地代码，修复前版本为 `3ea4538`。本轮保持现有版式、字体与目录原位淡入行为，保留作者未提交的 Markdown 编辑。

## 标题不一致

《拜占庭的赠礼》frontmatter 的 `title` 为 `《拜占庭的赠礼》阅读笔记`，生产正文的 H1 为 `拜占庭的赠礼`。旧 `resolvePostTitle` 优先提取正文 H1，文章页又优先使用 Markdown 插件的 `articleTitle`；后台预览也有同样逻辑。因此发布成功后，列表仍显示较短的正文标题。这是取值优先级错误，不需要修改文章文件名、UUID 或缓存网址。

修复后统一按 `title` → 正文 H1 → 去日期文件名的顺序取值，覆盖列表、文章、系列、搜索、分享／结构化数据及后台。正文 H1 仍在渲染时移除，页头只显示一个标题；未填写 frontmatter 的文章继续支持自动补全。递增内容渲染版本，避免复用旧 Markdown 缓存。

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

还发现首页使用的 LXGW WenKai Lite 单个 TTF 约 14 MB，一次冷首页访问中下载约 15 秒；使用 `font-display: swap`，文字可先用回退字体显示。该成本值得单独做字体压缩／分片评估，但不能据此解释“首页快、其他页面点击慢”：上述 Blog／Resources 冷访问没有下载这份字体。本轮没有替换字体或改动排版。

### 结论边界与复查

已定位并修复标题优先级与多余 301。本次没有复现其他页面长时间完全不出现，也没有证据支持把静态架构改成客户端路由即可解决问题。尚不能把作者实际网络中的全部延迟归因于尾斜杠。

继续排查时，在同一浏览器／网络下分别记录：点击后旧页面停留、地址变化后白屏、内容出现后仍转圈。DevTools Network 开启 Preserve log，先关闭缓存录制冷访问，再开启缓存录制第二轮；关注 Document 的重定向／Waiting／下载，以及阻塞样式、脚本依赖、图片和第三方请求。首页与内页应在同样缓存条件比较。

HTTP 复查示例（去掉或补回尾斜杠比较请求次数）：

```bash
curl -sS -L -o /dev/null -w 'status=%{http_code} redirects=%{num_redirects} first_byte=%{time_starttransfer}s total=%{time_total}s\n' https://telysta.com/blog/
```

原始观测保存在本地 `.tmp/navigation-2026-11-08/`：`network-before.json`、`browser-before.json`、`cold-pages.json`。临时测量文件不提交；上述数值是关键结果摘录。

## 本地验证

`npm run check` 通过：类型检查零错误／警告，139 项单元测试，96 份内容零错误／警告，3 份简谱校验，41 页构建。相关浏览器场景共 9 项通过；手机／桌面截图显示完整标题，列表、搜索、系列、H1、Open Graph 和 JSON-LD 一致。关闭 JavaScript 时，首页 Blog／Resource Index 链接也直接访问带尾斜杠的地址并显示静态内容。生产端请求需在部署后复查，不能用本地预览代替。
