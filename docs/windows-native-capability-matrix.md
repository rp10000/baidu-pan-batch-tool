# Windows 原生能力矩阵

更新时间：2026-06-10

## 核查来源

- 百度网盘开发者 Skill 页面：`https://pan.baidu.com/apaastobui/developer#/developer/skill`
- 百度网盘 MCP：`https://github.com/baidu-netdisk/mcp`
- 百度网盘 Go SDK：`https://github.com/baidu-netdisk/baidu-drive-sdk-go`
- bdpan-storage：`https://github.com/baidu-netdisk/bdpan-storage`

## 状态定义

| 状态 | 含义 |
| --- | --- |
| `supported` | 公开资料明确覆盖该能力 |
| `unsupported` | 公开资料明确不支持 |
| `needs_official_verification` | 公开资料未足够证明，需要官方控制台或 POC 验证 |
| `paid_required` | 可能需要开通或付费能力，需验证 |
| `manual_required` | 需要人工确认或产品降级 |
| `wsl_only` | 仅 bdpan WSL 高级模式可用 |
| `mock_only` | 仅演示，不真实执行 |

## 模式矩阵

| 能力 | Windows 原生官方 | 百度网盘 MCP | 百度网盘 SDK | bdpan WSL 高级 | Mock |
| --- | --- | --- | --- | --- | --- |
| 授权登录 | `needs_official_verification` | `needs_official_verification` | `needs_official_verification` | `wsl_only` | `mock_only` |
| 获取用户信息 | `needs_official_verification` | `supported` | `supported` | `wsl_only` | `mock_only` |
| 获取容量 | `needs_official_verification` | `supported` | `supported` | `wsl_only` | `mock_only` |
| 读取目录 | `needs_official_verification` | `supported` | `supported` | `wsl_only` | `mock_only` |
| 创建目录 | `needs_official_verification` | `supported` | `supported` | `wsl_only` | `mock_only` |
| 从分享链接转存 | `needs_official_verification` | `needs_official_verification` | `needs_official_verification` | `wsl_only` | `mock_only` |
| 读取转存后文件列表 | `needs_official_verification` | `supported` | `supported` | `wsl_only` | `mock_only` |
| 重命名 | `needs_official_verification` | `supported` | `supported` | `wsl_only` | `mock_only` |
| 移动 | `needs_official_verification` | `supported` | `supported` | `wsl_only` | `mock_only` |
| 下载到本地扫描 | `needs_official_verification` | `manual_required` | `supported` | `wsl_only` | `mock_only` |
| 上传清理后文件 | `needs_official_verification` | `supported` | `supported` | `wsl_only` | `mock_only` |
| 创建新分享链接 | `needs_official_verification` | `needs_official_verification` | `needs_official_verification` | `paid_required` | `mock_only` |

## 当前核查结论

### 百度开发者 Skill 页面

页面可公开访问，不需要登录即可看到产品介绍。页面文案包含：

- 自然语言完成上传、下载、分享、搜索、移动等文件操作。
- “分享链接直达”：发送链接和提取码即可转存并下载。
- “便捷分享预览”：一键生成分享链接。
- OAuth 2.0 和沙箱隔离说明。

判断：该页面证明 Skill / Agent 通道覆盖目标动作，但没有证明普通 Windows 桌面版可直接通过原生 API 调用“分享链接转存”。

### 百度网盘 MCP

公开功能表明确包含：

- 文件列表：`file_list`、`file_doc_list`、`file_image_list`、`file_video_list`
- 文件详情：`file_meta`
- 创建目录：`make_dir`
- 复制、移动、重命名、删除：`file_copy`、`file_move`、`file_rename`、`file_del`
- 上传：本地上传、URL 上传、文本上传
- 搜索：关键词搜索、语义搜索
- 创建分享链接：`file_sharelink_set`
- 用户信息与容量：`user_info`、`get_quota`

未确认：公开功能表没有明确列出“从别人分享链接直接转存到自己网盘”。

### 百度网盘 Go SDK

公开 README 明确包含：

- OAuth 授权
- 用户信息、容量
- 目录列表、搜索
- 上传、下载
- 复制、移动、重命名、删除、创建目录

未确认：

- 未在 README 中看到明确的“分享链接转存”方法。
- 未在 README 的方法一览中看到明确的“创建分享链接”方法。

### bdpan-storage

公开 README 和命令手册明确覆盖：

- `transfer`
- `ls`
- `mkdir`
- `rename`
- `mv`
- `share`
- `download`
- `upload`

但系统支持明确为 Windows WSL 支持、Windows 原生不支持。因此产品中只能作为高级模式，不作为默认依赖。

## 下一步 POC

1. 在 Windows 桌面后端中验证官方 OAuth / MCP / SDK 能力。
2. 重点验证“分享链接转存”是否存在可用官方原生能力。
3. 如果无法验证分享链接转存，则普通模式降级为：用户先手动转存，软件负责分类、扫描、重命名、移动和导出。
