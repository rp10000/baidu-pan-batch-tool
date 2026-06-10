# 安全边界

## 禁止

生产源码和提交内容不得包含以下实现或敏感材料：

- document.cookie
- Chrome User Data
- Login Data
- Cookies SQLite
- 自动提取 cookie / CK / BDUSS
- Network 抓包
- HAR
- 隐藏接口
- access_token=
- refresh_token=
- BDUSS=
- STOKEN=
- BAIDUID=
- 真实分享链接
- 真实提取码
- `.env.local`
- `secrets/`
- `auth.json`
- `token.json`

这些词只允许出现在本安全文档的禁止项说明中。

## 允许

- CLI 自己弹出登录流程、二维码或网页授权。
- CLI 自身配置中已有登录态时，通过官方 CLI 命令检测状态。
- 用户后续手动提供自有测试分享链接，通过环境变量临时执行 smoke。

## 日志

日志、docs、截图只记录脱敏状态：

- `logged_in_redacted`
- `generated_redacted`
- `<redacted-share-url>`
- `extractCode: <redacted>`
