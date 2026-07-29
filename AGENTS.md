# AGENTS.md

## Shell

- Windows 下默认使用 PowerShell 7：`C:\Program Files\PowerShell\7\pwsh.exe`。
- 如果工具运行器启动的是 Windows PowerShell 5.1，在涉及脚本语义、编码、管道或版本差异时显式调用 PowerShell 7。

## Workspace Boundary

- 本仓库是 UnicodeArtJs 公开主仓；`work-zone/` 是被根 `.gitignore` 排除的私有工作区，并由独立私有仓库管理。
- 内部规划、任务状态、AI 日志、阶段草案和过程性备忘默认写入 `work-zone/`，不要写入公开 README、公开 docs 或包级 README。
- 公开文档应采用面向使用者和二次开发者的项目文档风格，避免出现内部开发过程、AI 协作、阶段推进口吻或未整理的规划内容。

## Context Continuity

- 长任务开始、上下文恢复、崩溃后继续、阶段切换或用户说“继续推进”时，必须先读取 `work-zone/TASK_STATE.md`。
- 读取任务账本后，再检查主仓和 `work-zone/` 的 `git status`、相关阶段规划、最近 evidence/test 结果；不得只依赖会话摘要或 goal 文本继续执行。
- `work-zone/TASK_STATE.md` 至少维护：当前目标、完成条件、当前里程碑、已完成项及验证证据、失败尝试及原因、下一项唯一动作、最后代码状态、连续无进展次数、已放弃/后延事项。
- 每完成一个可验证里程碑、提交/推送关键变更、遇到失败并改变方案、或准备结束长任务前，必须更新 `work-zone/TASK_STATE.md`。
- 不得重复执行 `TASK_STATE` 中已标记 `completed`、`abandoned` 或 `deferred` 的步骤，除非用户明确要求重做，或实际文件/测试结果证明记录已失效。
- 反循环熔断：连续两轮没有新增代码、文档、测试结果或 evidence，或同一命令/同一方案因同一原因重复失败两次，应暂停推进并向用户报告。

## Project Rules

- HIA-Documentation-Sys 通知采用拉取机制；新阶段、恢复或文档化相关任务前，应主动读取 `K:\Project\Github_mandolin\HIA-Documentation-Sys\work-zone\notify\`。
- 自 2026-07-29 起，新增或结构性修改的代码必须严格遵守 `work-zone/docs/hia-rop-bilingual-comment-policy.md` 与 HIA《项目初始化指南》第 7 节：每个代码语义节点均有紧邻、完整且语义对等的中英双语文档化注释；节点内部的流程块、基本每个非显然局部变量和每句非明显自明语句均有紧邻的中英双语普通注释。注释必须解释职责、意图、状态变化、约束或风险，不能机械复述 token。JS/TS 使用既有合法的 `@lang zh-CN`、`@lang en` 与 inline `<lang>` 形式；不得因提取器、DLR 或术语 parser 尚未冻结而遗漏语言侧或发明临时标签。修改旧模块须执行 touch-improve，补齐本次触及的模块职责、公共 API 与关键不变量。
- 存量注释的全量治理不回填为已完成的 P24/P25；其 coverage inventory 与一至两个独立治理周期的立项时机已登记为 deferred，须在合适节点由维护者确认后另行规划。
- 新增第三方依赖前必须先记录用途和许可证；核心默认优先 MIT、Apache-2.0、BSD、ISC、OFL 等宽松许可。
- 如果发现主仓或 WorkZone 已积累较多有效改动但尚未提交，应提醒维护者考虑分批提交。
- 对较大任务记录连续时间片日志，优先写入 `work-zone/ai/codex/chatlog/YYYY-MM-DD/`；日志记录可公开的工程过程、关键判断和验证结果，不记录私有思维链。
