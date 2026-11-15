# Cloudflare渐进构建

2026-11-15：账户后台与书库网关已独立部署到Workers；核实主域名CNAME现已指向 `telystablog.pages.dev`，Pages自定义域状态active。公开静态站由Cloudflare Pages提供，GitHub Pages流水线暂时保留作为回退来源。项目保持Astro静态输出，不把文章运行时、文件和认证迁往同一个进程。

Cloudflare Pages项目 `telystablog` 已连接 `weiserTelysta/TelystaBlog`，配置保存在 `infra/cloudflare/pages-project.json`：Node22，`npm run check`，产物 `dist/`，不把R2或SMTP密钥交给静态构建。2026-11-15核实首个部署 `547ed210-302b-49d9-aeb9-01ffddac5079` 已成功，构建提交为 `0559042fe03317fdfa17d036ededa9b39f69db15`。后续推送会由两边分别构建，不能把旧提交的成功当作新代码已上线。`telystablog.pages.dev`用于静态核验，账户和网关的允许来源保持主域名 `telysta.com`。

初期API创建Git项目返回401／8000011，控制台一度无法读取分支。用户在控制台完成关联并创建上述项目后，拉取、构建、部署均成功。GitHub Pages已启用不会阻止Cloudflare Pages；不要为分支选择器报错而删除GitHub站点。若连接再次失效，再按[官方GitHub集成说明](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#install-and-authorize-the-app)核对安装与操作者授权，而不是反复创建重复项目。

后台仍独立使用 `workers/console/` 与 `workers/library-gateway/` 的配置、迁移和Secret；主站构建不扫描远端R2，也不把私人书目打入静态产物。Git push、Pages构建、Worker部署和R2文件写入分别报告结果。
