# 百度网盘批量处理工具

本项目是一个本地桌面软件的 MVP 骨架，用于批量处理百度网盘分享链接：导入链接、规则分类、任务队列展示、结果导出，并为后续接入官方 OAuth、`bdpan` CLI 和开放能力预留适配层。

## 当前状态

- 已建立 React + Vite + TypeScript 项目基线。
- 已实现批量链接解析、规则分类、敏感字段脱敏、CSV 导出、mock `StorageAdapter`。
- 已新增 `bdpan` CLI 适配层、本地桥接服务、能力检测和 Mock 回退。
- 已提供 SQLite schema 草案与安全扫描脚本。
- UI 目前是可运行的本地工作台原型；当前机器未检测到可用 `bdpan`，默认显示“当前接入：Mock”。

## bdpan CLI 接入边界

- Windows 原生不直接运行 `bdpan`，需要通过 WSL 调用。
- 前端 React 不直接执行系统命令，只调用本机桥接服务。
- 桥接服务命令：`npm run bridge:bdpan`。
- 自动化输出固定在百度网盘应用数据范围：`我的应用数据 / bdpan / panjie`。
- 如果 `bdpan share` 能力不可用，任务仍可完成转存、分类、重命名，分享结果显示“分享接口不可用 / 需开通”。
- 百度网盘 MCP 当前只作为后续备用适配方向；现阶段优先验证 `bdpan` CLI。

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
npm run bridge:bdpan
npm run dev
```

## 下一步

1. 在 WSL 内安装并登录 `bdpan`，实测 `whoami / transfer / ls / rename / mv / share`。
2. 把本地桥接服务收进 Tauri 或 Electron 主进程。
3. 将 SQLite schema 接到本地任务存储。
4. 二期再接 OCR / QR 检测 worker。
