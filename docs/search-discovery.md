# 公开站点发现与收录

网站只维护一份公开 `https://telysta.com/sitemap.xml`。构建时按明确范围收录首页、见我、博客、书室首页、画廊、系列及其公开目录、公开博客的 WEISER 永久链接。整份书目、书单、分类分页、阅读器、后台、JSON 索引及旧跳转页均在主动提交范围之外。后台另发 `noindex`，受保护资料由服务端鉴权。

`/rss.xml`只包含公开文章，沿用永久链接和正文H1优先的标题。它用于读者订阅和博客目录核验，不包含电子书正文、云端草稿或用户资料。

Bing支持IndexNow。公开验证文件与设置在 `data/seo/indexnow.json` 和 `public/<校验key>.txt`，它们是网站所有权校验资料；邮箱Secret完全独立。运行 `npm run seo:submit`先看预演名单，确认网站验证文件已部署，再用 `npm run seo:submit -- --submit`提交。默认选择少量首页／栏目及公开文章，单次上限50条；脚本不在构建时自动推送。成功HTTP状态仅代表接收，不保证收录，依据[官方协议](https://www.indexnow.org/documentation)。结果记录在忽略于Git的 `.tmp/seo/`。

Google已停用匿名sitemap ping，不能把404当提交成功。通过robots发现，或在已验证的Search Console中提交sitemap；见[官方说明](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)。百度普通收录需要站点所有者的资源平台验证和提交token，缺少授权时不声称已推送。对应令牌应走受保护环境，不写入公开Git。

博客目录提交限于站点的公开名称、作者、URL、简介和RSS。先检查该目录的规则、是否已收录、项目是否接受申请，再提交一次并记录链接。不要发布后台地址、私人邮箱凭据或受保护书目，也不自动添加与站点无关的营销内容。

## 2026-11-15执行结果

主域上的验证文件、RSS和单一sitemap均已上线。IndexNow已提交20个公开URL，返回202（已接收、校验待完成），不代表已经收录；本地回执在 `.tmp/seo/indexnow-last.json`。BlogHub已按其模板提交[申请#277](https://github.com/shidenggui/bloghub/issues/277)，等待维护者处理，没有重复提交。

本轮未连接Google Search Console或百度搜索资源平台账号，未执行这两个平台的账号内提交；不使用已经停用的匿名ping接口冒充成功。若后续提供相应账号授权／本地安全配置，再提交同一个公开sitemap，无需创建第二份站点地图。

## 2026-11-22 执行结果

IndexNow 接收首页 `/`、`/blog/` 和 `/series/`，返回 HTTP 200。线上原有 sitemap 有 1,370 个地址，收紧规则后的本地构建有 44 个。Google Search Console 和百度普通收录仍待站点账号授权。未找到可核实的搜狐站点地图提交渠道。

## 2026-11-27 执行结果

IndexNow 再次接收首页、博客和系列总览，返回 HTTP 200。本次回执记录于 `.tmp/seo/indexnow-last.json`。Google Search Console 和百度仍需站点账号授权。

已为静态构建提供 `404.html`。旧 sitemap 地址和其他不存在的链接返回 404，错误页提供首页入口并声明 `noindex`。[Cloudflare Pages 的 404 行为](https://developers.cloudflare.com/pages/configuration/serving-pages/#not-found-behavior)

## 爬虫规则

2026-11-22 收窄电子书抓取范围，保留书室首页，将详情、书单、分页、分类目录、阅读器和机器索引排除。通用爬虫组声明 `Crawl-delay: 5`，Bing 等支持该指令的爬虫可以读取同一份规则。Google 使用路径规则，其文档不支持该延迟指令。百度可在已验证站点的资源平台设置抓取频次。robots.txt 供爬虫遵守，实际请求控制由站点的鉴权及边缘限流负责。[Bing robots 说明](https://www.bing.com/webmasters/help/?topicid=cb7c31ec) · [Google robots 规范](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec) · [百度抓取频次](https://ziyuan.baidu.com/pressure/index)

线上核验发现Cloudflare自动追加的训练爬虫限制同时禁止了Baiduspider。为满足百度收录要求，robots改由仓库维护：`data/seo/crawler-policy.json` 保留其余既有训练爬虫限制及 `search=yes,ai-train=no,use=reference`，仅将Baiduspider移出禁止名单；后台和阅读器路径仍禁止抓取。

Cloudflare对应zone的 `is_robots_txt_managed` 与 `bot_preference_sync_enabled` 需关闭，否则自动拼接会重新禁止百度。其他Bot Management设置保持原值。先部署并检查仓库生成的robots，再关闭这两个自动拼接开关，最后从主域复查。此维护方式遵循[Cloudflare针对个别爬虫例外的说明](https://blog.cloudflare.com/bot-preference-sync/)，之后新增训练爬虫须审阅JSON名单，不再依赖自动追加。
