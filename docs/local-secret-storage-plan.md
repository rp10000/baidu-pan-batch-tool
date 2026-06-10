# 本地安全存储策略

本文件定义后续真实 OAuth 登录后的本地存储边界。Phase 3.2.5 不实现真实登录，也不保存真实授权凭据。

## 允许的本地安全存储

Windows 推荐路线：

- Windows Credential Manager。
- DPAPI 加密存储。
- Tauri stronghold，如果后续采用 Tauri。
- Electron safeStorage，如果后续采用 Electron。

正式 OAuth 后允许保存的敏感项：

- access token。
- refresh token。
- expires_at。
- scope。

规则：

- 这些内容不能进入 React store。
- 这些内容不能进入 git。
- 这些内容不能输出到日志、报告、截图或导出文件。
- React 前端只显示连接状态、脱敏用户名、过期时间和能力矩阵。

## 允许的非敏感状态文件

可以生成：

```text
data/auth-state.local.json
```

内容只能类似：

```json
{
  "connected": true,
  "provider": "baidu",
  "displayNameMasked": "用户***",
  "expiresAt": "2026-xx-xxTxx:xx:xxZ",
  "scope": ["..."],
  "capabilitiesStatus": "pending"
}
```

不能包含：

- access_token。
- refresh_token。
- code。
- client_secret。
- cookie。
- ck。

## 不允许的文件

禁止在仓库或本地项目目录中生成：

- `auth.js` 写死凭据。
- `auth.json` 明文保存授权凭据。
- `token.json`。
- `chrome-cookie.json`。
- `ck.txt`。
- `network-har.json`。

如果发现这些文件，`npm run prep:oauth` 只报告文件名和风险，不读取内容。

