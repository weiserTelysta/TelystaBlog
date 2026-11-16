# 书目访问状态与在线阅览

## 元信息在哪里

- `src/content/ebooks/catalog/_classes.json`：22个中图法基本大类的导航名称。
- `src/content/ebooks/catalog/<大类>.json`：普通书目和受保护占位。结构为 `{"category":"K","booklists":[{"clcCode":"K27","clcName":"中华人民共和国史","books":[...]}]}`。修改标题、作者、格式或细类时在相应条目中编辑，固定 `id` 不变。
- `.library-private/catalog/<大类>.json`：受保护完整书目，只存在本地与授权备份，不加入公开Git。恢复／部署Worker需要它，不能用公开占位冒充完整资料。
- Booklist分组的 `clcCode`／`clcName` 由组内每本书继承。`access` 控制服务端权限，`draft` 控制是否发布；二者独立。

## public 与 protected

`access: public` 可匿名展示、下载和阅览。`access: protected` 的完整资料由Worker鉴权后返回，匿名索引、静态HTML和客户端脚本不包含其标题、作者、封面或文件URL。

作者目前要求：仅将明确指定的成人题材及六四事件相关书目标记为受保护；不因A／D类号、一般政治、宗教或历史话题自动整类上锁。保护标记不等于删除、移动或重新上传原书，也不自动授权处理其他文件。

使用工具改变状态：

```sh
npm run library:access -- --id WEISERxxxxxxxxxxxx --access protected
npm run library:access -- --id WEISERxxxxxxxxxxxx --access public
```

工具先保留完整书目，再写公开占位；缺少私有资料时明确失败。不要手工把完整受保护资料留在公开JSON后直接提交。新书仍需核对作者、文件与公开范围，不按关键词自动发布整批。

首页Hero头像进入 `/console/`。受保护内容由超级管理员（admin）始终访问，其他账户必须获站主明确的独立授权（restricted_access）；升为正式用户或超级用户（superuser）不自动取得该权限。旧有已授权账户在迁移时保留访问资格。只有固定超级管理员能提升角色，其他注册用户保持普通身份。专属管理工作台 `/telysta-console/`；固定超级管理员邮箱为 `weiser@telysta.com`。账户会话由Console Worker和D1管理，书库通过Service Binding核对权限，原公共密码锁已经由账户权限替代。前端不保存密码或会话令牌。退出后清除私有书目并停止阅览，文件接口仍逐次鉴权。

账户部署与邮件Secret见 [docs/console.md](../../../../docs/console.md)。不得把SMTP密码、验证码、会话令牌写入书目、Skill或日志。受保护元信息依然不能进入公开Git、静态HTML或匿名索引。

## R2 与 Worker 发布

目标：Worker `telysta-library-gateway`，账户与 `telysta-library` R2 binding 以 `workers/library-gateway/wrangler.jsonc` 为准。文件仍在原桶的 `books/`／`covers/`，不靠移动或删除书籍实现保护。

1. 运行 `npm run library:gateway:prepare -- --scope /path/to/release-ids.json`，显式传入已核验的全量发布ID数组。它核对公开占位与本地私有完整书目，生成 `.library-private/gateway/catalog.json`、Worker本地忽略的 `src/catalog.generated.json` 与 `.tmp/library-gateway/manifest.json`。
   名单须覆盖仍需提供访问的既有书和此次获准新增的书，不能只传新增批次而撤掉旧书。缺少名单、重复ID或无效ID时工具停止；核对manifest的数量和哈希，不能把其他待处理条目顺带部署。
2. `npm ci --prefix workers/library-gateway` 后执行该项目的 `check` 与 `test`。测试使用中性fixture，不需要真实密码或完整私有书目；生产打包缺少真实生成catalog时必须失败。
3. 先部署Console认证服务和D1迁移，再部署声明 `AuthService` Service Binding的网关。认证服务不可用时保持受保护，不回退到公共密码。SMTP与验证码Secret只属于Console项目，不放在书库JSON。
4. 在已有发布授权内部署Worker并验证实际运行。首次接管域名时先测Worker，再解除R2的同名直连域绑定，关闭其他R2公开访问方式，交由Worker自定义域提供资源。不能只保护网页、保留可匿名直取同一对象的 `r2.dev` 或其他域。
5. 匿名目录不能包含受保护记录；匿名GET／HEAD／Range不能读取它们的书籍或封面。明确获授权的用户登录后检验文件字节、PDF的206／Content-Range、EPUB读取，普通用户、伪造会话与退出登录均要验证。邮箱验证码限频与PDF分段请求分开处理。
6. Worker就绪后再推送网站元信息并验证Cloudflare Pages及保留的GitHub Pages流水线，避免页面已上线但后台未更新。Git push不会自动部署这个独立Worker。

Worker运行时只流式读取R2文件，未列入部署catalog的对象不会自动透传。私有catalog可以在R2所有直连入口关闭后备份到manifest指定的 `gateway/` key；HTTP网关不公开这个前缀，恢复通过认证的R2工具读取。换机器前备份私有JSON，保留原书与既有对象。

已公开过的Git历史或访客已保存的文件不能靠新密码收回；本流程保护当前网站和文件服务。不要擅自改写Git历史，或把隐藏卡片当作真实鉴权。

## 阅览实现

`/ebooks/read/?book=<固定ID>&format=EPUB|PDF` 按需打开书籍。PDF使用浏览器阅览器并保留Range；EPUB在沙箱iframe中显示，关闭书内脚本、弹窗，先清理HTML并限制外部资源。书架不预加载书籍正文。MOBI／AZW3暂供下载，需要转换时另行处理并保留原文件。

EPUB须等待资源替换完成后再显示。清理逻辑位于 `src/lib/ebooks/readerSanitizer.ts`，只保留当前书籍清单生成的同源blob图片与样式地址；不能为修复封面空白而全局允许未知协议、书内脚本或外部资源。回归时同时检查真实封面、书内样式、脚本移除、沙箱与退出后的内容清除。
