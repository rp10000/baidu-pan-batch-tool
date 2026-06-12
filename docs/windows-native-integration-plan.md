# Windows 原生接入路线

## 目标

产品目标是 Windows 桌面版，而不是 WSL 工具。普通用户应安装 Windows `.exe` 后直接使用桌面应用，不应被要求先安装 Ubuntu、WSL 或 `bdpan`。

## 接入模式

| 模式 | 定位 | 默认 |
| --- | --- | --- |
| Windows 原生官方模式 | 产品主线，优先验证百度网盘开放平台、官方 MCP、官方 SDK 能力 | 是 |
| 百度网盘 MCP 模式 | 官方 MCP 能力验证路线，适合文件管理、搜索、上传和创建分享链接验证 | 否 |
| 百度网盘 SDK 模式 | 官方 SDK / OpenAPI 路线，适合桌面后端服务或 Tauri/Electron 主进程集成 | 否 |
| bdpan WSL 高级模式 | 高级/实验通道，仅适合已经配置 WSL + bdpan 的用户或内部验证 | 否 |
| Mock 演示模式 | 演示、测试和无账号开发，不做真实转存 | 否 |

## 推荐架构

```text
Windows Desktop App
  ├─ Tauri / Electron
  ├─ React UI
  ├─ Windows Local Bridge
  │   ├─ WindowsNativeAdapter
  │   ├─ BaiduMcpNativeAdapter
  │   ├─ BaiduSdkAdapter
  │   ├─ BdpanWslAdapter
  │   └─ MockAdapter
  ├─ Processing Pipeline
  │   ├─ 链接解析
  │   ├─ 官方能力转存 / WSL bdpan 转存 / 人工降级
  │   ├─ 读取文件列表
  │   ├─ 文件分类
  │   ├─ 重命名
  │   ├─ 移动归档
  │   ├─ 风险扫描
  │   ├─ 清理后上传
  │   └─ 创建新分享链接
  └─ Local Workers
      ├─ OCR
      ├─ QR
      ├─ 图片水印检测
      ├─ PDF 渲染
      └─ 视频抽帧
```

## Phase 3.2 结论

- `bdpan-storage` 明确支持 Windows WSL，不支持 Windows 原生，因此不能作为普通 Windows 用户默认依赖。
- 百度网盘开发者 Skill 页面公开展示了上传、下载、分享、搜索、移动等 Agent 能力，并说明发送分享链接和提取码可转存并下载；这更像 Skill / Agent 通道，不等同于可直接嵌入 Windows 桌面版的原生 API。
- 百度网盘 MCP 公开能力包含用户信息、容量、目录读取、创建目录、复制、移动、重命名、本地上传、URL 上传、文本上传、搜索、创建分享链接；公开表格中未明确列出“从别人分享链接直接转存到自己网盘”能力。
- 百度网盘 Go SDK 公开能力包含 OAuth、用户信息、容量、目录列表、搜索、上传、下载、复制、移动、重命名、删除、创建目录；公开 README 中未明确列出“分享链接转存”或“创建分享链接”的 SDK 方法。

## 后续阶段

### Phase 3.3：Windows 原生官方 POC

只验证官方能力，不做 OCR：

```text
授权
用户信息
容量
列表
创建目录
重命名
移动
创建分享链接
```

核心问题：

```text
官方 Windows 原生能力是否支持“分享链接转存”。
```

### Phase 3.4：真实转存路径决策

| 结果 | 产品路线 |
| --- | --- |
| 官方 Windows 原生支持分享链接转存 | 进入真实 Windows 原生转存闭环 |
| 官方 Windows 原生不支持，但 bdpan WSL 支持 | 产品拆成普通模式和高级模式 |
| 两边都不能稳定支持 | MVP 改为“用户先手动转存，软件负责分类、扫描、重命名、导出分享” |

## 安全边界

- 不读取账号登录信息、浏览器会话数据或私有凭据。
- 不把 OAuth 凭证、授权码、真实分享链接或真实提取码写入源码、日志、报告或导出文件。
- `bdpan WSL` 仅在用户主动选择高级模式且本机已配置时启用。
