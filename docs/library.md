# 书室资料与书目维护

> 2026-11-15维护入口已更新：当前书目按中图大类保存在 `src/content/ebooks/catalog/*.json`，细类使用 `booklists` 分组，`imported/` 已完成本地迁移。运行方式与访问控制以[书室维护](ebooks.md)、[线上管理](console.md)及[入库Skill](../.agents/skills/telysta-library-ingest/SKILL.md)为准。下文记录盘点批次与历史对象，不能代替本次Git发布名单；暂不发布的新书保留草稿。R2文件域现由鉴权Worker接管，桶公开直连已关闭。

书室入口为 `/ebooks/`，文件使用独立 R2 bucket `telysta-library`，公开域名为 `https://library-files.telysta.com`。域名根路径没有目录索引；访客从书室进入具体书籍和文件。S3 endpoint 只用于认证工具，凭据不进入网页或仓库。

## 发布范围与实物核验（2026-11-16）

2026-11-16 起明确发布名单为 **705 份**：697 份已核验书目加作者随后加入的 8 本新书；受保护 67 份，匿名可读 638 份。65 份漫画原文件仍在 R2，实际路径与大小逐项吻合，合计 3,659,964,377 字节；本轮只修正私有书目、网关名单与 8 本的草稿状态，没有移动、删除或重传原书。这里的大小核对不代表重新下载计算远端 SHA-256。

8 本新书原为草稿（`draft: true`），2026-11-16 按作者指示转为公开并纳入发布范围；转换依据是`release-705-ids.json` 的 705 个 ID 与 `.tmp/library-gateway/manifest.json`。发布前仍须核对全量 ID 名单与网关 manifest，公开占位、私有 JSON 和实际对象 key 相互一致。

完整受保护书目仅保存在 `.library-private/catalog/` 及私有R2网关目录；公开Git只保留中性占位。超级管理员始终有访问权限，其他用户需显式授权。`categoryOnly`控制发现方式，不能替代服务端鉴权，也不能把已有权限的用户挡在全部藏书之外。

## 首次盘点与公开范围（2026-11-14历史快照）

Windows 原生完整盘点为 **697 份电子书文件、19,091,014,798 字节（17.78 GiB）**，含 EPUB 447、PDF 208、MOBI 23、AZW3 19。全部与原 `书名目录.csv` 对应，本地 SHA-256 为697份不同内容，没有逐字节重复。不同格式、译本、合集仍可能属于同一作品，不把文件去重等同于作品去重。

公开书室选入 **632 份、15,431,050,421 字节（14.37 GiB）**：EPUB 382、PDF 208、MOBI 23、AZW3 19。初次发布暂未纳入65份漫画；这一历史选择已由2026-11-16的账户鉴权发布方案取代。原始697份文件和作者补全CSV完整保留。

初次发布的排除名单属于历史维护方式。当前以分类JSON的draft／access、私有元信息和网关明确发布名单为准；漫画分类不能被硬编码为永久不可访问。上传必须使用清理后的文件名单，不能直接同步整座混合书库。

R2全量核对：632份书籍、624份不同封面文件均通过原生 `rclone check`；书籍使用MD5比较，零差异。SHA-256是另存的本地完整性清单，不声称逐文件下载远端重新计算了SHA-256。最终清单和中断上传清理记录保存在本地 `.tmp/library-2026-11-14/`，不提交凭据或本机绝对路径。

## 中图法整理

原库总体采用中图法，覆盖19个基本大类、原163个末级类号；中图法共有22个基本大类，可参见[复旦大学图书馆简表](https://library.fudan.edu.cn/xszl/e8/ae/c42129a518318/page.htm)。本次确认分类体系与书目对应关系，没有宣称每本书都经过完整CIP重编。

- `D73/77`、`E3/7`、`F13/17`、`I3/7` 是类号范围简写；斜杠在文件系统中形成额外目录层，目录层数不能机械等同于分类层数。
- `C912`、`C913`、`J1`、`TQ65` 有同号不同简称的目录；检索以书目类号为准。
- `高频技术-中英文.pdf` 实为 Matjaž Vidmar 的射频实验讲义。新书目按主题从 `TP3` 校正至 `TN 无线电电子学、电信技术`，清理后为164个类号；这是主题归类修正，不声称原书CIP如此。原文件及远端对象键不移动，已存在的地址保持有效。
- `ssreader.pdf` 实为《伯里曼人体结构绘画教学（最新版）》；`天使图鉴.pdf` 实为《天使事典》。清理书目改正题名，并保留原目录题名与对象路径。

WSL最初枚举部分目录时出现EIO。最终以Windows原生完整枚举、CSV、rclone虚拟路径和校验和交叉核对；最终公开632份源于明确的65份排除规则，与早期不完整扫描不是同一个统计口径。

## 作者补全与证据

以下数量对应首次已上传的697／632份审计快照。随后书室展示修订另为《玛拉兹英灵录》第二卷加入第120条证据，分离作者与Jass译者并修正外层引号；本轮再核对8份新书，作者证据共128条。历史R2目录快照仍保留生成时内容，当前合并清单采用新前缀。

原CSV有372条作者空缺。读取447个EPUB的OPF后补齐274条；剩余98条结合出版社、图书馆书目及文件内题名／版权页核对。另修正21条已有署名中的版次、套装说明、ISBN、出版社及扫描工具等误填，连同共同作者遗漏一并核对。最终完整书库的来源为原CSV305条、EPUB273条、人工核对119条；公开子集分别为259、254、119条。

119条人工核对中，116条确认作者、编选者或集体成书性质（《圣经》为多作者且部分佚名的文献汇编，不把“中英对照”当作者）；1条《奥义书》记佚名、黄宝生单列译者；120册合集和15册译文合集仅列已确认作者，状态为 `partial-collection`，尚未逐册拆分完整责任者。《少有人走的路》8册和《富爸爸》5册已逐册核对版权页。字段不再空白不等于697份全部经过外部权威书目复核：普通CSV／EPUB来源仍记为 `unreviewed`。

[`author-overrides.json`](../data/library/author-overrides.json) 每条绑定完整SHA-256，保存网页出处或文件内页码／署名位置，区分编者、选者、译者、审定者和发言人。PDF的Administrator、扫描软件、水印和藏书人签名不作为作者。换文件或版本后，不会静默套用旧核对记录。

本地新增 `书名目录-补全作者-2026-11-14.csv`，含697条、原有列及作者来源、核验状态、出处、编号和SHA-256；原CSV不覆盖。原 `_manifest.csv` 含设备路径和下载来源，不上传公开书目。

## 网页、封面和对象路径

每页24项，桌面四列，窄屏收为三／二／一列；分类和分页均为静态链接，无JavaScript也能使用。总览27页，19个基本大类有独立入口。完整文件只在访客打开格式链接时请求；列表不预取书籍正文。

书目位于 `src/content/ebooks/imported/`。每条 `id` 首次由文件内容短哈希生成并固定写入；修改题名或Markdown文件名不会改变网址。更新同一书籍文件时保留已发布 `id`，改变文件地址；不要让重新导入覆盖既有身份。当前按文件版本保留条目，未凭相似标题合并不同译本或合集。

626份使用EPUB／Kindle内的原封面或PDF首页缩略图；6份缺少可用封面，显示书名占位。624份不同WebP总计10,806,330字节，最长320×480、质量82，不裁切、不改原书。封面使用 `covers/<内容SHA256>.webp` 并设置一年immutable；电子书原文件不经过图片转换。

文件位于 `books/<原分类目录>/<原文件名>`。100个Windows路径在rclone中发生字符编码映射，例如全角冒号对应远端半角冒号。清单同时记录 `sourceRelativePath` 与实际 `objectKey`：先精确匹配，再做唯一NFKC匹配，歧义直接报错。下载地址按 `objectKey` 编码，不能靠原文件名猜测。

公开维护清单位于 `catalog/2026-11-14/`：`catalog.json`、`catalog.csv`、中文CSV、`catalog.sha256`、`SHA256SUMS`；`catalog/latest.json` 指向当前版本。公开清单只有632份；完整697份审计结果留在本地。

## 重复执行

在PowerShell使用已经配置的 `r2:` remote，先提取完整清单和EPUB元数据。工具不会把凭据写入仓库：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/inspect-library-epub.ps1 -Source 'C:\Users\weise\Desktop\Books' -Output "$env:TEMP\telysta-library\epub-metadata.json"
# 用本次生成的公开 upload-files.txt 预演；确认后才追加 -Apply
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/sync-r2-library.ps1 -Source 'C:\Users\weise\Desktop\Books' -FilesFrom "$env:TEMP\telysta-library\upload-files.txt"
```

同步脚本要求显式文件名单，默认dry-run，实际执行后保存原生盘点、完整本地SHA-256及选中对象的远端check结果，不删除本地／远端已有文件。WSL调用Windows工具，避免DrvFS枚举遗漏。首次原生盘点／hashsum可使用与脚本相同的四格式筛选；不要用公开子集冒充原库全量校验。

标准库书目生成器要求本次盘点、CSV和校验和逐文件一致，作者overrides也只能引用本次文件。首次697份和本轮8份均分别准备输入；不能将原CSV与当前705份盘点混用，也不能将128条全库证据全部传给8份增量批次。普通输出保留本地，`--public-only` 输出可上传子集：

```sh
python3 scripts/library-catalog.py \
  --inventory /path/to/inventory.json \
  --catalog /path/to/书名目录.csv \
  --checksums /path/to/SHA256SUMS \
  --epub-metadata /path/to/epub-metadata.json \
  --author-overrides /path/to/batch-author-overrides.json \
  --public-only --output .tmp/library/public-catalog
python3 -m unittest discover -s tests -p 'library_*test.py'
```

生成器拒绝扫描错误、文件与CSV不一致、重复校验、含糊路径、错版本核对记录及短编号冲突。`upload-files.txt` 使用rclone实际虚拟路径，传给Windows上传脚本。它不会上传原始私人清单。

封面和网页初次准备使用 `scripts/prepare-library-books.py`，离线安装 `pillow`、`pymupdf`：

```sh
python3 scripts/prepare-library-books.py \
  --catalog .tmp/library/catalog/catalog.json --source /path/to/Books \
  --covers .tmp/library/covers --content .tmp/library/website-content \
  --report .tmp/library/preparation.json
```

它遵守同一公开选择规则；不执行书内脚本，不改变原文件。长Windows文件名可用原生临时副本配合 `--source-overrides`，不改原名。先审查准备结果、上传和校验封面／文件，再将选中Markdown放入 `src/content/ebooks/imported/`。离线Python依赖不进入网站或CI构建。

## 分享与在线阅读

当前使用公开R2自定义域名，匿名访问；尚未实施每日配额、登录要求、Worker限频或站内阅读器。按作者意愿先观察请求量和使用情况。Cloudflare基础防护与按用户下载配额不是同一种机制。

PDF链接新标签页交给浏览器查看器，保留Range／206和服务端权限检查。EPUB由EPUB.js分页，MOBI／KF8由固定版本Foliate解析器处理，不改原文件。宽屏双页、窄屏单页，支持正文左右点击、键盘及滚轮；目录在侧栏展开，关闭头固定，手机可点击外部关闭。书内脚本禁止、HTML清理、资源白名单、CSP及iframe沙箱同时生效。

若后续增加轻量保护，建议只处理明显突发行为，保留正常下载、重试和断点续传；不要把每次PDF Range都算作下载一本书。[Workers限速binding](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)按Cloudflare位置近似计数，不能当严格全球配额。[R2 Workers API](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)可用于统一网关；需要网关规则覆盖全部访问时，不能继续保留可绕过规则的公开直链。[预签名URL](https://developers.cloudflare.com/r2/api/s3/presigned-urls/)过期前可重复使用，也不是一次性下载凭证。网页阅读会把内容发送给浏览器，不承诺无法保存。
