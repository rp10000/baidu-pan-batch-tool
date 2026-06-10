# 百度网盘批量处理工具

本项目是一个本地桌面软件的 MVP 骨架，用于批量处理百度网盘分享链接：导入链接、规则分类、任务队列展示、结果导出，并为后续接入官方 OAuth / OpenAPI 预留 `BaiduAdapter` 能力矩阵。

## 当前状态

- 已建立 React + Vite + TypeScript 项目基线。
- 已实现批量链接解析、规则分类、敏感字段脱敏、CSV 导出、mock `BaiduAdapter`。
- 已提供 SQLite schema 草案与安全扫描脚本。
- UI 目前是可运行的本地工作台原型，真实百度 OAuth、转存、创建分享链接尚未接入。

## 合规边界

- 只走百度官方授权和开放能力。
- 不采集百度账号密码。
- 不读取浏览器 cookie、localStorage 或隐藏请求凭证。
- 不做提取码破解、验证码绕过、限流规避、风控绕过。
- 水印/二维码/联系方式检查默认只做标记与人工确认；替换功能必须限制在用户自有或已获授权素材上。

## 常用命令

```powershell
npm install
npm test
npm run build
npm run security:scan
npm run dev
```

## 下一步

1. 用百度网盘开放平台账号实测能力矩阵。
2. 接入 Tauri 壳和系统安全凭据存储。
3. 将 SQLite schema 接到本地任务存储。
4. 二期再接 OCR / QR 检测 worker。
