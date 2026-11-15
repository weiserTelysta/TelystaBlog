# 书室维护

书室入口 `/ebooks/`。桌面四列、左封面右书名／作者／格式，无外框；封面100px，详情240px，手机分别104px和200px。标题、作者固定两行，超出省略，鼠标悬停可读完整文本。分类默认关闭，支持书名／作者搜索、格式组合、数字分页和跳页。列表不预取书籍正文。

## JSON与中图法

正式数据在 `src/content/ebooks/catalog/<大类>.json`，大类名称在 `_classes.json`。不再逐书import或创建Markdown。`imported/`已完成迁移，原稿备份只留本地 `.tmp/`；此前暂不发布的新书保留为JSON草稿。

```json
{
  "category": "K",
  "booklists": [{
    "clcCode": "K27",
    "clcName": "中华人民共和国史",
    "books": [{
      "id": "WEISER012345abcdef",
      "title": "书名示例",
      "authors": ["作者"],
      "access": "public",
      "description": "简短介绍。",
      "files": [],
      "draft": true
    }]
  }]
}
```

示例是草稿，文件地址需核验后填写。书籍继承分组的细类号和类名，“二级Booklist”表示导航层级，实际类号可有不同深度。固定ID首次保存后不变，改标题、分类或文件名不改变网址与既有R2对象key。

`/ebooks/clc/K/`是大类入口，`/ebooks/booklists/K27/`是细类入口。包含斜杠的类号只在URL转为连字符，数据保留原码。分类依据见[CLC参考](../.agents/skills/telysta-library-ingest/references/clc.md)，字段与继承规则见[JSON维护](../.agents/skills/telysta-library-ingest/references/catalog-json.md)。

## 访问与阅览

`draft`默认true，控制是否发布；`access: public|protected`控制权限；`categoryOnly`仅控制发现位置。三者独立。匿名索引和静态HTML不含受保护完整资料，只有通用占位；完整资料在忽略于Git的 `.library-private/catalog/`。访问状态使用：

```sh
npm run library:access -- --id WEISERxxxxxxxxxxxx --access protected
```

普通账户只能浏览公开内容；正式／超级／管理员可以展示、下载和阅览受保护内容。首页头像进入 `/console/`，原公共密码锁由[账户系统](console.md)替代。受保护条目在授权后可参与全部藏书、分类、Booklist与搜索。

详情提供PDF／EPUB在线阅读。PDF使用浏览器查看器和Range，EPUB按需加载、清理HTML并使用禁止脚本的iframe；正文不会在书架预加载。MOBI／AZW3供下载。退出登录会清除页面中的受保护内容并停止阅览，服务器仍独立检查每次文件请求。

## R2与发布

文件仍存 `telysta-library`：`books/<已核验实际key>`、`covers/<完整封面SHA256>.webp`。域名 `library-files.telysta.com`需由Worker网关接管，R2直连公开域和r2.dev不能绕过权限。S3 API端点只用于认证运维，不能作网页链接。分类修订不移动原文件或对象。

运行 `npm run library:stats`查看当前源数据统计；本地待处理草稿、Git已发布源和网关部署范围可能不同，不能用混合目录总数宣称线上数量。多人编辑或发布部分核验范围时，使用 `library:gateway:prepare -- --scope <ID数组JSON>`固定名单；随后分别部署网关和网站，不能把未经审查的本地新增条目顺带上线。

普通加书只改JSON；文件与封面上传R2，不提交Git。操作步骤、作者证据、Windows路径和校验方法见[入库Skill](../.agents/skills/telysta-library-ingest/SKILL.md)与[书库指南](library.md)。离线准备脚本输出临时分组JSON，合并前审查，不能覆盖正式整类书单。

## 检查

`npm run content:check`检查书目schema、重复ID、日期、格式与路径；`npm run check`完成类型、单元和生产构建。构建不扫描远端桶。真实链接、权限和Range需另验。运行时测试位于 `workers/library-gateway/tests/`；桌面／手机和账户阅览回归位于 `tests/browser/`。
