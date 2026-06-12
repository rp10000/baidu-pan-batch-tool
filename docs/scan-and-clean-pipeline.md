# 扫描与清理流水线

## 扫描范围

MVP 定义的风险类型：

- qrcode
- phone
- email
- url
- wechat
- qq
- external_traffic_word
- text_watermark
- image_watermark
- corner_overlay
- unknown_suspicious

## 文件类型

| 类型 | 标准检查 | 深度扫描 |
| --- | --- | --- |
| 图片 | 抽样，最多 100 张 | 最多 1000 张 |
| PDF | 前 3 页 | 最多 20 页 |
| 视频 | 默认关闭 | 最多 30 帧，每 5 秒 |
| 文本 | 直接规则检测 | 直接规则检测 |
| Office | 标记 unsupported_document_format | 标记 unsupported_document_format |

## 清理副本

- 文本：删除包含 URL、手机号、邮箱、微信、QQ、引流词的行。
- 图片：MVP 优先 mosaic / solid cover；复杂水印只标记风险。
- PDF：可生成副本或风险报告，不破坏原文件。
- 视频：ffmpeg 可用时再做区域模糊；不可用则只标记。

清理输出：

```text
artifacts/cleaned/<taskId>/
盘姬测试/cleaned/<taskId>/
```

当前 worker 是 MVP 骨架，真实 OCR/PDF/video 处理能力后续增强。
