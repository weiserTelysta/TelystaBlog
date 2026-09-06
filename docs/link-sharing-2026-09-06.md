# 链接分享元信息

## 原因与实现

此前公共 Layout 只有 title、description 和 favicon，没有 Open Graph 图片声明。首页头像由客户端 React 渲染，不能依赖分享抓取器从初始 HTML 中找到随机头像。

- `src/components/site/ShareMetadata.astro` 由公共 `Layout.astro` 引入，静态输出 Open Graph、Twitter summary 与 canonical。
- 页面标题、简介继续使用原有配置；URL 从 Astro 的生产 site 与当前 pathname 构成，不携带查询参数或 hash，不改变路由。
- 默认分享图集中在 `src/config/site.ts`，固定使用公开 CDN 的 Weiser 头像，与会话 favicon、随机首页头像及隐藏时祝福标题分开。
- 图片实测 HTTP 200、`image/webp`、384×384、56,074 字节。沿用现有资源，不新增图片生成或构建时远程下载。
- 博客文章传入 cover、标题、发布时间、更新时间与标签；没有 cover 时回退默认图。封面支持站点根路径及 HTTP(S) 绝对 URL。相对文件路径、`asset:` 等尚未解析的标识回退默认图，不发布无效地址；自定义封面不猜测宽高。
- 未添加数据库、依赖、客户端请求或页面装饰，未改变 Giscus pathname 映射。

## 维护与平台边界

改默认图片时同步修改 URL、alt、真实尺寸和 MIME；公开 URL 必须无需登录访问。文章可以通过现有 frontmatter `cover` 提供专属分享图。默认使用方形 summary，不强行把角色头像裁成横幅。

静态声明依据 [Open Graph 协议](https://ogp.me/)。元信息是提供给平台的输入，不能强制平台使用图片、采用指定布局或立即刷新旧卡片。上线后应在目标聊天软件重新分享验证；旧消息可能继续显示缓存。若某平台不支持 WebP，再提供独立 PNG/JPEG 兼容分享图，不改变原插画格式或随机头像系统。

## 验证

新增单元测试覆盖默认回退、绝对地址、无效地址与不伪造尺寸；浏览器测试禁用 JavaScript，检查首页与文章仍有分享图片、正确类型、生产 URL 和文章日期。线上平台实际预览须在发布后另行验证。

阶段验收：`npm run check` 通过（类型零错误、66 项单元测试、79 份内容检查、22 页构建）；完整浏览器回归 21 项通过。资源排除测试改为检查 body，允许 head 中的默认分享头像声明，但仍禁止头像进入画廊。后续与配置入口整理一起提交，见 [提交前审核](review-2026-09-06.md)。
