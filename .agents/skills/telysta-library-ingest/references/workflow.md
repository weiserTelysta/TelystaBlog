# 新书批次、R2 与网站发布

## 准备小批次

1. 列出用户本次指定的原文件，先读取元数据、文件大小并核对 SHA-256。截图只能帮助辨认范围，不能作为文件实际存在或授权全部上传的证据。
2. 对照原书库、当前网站 ID 和 R2 已有对象，识别逐字节重复、同名不同版本及多格式。原件保留原位。
3. 为本批次准备独立临时目录、原生盘点、CSV 与校验清单；临时目录可按已核实的中图法路径复制指定新书。先解决书目缺项，再上传；不把未分类根目录中的其他书顺带加入。
4. 现有 `library-catalog.py` 严格要求盘点与CSV逐文件相等，校验清单不能含多余路径，作者 overrides 也必须仅引用该盘点里的文件。增量批次应使用本批次输入／证据；不要直接用旧697行CSV匹配变化后的整个 Books，也不要给几本新书套用所有全库 overrides。若改进增量工具，先实现并验证，再执行外部写入。
5. 审查生成的 `catalog.json`、中文补全CSV和公开选择结果。只把获准公开的记录交给下一步；完整个人目录和原 `_manifest.csv` 留在本地。

本地工具文档与示例在 `docs/library.md`。命令中使用真实的批次路径，不能把历史 `.tmp/library-2026-11-14/` 当作永远存在的输入。

## R2 复制与封面

Windows rclone remote 目前名为 `r2`，配置在 `%APPDATA%\rclone\rclone.conf`；可以检查 remote／endpoint 与桶是否匹配，不输出配置中的认证字段。工具可通过 Windows PATH、WinGet 安装目录发现，不能假定仓库携带 rclone。

公开URL规则：`https://library-files.telysta.com/` 加真实对象 key，逐路径段进行URL编码并保留 `/`。不要把本地绝对路径或 S3 API 端点写进网页。全角冒号等字符可能被 rclone 转义／规范化，上传后以远端实际 key 为准；用明确匹配关系核对，不凭相似文件名拼链接。

`scripts/sync-r2-library.ps1` 要求 `-Source` 和 `-FilesFrom`，名单为相对该 Source 的实际 rclone 路径，桶内目标默认 `r2:telysta-library/books`。先 dry-run 看看只包含本批次，然后在已有上传授权内执行 `-Apply`。它使用 copy，不删除远端；不要改成 sync，也不要使用全库通配上传代替批准名单。

脚本还会枚举 Source 并对其中四格式计算本地 SHA-256，远端 check 只比较名单所选对象。因此增量场景宜使用只含本批次的临时 Source，避免重新读取整个大书库。

封面从 EPUB 声明的封面、Kindle 元数据或 PDF 首页生成，保持原图比例，最大320×480，WebP；遇到特别长的 Windows 文件名，用 Windows 原生复制出临时短路径，配合 `--source-overrides`，不改原文件。只上传本批次审查通过的封面：

- R2 key：`covers/<生成物完整SHA-256>.webp`。
- Content-Type：`image/webp`；内容寻址文件可设 `Cache-Control: public,max-age=31536000,immutable`。
- PDF：`application/pdf`；EPUB：`application/epub+zip`；其他格式按文件真实类型设置。不要因为没有网页阅读器而把全部书籍预加载到列表。
- 当前 PDF 可由浏览器打开。未部署站内 EPUB 阅读器和下载次数配额；不要把这些未来能力写成已经存在。

## 验证与恢复

将批准名单与远端 key／大小逐项对账。rclone 对 R2 可用的MD5比较不等于远端完整SHA-256；报告实际使用的哈希算法，保留本地SHA-256。大文件的多段ETag不自动视为MD5，可用工具报告的实际hash或下载校验。

验证真实对象链接而非桶根目录：匿名GET、封面MIME，PDF以小Range请求确认206和Content-Range。此域名曾对默认脚本UA返回1010，正常浏览器UA可访问；应结合真实浏览器确认，不因脚本403擅自关闭防护。跨域站内阅读器另需CORS配置，这不属于普通书目入库的默认步骤。

失败后先核对状态、日志与已完成对象，有限重试同一批准批次；认证失败、路径无法无歧义绑定或书目不一致时，停止依赖写入并报告，继续不依赖它的本地准备。不要以重新上传全库、换桶或删除旧对象试错。确需回滚时只处理本批次确实新建的对象，并遵守当前任务授权，不动原书或其他书籍。

## 哪些进入 Git

提交：本批次书目Markdown、必要的作者／显示证据、为本任务修改的代码／测试／文档。封面和电子书二进制上传R2，不加入Git；原始扫描清单、认证、临时批次、私人设备路径与下载来源不提交。

不要覆盖其他人在编辑的文章、目录移动或书目。只 stage 本次明确修改的文件，检查 diff 后提交。依次验证 `npm run content:check`、适用的测试与 `npm run check`；上传工具变动执行 `python -m unittest discover -s tests -p 'library_*test.py'`。使用符合 `package.json` engines 的 Node，离线封面工具依赖不进入网站 CI。

Git commit、Git push、R2上传、网站部署是四种不同结果。上传文件不会自动生成书架；提交MD但未部署也不会改变线上页面。用户只授权整理或写Skill时停在可审阅结果，不执行新书发布。已授权发布则推送后检查 `.github/workflows/deploy.yml` 的实际运行状态，并抽查线上书籍、分类与链接。

更新公开审计清单时，批次清单使用独立前缀；只有确实合并并核验全量公开书目时才更新全库 `catalog/latest.json`。不要上传含未公开条目的全量个人清单。
