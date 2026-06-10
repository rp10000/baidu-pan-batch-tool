# 用户需要准备的本地材料

本文件是进入 Phase 3.3 前的用户准备清单。不要把真实敏感信息发给聊天，只在本机 `.env.local` 或后续桌面 UI 中填写。

## A. 百度开发者应用信息

用户需要在百度开发者平台准备：

- App Key / API Key。
- Secret Key。
- 授权回调地址 `redirect_uri`。
- 应用名称。
- 应用类型。
- 已开通或可申请的百度网盘相关能力。
- scope 权限范围，先按开发者平台实际展示为准，不要硬猜。

要求：

- App Key / Secret 不要发到聊天。
- 只写入本机 `.env.local`。
- `.env.local` 必须加入 `.gitignore`。
- 截图时必须遮挡 App Key / Secret。

## B. OAuth 回调策略

方案 1：Loopback 回调，优先尝试。

```text
http://127.0.0.1:53682/oauth/callback
```

用途：桌面软件启动本地回调服务，接收 OAuth code。

注意：需要确认百度开发者平台是否允许注册 `127.0.0.1` 或 `localhost` 回调地址。

方案 2：OOB 授权码回填，作为 fallback。

```text
redirect_uri=oob
```

用途：如果本地 loopback 回调不被允许，授权页显示 code，用户复制 code 到软件。

注意：code 只能使用一次，不能写进日志。

## C. 测试目录授权

用户需要确认是否允许后续 OAuth POC 创建测试目录：

```text
盘姬测试/panjie-smoke-YYYYMMDD-HHMMSS
```

要求：

- 只操作测试目录。
- 不删除任何文件。
- 不覆盖任何原文件。
- 不操作私人资料目录。

## D. 测试文件准备

建议用户准备一个小测试目录：

```text
panjie-smoke-source/
  hello.txt
  note.txt
  sample-image.png
```

要求：

- 文件必须是用户自己创建或有权测试的内容。
- 不要放隐私资料。
- 不要放大文件。
- 不要放版权争议资源。

## E. 测试分享链接准备

后续真实转存测试需要用户准备一个自有测试分享链接和提取码。

要求：

- 不要发完整链接到聊天。
- 可以在本机 UI 或 `.env.local.test` 中填写。
- 日志和文档中必须脱敏为：

```text
shareUrl: <redacted>
extractCode: <redacted>
```

## F. 是否允许创建测试分享链接

用户需要确认：

- 是否允许软件对测试目录创建分享链接。
- 是否允许设置有效期。
- 是否允许生成提取码。

要求：只对测试目录操作，不对真实资料目录操作。

## 本地填写方式

1. 复制模板：

```powershell
Copy-Item .env.local.example .env.local
```

2. 用户手动编辑 `.env.local`：

```powershell
notepad .env.local
```

3. 用户填写：

```text
BAIDU_APP_KEY=这里填自己的
BAIDU_APP_SECRET=这里填自己的
BAIDU_REDIRECT_URI=这里填自己的
BAIDU_OAUTH_SCOPE=以开发者平台实际显示为准
BAIDU_OAUTH_FORCE_LOGIN=1

PANJIE_TEST_REMOTE_ROOT=盘姬测试
PANJIE_TEST_CREATE_FOLDER=false
PANJIE_TEST_CREATE_SHARE=false

TEST_SHARE_URL=
TEST_SHARE_EXTRACT_CODE=
```

4. 运行检查：

```powershell
npm run prep:oauth
```

## Codex 可以帮你检查什么

- 字段名是否齐全。
- redirect_uri 是否是合法 URL 或 `oob`。
- `.env.local` 是否被 git ignore。
- 报告是否脱敏。
- 是否存在危险本地凭据文件。

## 不能提交 git 的内容

- `.env.local`。
- `.env.local.test`。
- App Secret。
- OAuth code。
- 完整测试分享链接。
- 提取码。
- 任何授权凭据或明文授权状态文件。

