# 线上账户与管理

更新于2026-11-16。统一登录入口 `/console/`，管理员工作台 `/telysta-console/`。首页Hero头像是唯一公开账户入口；不新增登录／注册文字按钮、导航入口或悬停提示，点击后才显示账户功能；公开静态页面由Cloudflare Pages提供，账户Worker仅接管这两个后台前缀，书库文件由独立网关处理。本轮认证实现和验证见[统一计划](platform-roadmap-2026-11-16.md)，上线证据以该文件为准。

## 角色与权限

| 角色 | 权限 |
| --- | --- |
| 普通用户 `viewer` | 浏览公开资源、查看自己的账户；注册验证邮箱后默认此角色 |
| 正式用户 `member` | 普通权限、上传电子书／图片、维护自己的上传资料 |
| 超级用户 `superuser` | 正式权限与资源审核；不分配角色，不改全站配置 |
| 超级管理员 `admin` | 用户授权／停用、全部云端内容、配置、操作记录和备份 |

超级管理员身份只绑定 `weiser@telysta.com`，服务端和数据库共同约束；注册参数不能指定角色，只有该身份能将其他用户提升为正式用户或超级用户，其他邮箱不能取得最高权限。受保护内容采用独立的 `restricted_access` 授权，站主始终可访问；提升角色不自动授予该权限。迁移为旧有正式用户保留原先访问资格。后台隐藏入口与API权限检查同时存在。修改角色、访问授权或停用账号会撤销已有登录。超级管理员可查看指定用户的登录设备、退出单个或全部设备；各用户只能管理自己的设备。管理界面不返回令牌或令牌摘要。撤销后新请求立即失效，已经打开的后台／受保护阅览页最迟约30秒或下一次交互检查时退出；已经下载到用户设备的文件不会被远程收回。

直接打开 `/telysta-console/` 使用用户名／邮箱与密码登录。安装时只固定站主邮箱，首次用户名默认建议 `telysta`，由站主自行修改并设置密码；不再提供旧账户／站主邮箱验证码登录入口。匿名访问不会获得初始化权限。

首次设置必须持有仍有效的站主登录，或由本地运维生成的256位一次性初始化链接。运行 `node scripts/prepare-owner-setup.mjs --remote` 将私有链接写入忽略于Git的 `.tmp/owner-initialization/setup-link.html` 和 `setup-link.txt`（权限600，目录700）；24小时有效，新链接会替换前一个。链接凭证只在URL fragment中传给页面，页面立即清除fragment，不写入localStorage；D1只保存摘要，设置成功后不可重放。站主在页面自行输入密码，Agent不代设或记录。已经设置密码的站主不能用初始化流程覆盖凭据，应正常改密或找回密码。

## 注册、登录与账户恢复

普通入口默认为用户名或邮箱加密码登录；创建账户与找回密码是独立流程，可通过 `?view=register`、`?view=login`、`?view=reset` 直接进入。注册必须提供邮箱、用户名、密码和注册用途验证码；验证成功才事务性建立账户及登录状态。用户名为3–24位小写ASCII字母、数字、下划线或短横线，以字母开头，大小写折叠，数据库唯一约束；保留系统名称，站主初始化可使用 `telysta` 或其他合规用户名。前端可用性检查只是提示，提交仍由服务端复核。用户名固定后不在昵称表单中修改；公开署名优先昵称，其次用户名，不展示邮箱。

密码允许15–128个Unicode字符（最多512 UTF-8字节），允许空格，不静默裁剪；阻止有限的常见弱密码，不强迫大小写符号组合。使用原生 `node:crypto` 的 scrypt（N=32768、r=8、p=3，随机16字节盐、32字节摘要），之前先以域隔离HMAC使用服务端pepper。验证摘要只接受固定参数，使用恒定时间比较；不存在的账户也执行同等派生工作。每个isolate最多同时执行两次派生，超出返回可重试429，不为适配套餐降低强度。

旧账户没有密码时通过独立的找回密码流程补齐凭据，保留原有身份与访问授权。`/api/auth/verify` 与旧设置接口返回410，不能绕过密码认证。首次站主设置使用 `ownerSetup.ts`，成功后撤销旧登录并签发新登录；不删除既有文档、版本或用户。

密码重置使用独立用途的五分钟验证码，成功后撤销所有登录，要求用新密码重新登录；修改密码须提供当前密码，成功后轮换当前令牌并退出其他设备。注册、设置、重置、改密的凭据变更和审计在同一个D1事务内完成；比较版本与当前登录状态，阻止旧密码验证完成后越过并发重置。验证码消费仅对成功写入生效，用户名冲突可修正后重试，仍受五次尝试限制。

账户工作区采用全视口左右布局，电脑端固定分组导航，手机端使用可关闭的侧栏。当前任务使用紧凑标题，移除账户空间横幅、假统计和文件名菜单。界面提供中文／英文，切换语言保留表单输入；密码显隐使用眼睛图标。文章、书目、画廊和简谱使用相应表单，设置按用途命名，原文只在高级恢复区。

## 邮件与会话

使用腾讯企业邮箱 `smtp.exmail.qq.com:465`，隐式TLS，发送账号 `weiser@telysta.com`。客户端专用密码通过Cloudflare Secret `SMTP_PASSWORD`配置；`AUTH_PEPPER`用于验证码HMAC和密码pepper，至少32字节。**改变pepper会使既有密码无法验证**，必须按凭据迁移／恢复方案操作，不能当普通配置轮换。不要把真实值放进本文、源码、Git或日志。本地运维临时文件放 `.tmp/`，权限600，换机需另行妥善备份Secret。

验证码六位、五分钟有效、使用一次失效、每个验证码最多五次校验尝试，并发请求也原子计数。注册与重置两种用途不能混用。一分钟内不能重发，每邮箱每小时最多五封，服务每日最多200封；IP另有限频，密码登录对输入身份另限每分钟十次，用户名检查每IP每分钟二十次。SMTP失败撤销该次验证码并退还发送配额；API不返回验证码，数据库不保存明文验证码。发送接口对新旧邮箱采用相同响应，密码错误和未知账户采用同一反馈；仅持有邮箱证明后才说明注册／恢复状态。

会话为随机256位不透明令牌，D1仅保存其SHA-256，八小时过期。Cookie使用Secure、HttpOnly、SameSite=Strict；为主站与书库共享，Domain限定 `telysta.com`，所有该域的子域都属于这一信任边界。前端不保存密码或令牌。写接口核对Origin，响应不缓存，UI通过textContent显示用户内容，不执行文章或配置源码。

## 代码与数据

- `workers/console/`：独立Worker项目。`auth.ts`负责认证路由，`ownerSetup.ts`负责站主首次设置；`credentialAuth.ts`负责注册、密码登录和恢复；`emailChallenges.ts`处理邮件证明；`passwords.ts`、`usernames.ts`各自验证输入；`authTokens.ts`处理会话；`userAccess.ts`处理站主授权与昵称。内容和上传分别位于 `content.ts`、`uploads.ts`，SMTP适配在 `smtp.ts`。
- `public/`：独立后台界面，不随Astro静态构建发布。普通和管理员页面共享组件，按服务端角色显示功能。
- `migrations/`：D1增量迁移；已在远端执行的迁移不回头修改，后续变更添加新文件。
- D1 `telysta-console`：用户、验证码摘要、会话摘要、云端文档、版本历史、上传索引、审核与操作记录。
- `scripts/prepare-console-content.ts`：从已提交的Git源码和本批核验书目准备私有SQL，输出 `.tmp/console-import/`。使用INSERT OR IGNORE，不覆盖已有云端内容。
- `workers/library-gateway/`：通过Service Binding调用Console的 `AuthService`，由账户权限决定受保护书目的展示、下载及阅读。认证服务失败时仍保持保护，不接受旧公共密码解锁。

云端文档保留 `source_path`、固定ID、导入时的 `base_hash`、递增版本和旧内容。并发保存发生冲突时返回409，不能反复强制覆盖。文章ID和现有 `/blog/WEISER…/` 地址保持不变。

## 内容保存与发布边界

`documentEditor.ts`解析Markdown首个正文一级标题和YAML／书目字段；`configEditor.ts`通过TypeScript AST仅修改允许的字面量，不执行配置代码。日期、枚举、附件链接和访问范围在服务端校验；未知合法元信息保留，固定编号不可改，保存时检查版本及当前登录状态。站点设置的稳定编号和源码不作为普通编辑项目。

超级管理员备份页提供文章、书目、画廊、简谱、配置、用户、上传清单、操作记录及全部数据的一键JSON下载，包含完整原文／版本与对象key；不导出验证码、会话或Secret，R2电子书／图片二进制需另行备份。服务端按十条记录分批流式输出，完整文件末尾包含 `completed: true`，下载中断的文件不能当作有效备份。导出为实时遍历，导出期间避免编辑；严格时间点快照另用D1官方导出／恢复机制。`binaryFilesIncluded: false` 明确说明文件不在JSON里，恢复时还需保存对应R2对象。

版本记录接口位于 GET /api/documents/:id/revisions 及其版本子路径，仅超级管理员可读取；列表按25条游标分页，不附带全部原文。旧版本载入编辑区后需显式保存，形成新版本，仍沿用乐观锁，不覆盖并发编辑。

在线阅读使用整窗书籍与紧凑工具栏。EPUB封面、插图和样式仅允许当前书籍解压后生成的资源地址；安全清理、CSP和iframe沙箱同时生效，不能通过放开未知协议或脚本来修复图片空白。维护细节见入库Skill的[阅览实现](../.agents/skills/telysta-library-ingest/references/access-control.md#阅览实现)。

当前支持云端新建文章草稿、通过字段表单编辑文章／书目／画廊／简谱／具名配置、保存版本和下载完整备份。**保存云端草稿不会立即改变公开网站。** Git仍是静态站的发布输入，D1是线上编辑工作区；这里尚未将文章运行时切换为D1直出，也没有在Worker存放GitHub写入令牌。

公开发布仍需审查云端变更、与本地基线合并、通过内容与构建检查、提交并由Cloudflare Pages原生Git构建部署，GitHub Pages流水线同时保留。完整在线发布需要后续接入限定本仓库权限的GitHub App／令牌和受控发布流程，不能拿Cloudflare登录替代GitHub授权，也不能把“数据库保存成功”显示为“网站发布成功”。云端备份含受保护资料，应保存在私人位置。

## 上传与审核

正式用户以上可上传PDF／EPUB／MOBI／AZW3（单文件90MiB以内）和PNG／JPEG／WebP（16MiB以内），每用户每日最多20份、合计1GiB。单次上传限制留在Cloudflare常见套餐的100MB请求上限以内；更大文件继续通过授权入库工具上传R2，不能仅提高前端数字，参见[官方请求限制](https://developers.cloudflare.com/workers/platform/limits/#request-and-response-limits)。检查文件头与格式，拒绝HTML／SVG及格式伪装。电子书进入 `telysta-library/incoming/<用户ID>/<上传ID>.<格式>`，图片进入 `telysta-blog-assets/incoming/…`；都不自动进入公开目录或下载网关。

成员只读写自己的资料，超级管理员可维护全部资料，审核管理员可审核他人上传；超级管理员自审需明确确认并单独记入操作记录。修改已提交资料会重新进入待审核。失败上传退回额度、保留失败索引，不自动删除已写入的文件；管理员可按索引核对和恢复。审核通过只是编目工作流的一步，不能直接把私人上传变成公开对象。后续编目沿用[书库入库Skill](../.agents/skills/telysta-library-ingest/SKILL.md)，检查作者、分类、封面、文件哈希和访问范围，再发布正式书目与网关名单。原文件不因分类／权限变动而删除。

## 设计与资产

账户页面沿用根目录 DESIGN.md 与 telysta-design-guardian。主站和账户空间共用 src/styles/tokens.css；品牌、导航、标题和控件不再维护两套字号。左上角品牌链接返回主页，不另设重复返回入口。assets命令将页面、共享变量与Cinzel的Latin WOFF2子集写入忽略于Git的 .assets/，项目dev、check、test和deploy命令执行该步骤；多Worker类型生成不触发另一项目的资产命令。完整原字体保留在src/assets/fonts/，不发布完整字体库。

## 部署与验证

```sh
npm ci --prefix workers/console
npm run check --prefix workers/console
npm test --prefix workers/console
# 在workers/console内执行；先备份到忽略目录并限制权限，再迁移
(umask 077; npx wrangler d1 export DB --remote --output ../../.tmp/console-before-migration.sql)
npx wrangler d1 migrations apply DB --remote
npm run deploy -- --dry-run
npm run deploy
```

Secret通过Wrangler Secret stdin／受保护文件配置，不写入参数。`wrangler types`生成 `ConsoleEnv`；网关类型生成同时传入两个配置以推导RPC类型。Git push触发的静态构建不自动部署这两个Worker。

Console运行时测试使用本地D1／R2和替代邮件适配器，不向真实邮箱发送。浏览器回归 `tests/browser/account-credentials.spec.ts`、`console.spec.ts`、`console-background.spec.ts`、`library-access-reader.spec.ts` 联通实际认证Worker与书库网关，检查角色界面、私有阅读、脚本隔离和退出清理。真实邮件是否可送达必须另行验证，不能用本地替代邮件测试冒充。

认证迁移 `0004`／`0005` 增加独立授权、显示名、用户名、密码摘要、验证时间与凭据版本，不删除原账户或登录。远端执行前导出完整D1至权限600的忽略目录，并恢复到隔离SQLite核对数量与完整性。界面备份刻意不包含密码摘要、验证码和会话；它不是完整账户灾备，完整备份及pepper须由站主另行私下保存。已创建密码账户后不能直接回退至只支持旧邮箱登录的Worker；旧代码可能绕过新密码策略，应前向修复或暂停认证入口，并保留数据库。
