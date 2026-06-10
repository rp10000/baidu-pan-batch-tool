# OAuth 回调策略

正式 OAuth 实现前先准备两种回调策略。本阶段只做材料准备，不实现真实 code exchange。

## 方案 1：Loopback 回调，优先尝试

示例：

```text
http://127.0.0.1:53682/oauth/callback
```

用途：

- 桌面软件启动本地回调服务。
- 百度官方授权页完成后回跳本机地址。
- 本机 bridge 接收一次性 OAuth code。

用户需要确认：

- 百度开发者平台是否允许注册 `127.0.0.1` 或 `localhost` 回调地址。
- 是否允许固定端口 `53682`，或需要换成平台允许的端口。

不能做：

- 不把 code 写进日志。
- 不把 code 交给 React store。
- 不从浏览器会话或网络面板提取任何内容。

## 方案 2：OOB 授权码回填，fallback

示例：

```text
redirect_uri=oob
```

用途：

- 如果本地 loopback 回调不被允许，授权页显示一次性 code。
- 用户复制 code 到桌面软件输入框。
- 本机 bridge 后续再用 code 换取授权凭据。

用户需要确认：

- 百度开发者平台是否支持 OOB。
- code 只能使用一次，过期后重新授权。

不能做：

- 不把 code 写进日志、文档、截图或导出文件。
- 不把 code 发到聊天。

