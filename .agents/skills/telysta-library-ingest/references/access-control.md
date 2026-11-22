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

`/ebooks/read/?book=<固定ID>&format=EPUB|MOBI|AZW3` 按需打开书籍，原文件不转换、不重传。EPUB使用EPUB.js；MOBI／KF8使用固定版本的Foliate解析器及本地安全分页适配。PDF详情链接使用 `target="_blank"` 和 `rel="noopener noreferrer"` 直达文件，网关返回inline与Range；旧的PDF站内阅读地址跳转至文件，不叠加两套工具栏。

阅读器占满视口，保留紧凑工具栏。宽屏双页、窄屏单页；点击正文右／左半区下一／上一页，支持方向键、PageUp／PageDown及滚轮，保留文本选择、链接、捏合缩放和内部滚动。EPUB.js的iframe可能按整章扩展，必须将点击坐标映射至可见stage，不能按整章宽度判断左右。

目录桌面端停靠并让正文重新排版；手机端为侧边模态对话框，点击外部与Escape关闭，关闭后焦点返回。目录搜索和固定关闭头不随列表滚动；当前位置变化时保持选中项可见。不用中央长列表盖住阅读区域。

安全清理位于 `src/lib/ebooks/readerSanitizer.ts`：只保留当前书籍清单生成的blob图片与样式，不能全局放开未知协议、书内脚本或外部资源。iframe使用 `sandbox="allow-same-origin"` 和书内CSP；不启用脚本、弹窗。Calibre的图像封面需修正preserveAspectRatio并约束尺寸，不横向拉伸。回归涵盖真实EPUB／MOBI／AZW3、脚本清除、外部追踪阻断、键盘／鼠标、侧栏焦点和退出后清空。

恢复旧漫画先核对R2实际对象key。现有受保护漫画位于 `books/J 艺术/J2 绘画/J238 各国漫画/成人漫画/`；分类名与本机目录不用于猜测或重建已经上传的key。私有JSON保存完整书名、封面和文件URL，公开JSON只保留中性privateStub；匿名索引和静态页不包含这些资料。站主和获明确授权的账户进入全部藏书、书单与搜索后可以看到它们。

## 匿名下载每日额度（2026-11-22）

未登录IP每日可首次获取10个不同的电子书文件，按北京时间零点重置。同文件的重试、断点续传和PDF Range/在线阅读的分段请求不重复扣次；不同格式是不同文件。在线阅读首次取得原文件也计一次，不能通过省略download参数绕过。书目、封面、HEAD、304、404、416不扣额度。取得R2对象后、开始发送正文前计次；无法判断浏览器是否完整保存，故中途断开仍可免费重试同一文件。

配额由 `workers/library-gateway/src/downloadQuota.ts` 的SQLite Durable Object原子维护，每个IP与日期独立；仅信任Cloudflare提供的CF-Connecting-IP，HMAC使用Cloudflare Secret `ANONYMOUS_QUOTA_SECRET`，不保存明文IP。计数到期由alarm清理。不同网关域名或查询参数使用同一对象Key计数。超限429包含Retry-After及X-Download-*，书籍响应private/no-store，封面仍可缓存。

已登录账户不受该匿名额度约束；限制内容权限仍单独鉴权，伪造或失效Cookie不能免配额。后台角色与限制授权不能混为一谈。部署时保留DO迁移tag和Secret，新增实例必须先配置Secret并运行真实Workers/Miniflare并发与Range测试，不用KV或按节点近似限速代替严格每日额度。配额只限制不同文件数量，不声称能阻止更换IP或对已用文件的突发请求；基础网络防护仍由Cloudflare负责。
