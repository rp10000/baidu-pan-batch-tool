# Windows 本地百度网盘 CLI 决策

## 结论

Phase goad Windows CLI 路线推荐优先使用 `BaiduPCS-Go` 作为自用 MVP 的本地 CLI 适配目标。

- 推荐 CLI：`BaiduPCS-Go v4.0.1`
- 来源：GitHub Release `qjfoidnh/BaiduPCS-Go`
- 下载位置：`tools/baidu-cli/BaiduPCS-Go/`，该目录已加入 `.gitignore`
- 适合自用 MVP：是
- 适合公开产品默认内置：谨慎，需要进一步审查登录方式、协议稳定性和合规边界
- 核心闭环：文件管理和创建分享已 smoke；分享链接转存命令存在，但仍需要用户自有测试分享链接验证

## 本机发现结果

PATH 中未发现：

- `BaiduPCS-Go`
- `baidupcs-go`
- `BaiduPan-cli`
- `baidupan-cli`
- `baidu-pcs-cli-rs`
- `bypy`
- `bdpan`

已从 GitHub Release 下载：

- `BaiduPCS-Go-v4.0.1-windows-x64.zip`
- 解压后可执行文件：`BaiduPCS-Go.exe`
- 版本输出：`BaiduPCS-Go version v4.0.1`

## 能力矩阵

| CLI | Windows 原生 | 登录方式 | 是否需要 Cookie/BDUSS | 文件管理 | 分享链接转存 | 提取码 | 创建分享 | JSON 输出 | 风险等级 | 自用 | 公开产品 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BaiduPCS-Go | 是 | account_prompt / manual_cookie | 非必须，但支持手动凭据登录 | ls/mkdir/upload/download/mv | 命令存在，待测试链接验证 | 支持参数/整合链接 | 命令存在，smoke 显示可生成 | 未确认 | medium | 适合 | 谨慎 |
| BaiduPan-cli | 待确认 | unknown | 待确认 | 待确认 | 待确认 | 待确认 | 待确认 | 待确认 | high_manual_cookie_only | 不优先 | 不推荐 |
| baidu-pcs-cli-rs | 是/待下载验证 | OAuth / config 类，待确认 | 未确认 | ls/upload/download 等 | 未确认 | 未确认 | 未确认 | 待确认 | medium | 备用 | 谨慎 |
| bypy | 是，Python | web authorization | 不需要手动 Cookie | list/upload/download/sync | 不支持核心转存 | 不支持 | 不支持 | 部分 | low | 只适合文件同步 | 不适合核心闭环 |
| bdpan | Windows 原生未确认 | OAuth skill | 不需要手动 Cookie | 支持 | 支持 | 支持 | 支持 | 支持 | low/WSL 约束 | 备用 | WSL 高级模式 |

## BaiduPCS-Go smoke 结果

详见 `docs/windows-cli-smoke-report.md`。

当前结果：

- CLI 检测：pass
- version：pass
- help：pass
- whoami：pass，账号信息已脱敏
- ls / mkdir / upload / rename / mv：pass
- share：pass，真实分享信息未记录
- transfer：skipped_missing_test_share，等待用户自有测试分享链接

## 推荐实现策略

1. 本地软件默认保留官方能力路线，但为自用 MVP 增加 `Windows 本地 CLI 模式`。
2. React 前端不直接执行系统命令，只展示状态和触发本地 service/bridge。
3. 本地 CLI 命令必须使用参数数组执行，禁止 shell 拼接。
4. 所有 stdout/stderr 必须脱敏后进入报告或 UI。
5. 真实操作只允许在 `盘姬测试/` 下执行。
6. 如果 CLI 要求手动 Cookie/BDUSS，只标记 `high_manual_cookie_only`，不自动提取。
7. 分享链接转存必须等用户提供自有测试分享链接后再验证，不得伪造成功。

## 剩余阻塞

- 需要用户提供自有小测试分享链接和提取码，用于验证 `transfer`。
- 需要确认 `share` 在不同账号、不同目录和有效期设置下是否稳定。
- 需要确认 CLI 登录态是否可通过本地 bridge 安全管理，不把账号或授权材料写入日志。

