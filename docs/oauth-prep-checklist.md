# OAuth 准备检查清单

本清单用于 Phase 3.2.5。目标是准备百度网盘 OAuth POC 所需材料，不实现真实登录，不发起真实授权请求，不操作真实网盘文件。

## 用户需要准备什么

- 百度开发者应用：应用名称、应用类型、App Key / API Key、Secret Key、redirect_uri。
- 开发者平台展示的 OAuth scope，先按平台实际可选项填写，不硬猜。
- 是否允许后续 POC 创建测试目录：`盘姬测试/panjie-smoke-YYYYMMDD-HHMMSS`。
- 是否允许后续 POC 对测试目录创建分享链接、设置有效期、生成提取码。
- 自有小测试文件和自有测试分享链接，后续只在本机填写。

## 不应该发给聊天

- App Key / API Key 原文。
- Secret Key 原文。
- OAuth code、长期授权凭据或任何授权返回内容。
- 完整测试分享链接和提取码。
- 未打码的开发者后台截图。

## Codex 可以帮用户检查什么

- `.env.local.example` 是否存在。
- `.env.local` 是否存在、字段名是否齐全、核心字段是否为空。
- redirect_uri 是否为合法 URL 或 `oob`。
- `.env.local` 是否被 git ignore。
- 是否存在危险本地凭据文件。
- 脱敏报告 `docs/oauth-preflight-report.md` 是否生成。

## 必须由用户手动完成什么

- 登录百度开发者平台并创建/确认应用。
- 在平台中确认可用 scope 和回调地址规则。
- 手动填写本机 `.env.local`。
- 后续 OAuth 授权页中的登录、扫码、授权确认。
- 是否允许测试目录和测试分享由用户明确确认。

## 不能提交 git 的内容

- `.env.local`。
- 任何 App Secret、OAuth code、授权凭据、完整测试分享链接、提取码。
- `auth-state.local.json` 之外的本地授权状态文件。
- 明文凭据文件，例如 `auth.json`、`token.json`、`ck.txt`、`chrome-cookie.json`。

