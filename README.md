# 盘姬批量助手

Windows 本地百度网盘批量处理客户端 MVP。当前主线是 Electron 桌面壳 + React UI + Windows 本地 CLI 适配，优先使用 BaiduPCS-Go 完成自用场景的文件操作。

## 默认流程

默认是快速转存模式：

```text
输入分享链接和提取码 -> 转存 -> 读取文件列表 -> 自动分类 -> 重命名 -> 移动 -> 创建新分享 -> 导出结果
```

快速模式不会下载文件样本，不初始化 OCR，不检查模型，不视频抽帧，不做水印处理。

## Windows 本地 CLI

- 默认接入：Windows 本地 CLI 模式。
- 当前 CLI 后端：BaiduPCS-Go v4.0.1。
- 本地真实操作限制在 `盘姬测试/` 目录下。
- React 前端不直接执行 CLI；真实命令必须走 Electron main / 本地 service / bridge。
- `tools/baidu-cli/` 是本机运行目录，已加入 `.gitignore`，不会提交 exe。
- `release/` 是打包输出目录，最终客户端优先看 portable exe 或 setup exe。

## 按需扫描

扫描/OCR/水印/引流检测默认关闭。用户勾选后才启用：

- 检查二维码：启用 OpenCV QR 检测，不需要模型。
- OCR 检查文字：需要 OCR 模型，由模型管理器检查和安装。
- 检查联系方式：手机号、邮箱、微信号、QQ 号。
- 检查引流内容：URL、扫码、加微信、进群、公众号等。
- 检查水印：当前 MVP 标记风险，复杂水印不伪造清理成功。
- 生成清理副本：只输出副本，不覆盖原始文件。
- 深度扫描：启用更慢的图片/PDF/视频抽样，视频扫描才检查 ffmpeg。

清理副本输出到 `artifacts/cleaned/<taskId>/` 或后续网盘 `盘姬测试/cleaned/<taskId>/`，不删除、不覆盖 raw 文件。

## 桌面打包

```powershell
npm run package:win
```

打包输出：

- `release/*portable*.exe`：免安装版本。
- `release/*Setup*.exe`：NSIS 安装器。

当前未做代码签名，Windows SmartScreen 可能提示未知发布者。

## 常用命令

```powershell
npm install
npm run assets:generate
npm test
npm run build
npm run security:scan
npm run e2e
npm run smoke:local-cli
npm run package:win
```

## 安全边界

- 不读取 Chrome cookie、CK、BDUSS、STOKEN。
- 不读取浏览器 User Data、`localStorage`、`sessionStorage`。
- 不抓 Network、不导出 HAR、不使用隐藏接口。
- 不把真实账号、真实分享链接、提取码、授权材料写入日志、docs、git 或截图。
- 如果 CLI 需要人工登录，只记录 `manual_auth_required`，不自动提取浏览器凭据。

## 当前限制

- BaiduPCS-Go 的 `ls/mkdir/upload/rename/mv/share` 已完成真实 smoke。
- `transfer` 命令存在，但本机自造分享未能解析为可复用测试链接；没有用户自有测试分享时报告为 `blocked_missing_test_share`。
- OCR/QR/PDF/视频扫描 worker 目前是 MVP 骨架；真实模型安装和深度水印处理留到后续阶段。
