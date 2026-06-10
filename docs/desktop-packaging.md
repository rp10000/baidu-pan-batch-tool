# 桌面打包说明

## 技术路线

- 桌面壳：Electron
- 前端：React + Vite
- 打包器：electron-builder
- 输出目录：`release/`
- 图标：`public/brand-avatar.ico`

## 命令

```powershell
npm run package:win
```

该命令会先执行 `npm run build`，再生成 Windows portable 和 NSIS installer。

## 输出

预期产物：

- `release/*portable*.exe`
- `release/*Setup*.exe`

`release/` 已加入 `.gitignore`，打包产物不提交。当前未签名，Windows SmartScreen 可能提示未知发布者。

## 安全边界

打包配置只包含：

- `dist/**/*`
- `electron/**/*`
- `package.json`
- `tools/baidu-cli` 作为本机 extraResource

不包含 `.env.local`、授权材料、日志、截图或模型缓存。
