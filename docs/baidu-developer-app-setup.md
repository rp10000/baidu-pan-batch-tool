# 百度开发者应用准备说明

本文件只说明用户需要在百度开发者平台准备的信息。Codex 不代替用户登录平台，不读取浏览器会话，不抓取开发者后台。

## 用户需要准备什么

在百度开发者平台创建或选择一个用于本地桌面软件测试的应用，并记录到本机 `.env.local`：

- 应用名称。
- 应用类型。
- App Key / API Key。
- Secret Key。
- 授权回调地址 `redirect_uri`。
- 开发者平台实际展示的 scope 权限范围。
- 已开通或可申请的百度网盘相关能力。

## 不应该把什么发给聊天

- App Key / API Key 原文。
- Secret Key 原文。
- 带完整参数的授权 URL。
- OAuth code 或授权返回内容。
- 未遮挡敏感字段的截图。

## Codex 可以帮用户检查什么

- `.env.local` 是否包含字段名。
- `BAIDU_REDIRECT_URI` 是否是 URL 或 `oob`。
- `.env.local` 是否被 git ignore。
- 文档和报告是否只包含脱敏状态。

## 必须由用户手动确认什么

- 平台是否允许 `http://127.0.0.1:53682/oauth/callback` 作为回调地址。
- 平台是否允许 `redirect_uri=oob`。
- scope 的真实名称和授权范围。
- 网盘相关能力是否需要审核、开通或付费。

## 不能提交 git 的内容

- `.env.local`。
- App Secret。
- 授权 code。
- 任何长期授权凭据或授权响应原文。

