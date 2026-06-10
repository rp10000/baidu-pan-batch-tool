# 百度网盘批量处理工具产品评审

## 结论

先做“合规批量处理与结果导出工具”，不要在 MVP 阶段做“自动清洗资源并重新分发”的完整闭环。

## Must-fix

- 只使用官方 OAuth / OpenAPI 授权链路。
- 不采集账号登录信息，不读取浏览器会话数据，不复用非公开请求凭证。
- 遇到失效、违规、风控、验证码、容量不足、权限不足、限流等状态时，只标记失败或进入人工处理。
- 日志、SQLite、导出文件中不得输出登录敏感信息或实际授权凭证。
- 自动替换或遮盖水印默认关闭，只允许在用户确认其拥有权利的素材上启用，并保留原文件备份。

## Nice-to-have

- XLSX 导出。
- OCR / QR 本地扫描 worker。
- 视频抽帧检测。
- 检测报告坐标可视化。
- 批量替换前后对比和撤销。

## MVP 范围

| 模块 | MVP 内容 |
| --- | --- |
| 批量导入 | 粘贴多行、解析链接/提取码/备注、去重、错误提示 |
| 授权登录 | 仅预留官方 OAuth；真实凭证接入前不保存任何长期凭证明文 |
| 任务队列 | 待处理、处理中、成功、失败、需人工、已跳过 |
| 分类 | 文件名、扩展名、目录名、关键词规则分类 |
| 导出 | CSV / JSON 优先，XLSX 二期 |
| 审计 | SQLite schema 中只保存脱敏错误和审计消息 |
| UI | 表格工作台、导入区、授权状态、能力矩阵、结果导出 |

## 非目标

- 自动破解或补全提取码。
- 非公开链路、流量复用、会话注入。
- 多账号池、批量切号、规避限流。
- 大规模全量下载后扫描。
- 自动去除第三方水印。
- 自动替换二维码/联系方式并重新分发。

## StorageAdapter 能力矩阵

每个能力必须明确为 `supported`、`unsupported`、`needs_official_verification`：

```text
checkLogin
transferSharedLink
listFiles
createDirectory
renameFile
moveFile
downloadFile
uploadFile
createShareLink
```

## Phase 3.2 接入路线

- 产品主线改为 Windows 原生官方能力：官方 API / MCP / SDK。
- `bdpan` 只保留为 WSL 高级模式，不作为普通 Windows 用户默认依赖。
- 所有自动化输出仍限制在 `我的应用数据 / bdpan / panjie` 或官方能力允许的应用数据范围。
- 分享创建不可用时，任务结果进入“分享接口不可用 / 需开通”的降级状态。
- 下一步先验证官方能力是否支持“分享链接转存”和“创建分享”，再决定真实适配器优先级。

## Success criteria

- 100 条混合文本中，链接与提取码解析准确率达到 99% 以上。
- 同一分享链接重复导入只生成一条主任务。
- 不要求用户输入账号密码。
- 日志、SQLite、导出文件不出现登录敏感信息或实际授权凭证。
- 任务队列支持暂停、恢复、失败重试、崩溃后恢复。
- 基于规则的文件类型分类准确率达到 80% 以上，其余进入“未分类”。
- 每条任务都有明确状态、原因、目标路径或人工处理建议。

## Codex next actions

1. 以 Windows 原生官方能力作为产品主线，验证官方 API / MCP / SDK 是否支持分享链接转存。
2. 将 `bdpan` 保留为 WSL 高级模式，不作为普通 Windows 用户默认依赖。
3. 将当前本机桥接服务迁入 Tauri 或 Electron 主进程。
4. 将当前 mock 队列替换为真实 TaskQueue。
5. SQLite schema 接入本地持久化。
6. 二期接 OCR / QR 检测；替换功能保持默认关闭。

Phase 3.2 之后的详细路线见 `docs/windows-native-integration-plan.md` 和 `docs/windows-native-capability-matrix.md`。
