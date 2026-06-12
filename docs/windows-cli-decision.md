# Windows 本地百度网盘 CLI 决策

## 结论

MVP 默认使用 `BaiduPCS-Go v4.0.1` 作为 Windows 本地 CLI 后端。

- 推荐 CLI：BaiduPCS-Go v4.0.1
- 来源：GitHub Release `qjfoidnh/BaiduPCS-Go`
- 本机运行位置：`tools/baidu-cli/BaiduPCS-Go/`，目录已忽略，不提交 exe
- 适合自用 MVP：是
- 适合公开产品默认内置：谨慎，需要继续审查登录方式、协议稳定性和合规边界
- 真实操作根目录：`盘姬测试/`

## 登录态说明

本机 smoke 显示 BaiduPCS-Go 已可执行，并且 `who` 命令返回登录状态。登录态来自 BaiduPCS-Go 自身配置目录：

```text
%APPDATA%/BaiduPCS-Go
```

已确认本项目没有执行：

- 读取 Chrome cookie
- 读取 CK / BDUSS
- 读取浏览器 User Data
- 抓 Network
- 导出 HAR

`npm run smoke:local-cli -- --relogin` 不会默认退出登录；需要额外显式确认参数后才会进入 CLI 官方登录流程。

## 能力矩阵

| CLI | Windows 原生 | 登录方式 | 需要手动 Cookie/BDUSS | 文件管理 | 分享链接转存 | 提取码 | 创建分享 | JSON 输出 | 风险等级 | 自用 MVP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BaiduPCS-Go | 是 | CLI 官方登录 / 已有 CLI 配置 | 非必须；若要求手动凭据则只标记 | ls/mkdir/upload/download/mv | 命令存在，仍需用户自有测试链接验证 | 支持 | smoke 可生成分享 | 未确认 | medium | 推荐 |
| BaiduPan-cli | 待确认 | unknown | 待确认 | 待确认 | 待确认 | 待确认 | 待确认 | 待确认 | high_manual_cookie_only | 不优先 |
| baidu-pcs-cli-rs | 待确认 | unknown | 未确认 | 待确认 | 待确认 | 待确认 | 待确认 | 待确认 | medium | 备用 |
| bypy | 是，Python | web authorization | 否 | list/upload/download/sync | 不支持核心转存 | 不支持 | 不支持 | 部分 | low | 不适合核心闭环 |
| bdpan | Windows 需 WSL | OAuth skill | 否 | 支持 | 支持 | 支持 | 支持 | 支持 | low/WSL 约束 | 高级备用 |

## Smoke 结论

当前已验证：

- detect/version/help: pass
- whoami: pass，账号信息不记录
- ls/mkdir/upload/rename/mv: pass
- share: pass，真实链接和提取码不记录
- transfer: `blocked_missing_test_share`，没有可写入报告的用户自有测试分享链接；自造分享输出未解析出可复用链接

因此 UI 和文档必须显示“分享链接转存未验证”，不能把完整核心闭环标成已完成。

## 推荐实现策略

1. Windows 桌面 MVP 默认走本地 CLI 模式。
2. 前端只展示状态和触发动作，不直接执行系统命令。
3. CLI 命令必须用参数数组执行，禁止 shell 拼接。
4. stdout/stderr 进入 UI 或文档前必须脱敏。
5. 真实网盘操作只允许在 `盘姬测试/` 下执行。
6. 如果 CLI 必须 Cookie/BDUSS，只标记 `high_manual_cookie_only`，不自动提取。
7. transfer 只有拿到用户自有测试分享链接后才能宣称真实通过。
