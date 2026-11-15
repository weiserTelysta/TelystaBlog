# 线上账户与管理

更新于2026-11-15。统一登录入口 `/console/`，管理员工作台 `/telysta-console/`。首页Hero头像是唯一公开账户入口；不新增登录／注册文字按钮、导航入口或悬停提示，点击后才显示账户功能；公开静态页面由Cloudflare Pages提供，账户Worker仅接管这两个后台前缀，书库文件由独立网关处理。

## 角色与权限

| 角色 | 权限 |
| --- | --- |
| 普通用户 `viewer` | 浏览公开资源、查看自己的账户；首次邮箱验证后默认此角色 |
| 正式用户 `member` | 普通权限、受保护书目与文件、上传电子书／图片、维护自己的上传资料 |
| 超级用户 `superuser` | 正式权限、查看并审核提交的资源；不分配角色，不改全站配置 |
| 管理员 `admin` | 用户授权／停用、全部云端内容、配置、操作记录和备份 |

管理员身份只绑定 `weiser@telysta.com`，服务端和数据库共同约束；注册参数不能指定角色，其他邮箱不能被提升为管理员。后台隐藏入口与API权限检查同时存在。修改用户角色或停用账号会撤销其已有会话。管理员可查看指定用户的活动会话、撤销单个或全部会话；各用户只能管理自己的会话。管理界面不返回令牌或令牌摘要。撤销后新请求立即失效，已经打开的后台／受保护阅览页最迟约30秒或下一次交互检查时退出；已经下载到用户设备的文件不会被远程收回。

## 邮箱登录

使用腾讯企业邮箱 `smtp.exmail.qq.com:465`，隐式TLS，发送账号 `weiser@telysta.com`。客户端专用密码通过Cloudflare Secret `SMTP_PASSWORD`配置；`AUTH_PEPPER`用于验证码HMAC摘要，至少32字节。不要把真实值放进本文、源码、Git或日志。本地运维临时文件放 `.tmp/`，权限600，换机需另行妥善备份Secret。

验证码六位、五分钟有效、使用一次失效、最多五次错误。一分钟内不能重发，每邮箱每小时最多五封，服务每日最多200封；IP另有限频。SMTP失败会撤销该次验证码，并明确返回发送失败；API不返回验证码，数据库不保存明文验证码。首次登录创建普通账户，已有角色不会被注册流程重置。

会话为随机256位不透明令牌，D1仅保存其SHA-256，八小时过期。Cookie使用Secure、HttpOnly、SameSite=Strict；为主站与书库共享，Domain限定 `telysta.com`，所有该域的子域都属于这一信任边界。前端不保存密码或令牌。写接口核对Origin，响应不缓存，UI通过textContent显示用户内容，不执行文章或配置源码。

## 代码与数据

- `workers/console/`：独立Worker项目，认证、权限、内容、上传分别位于 `src/auth.ts`、`permissions.ts`、`content.ts`、`uploads.ts`；SMTP适配在 `smtp.ts`。
- `public/`：独立后台界面，不随Astro静态构建发布。普通和管理员页面共享组件，按服务端角色显示功能。
- `migrations/`：D1增量迁移；已在远端执行的迁移不回头修改，后续变更添加新文件。
- D1 `telysta-console`：用户、验证码摘要、会话摘要、云端文档、版本历史、上传索引、审核与操作记录。
- `scripts/prepare-console-content.ts`：从已提交的Git源码和本批核验书目准备私有SQL，输出 `.tmp/console-import/`。使用INSERT OR IGNORE，不覆盖已有云端内容。
- `workers/library-gateway/`：通过Service Binding调用Console的 `AuthService`，由账户权限决定受保护书目的展示、下载及阅读。认证服务失败时仍保持保护，不接受旧公共密码解锁。

云端文档保留 `source_path`、固定ID、导入时的 `base_hash`、递增版本和旧内容。并发保存发生冲突时返回409，不能反复强制覆盖。文章ID和现有 `/blog/WEISER…/` 地址保持不变。

## 内容保存与发布边界

管理员备份页提供文章、书目、画廊、简谱、配置、用户、上传清单、操作记录及全部数据的一键JSON下载，包含完整原文／版本与对象key；不导出验证码、会话或Secret，R2电子书／图片二进制需另行备份。服务端按十条记录分批流式输出，完整文件末尾包含 `completed: true`，下载中断的文件不能当作有效备份。导出为实时遍历，导出期间避免编辑；严格时间点快照另用D1官方导出／恢复机制。`binaryFilesIncluded: false` 明确说明文件不在JSON里，恢复时还需保存对应R2对象。

当前支持云端新建文章草稿、编辑文章／书目／画廊／简谱／配置原文、保存版本和下载完整备份。**保存云端草稿不会立即改变公开网站。** Git仍是静态站的发布输入，D1是线上编辑工作区；这里尚未将文章运行时切换为D1直出，也没有在Worker存放GitHub写入令牌。

公开发布仍需审查云端变更、与本地基线合并、通过内容与构建检查、提交并由GitHub Pages部署。完整在线发布需要后续接入限定本仓库权限的GitHub App／令牌和受控发布流程，不能拿Cloudflare登录替代GitHub授权，也不能把“数据库保存成功”显示为“网站发布成功”。云端备份含受保护资料，应保存在私人位置。

## 上传与审核

正式用户以上可上传PDF／EPUB／MOBI／AZW3（单文件90MiB以内）和PNG／JPEG／WebP（16MiB以内），每用户每日最多20份、合计1GiB。单次上传限制留在Cloudflare常见套餐的100MB请求上限以内；更大文件继续通过授权入库工具上传R2，不能仅提高前端数字，参见[官方请求限制](https://developers.cloudflare.com/workers/platform/limits/#request-and-response-limits)。检查文件头与格式，拒绝HTML／SVG及格式伪装。电子书进入 `telysta-library/incoming/<用户ID>/<上传ID>.<格式>`，图片进入 `telysta-blog-assets/incoming/…`；都不自动进入公开目录或下载网关。

成员只读写自己的资料，管理员可维护全部资料，超级用户可审核他人上传；管理员自审需明确确认并单独记入操作记录。修改已提交资料会重新进入待审核。失败上传退回额度、保留失败索引，不自动删除已写入的文件；管理员可按索引核对和恢复。审核通过只是编目工作流的一步，不能直接把私人上传变成公开对象。后续编目沿用[书库入库Skill](../.agents/skills/telysta-library-ingest/SKILL.md)，检查作者、分类、封面、文件哈希和访问范围，再发布正式书目与网关名单。原文件不因分类／权限变动而删除。

## 部署与验证

```sh
npm ci --prefix workers/console
npm run check --prefix workers/console
npm test --prefix workers/console
# 在workers/console内执行，先迁移，再导入已核验种子，最后部署
npx wrangler d1 migrations apply DB --remote
npx wrangler deploy --dry-run
npx wrangler deploy
```

Secret通过Wrangler Secret stdin／受保护文件配置，不写入参数。`wrangler types`生成 `ConsoleEnv`；网关类型生成同时传入两个配置以推导RPC类型。GitHub Pages push不自动部署这两个Worker。

Console运行时测试使用本地D1／R2和替代邮件适配器，不向真实邮箱发送。浏览器回归 `tests/browser/console.spec.ts`、`library-access-reader.spec.ts` 联通实际认证Worker与书库网关，检查角色界面、私有阅读、脚本隔离和退出清理。真实邮件是否可送达必须另行验证，不能用本地替代邮件测试冒充。
