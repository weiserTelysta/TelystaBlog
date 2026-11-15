---
name: telysta-deepseek-collaboration
description: Delegate bounded Telysta reviews and documentation tasks to the owner's logged-in DeepSeek Harness desktop application from WSL. Use when DeepSeek collaboration is requested; keep authentication, private data, migrations and release operations with the supervising agent.
---

# DeepSeek 协作

作者希望持续使用 DeepSeek Harness 辅助，而不是每次重新询问 API Key。当前 Windows 桌面版账号已经登录；WSL 可通过桌面内置 CLI 调用。账号模式与 API Key 模式不同。

## 适合交出的工作

用途命名与中英文文案、指定公开源码的 UX/可访问性审查、测试场景建议、文档一致性核对。指定清楚的问题、文件名单和报告要求，监督代理复核事实后再实现。不要把整座项目或未完待办笼统丢给它。

## 调用

在项目根目录准备一份任务文本（建议 `.tmp/`），使用 [scripts/review.py](scripts/review.py)：

```bash
python3 .agents/skills/telysta-deepseek-collaboration/scripts/review.py \
  --app '/mnt/c/Users/weise/AppData/Local/Programs/DeepSeek Harness/DeepSeek Harness.exe' \
  --task .tmp/dsh-task.txt --output .tmp/dsh-review \
  DESIGN.md workers/console/public/index.html workers/console/public/style.css
```

助手只复制列出的公开文件到一个新的 Windows 临时工作目录，并保留路径。该目录不是操作系统安全沙箱；任务明确要求不读目录以外文件、不联网、不修改源文件，只生成 `review.md`。日志与报告保存到指定忽略于 Git 的 `.tmp/` 目录。不要附加 `.env`、`.dev.vars`、认证文件、私有目录、电子书正文或用户数据。

桌面 CLI 的 headless profile 默认关闭 `credentials`、`authorization`、`deepseek-account`。脚本用无密钥 patch 启用这三个已有服务，并选择 `deepseek-account / deepseek-flash`。用 `.cmd` 设置 Windows 的 `ELECTRON_RUN_AS_NODE=1`；仅设置 Linux 环境变量不会可靠传入 Windows 进程。不会修改用户的全局 profile 或读取令牌。

## 判断结果

- 必须进程成功退出且报告非空，才能说任务完成；启动窗口、生成日志或写了任务文件均不算。
- 复核报告对应的源码；模型推断不能替代测试，不能把建议写成已实现功能。
- 登录失效先核对 profile 与模型路由；只作一次有依据的重试，仍失败就报告具体错误并继续主任务。需要用户重新登录时不索取账号密码。
- 不启用 Live 或额外高权限，不交出 Cloudflare/GitHub/SMTP 凭据。数据写入、权限变更、生产发布由主代理执行。
- 如果以后改 API 模式，凭据只保存在私有环境/Secret，不能写进 Skill、任务、日志或 Git。

依据：[官方 headless credentials 文档](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/bundle/headless/README.md#credentials)。桌面安装路径变更时通过 `--app` 更新，不重新安装另一个 Harness 来覆盖桌面账号。
