# 模型管理器

## OCR

- 主引擎：PaddleOCR
- 缓存目录：`models/paddleocr/`
- 依赖环境：`workers/.venv/`
- 安装触发：只有用户勾选 OCR 或水印检测时检查

`models/` 和 `workers/.venv/` 已加入 `.gitignore`，不提交模型或虚拟环境。

## QR

二维码检测使用 OpenCV `QRCodeDetector`，不需要模型。

## ffmpeg

只有用户勾选视频扫描时检查 ffmpeg。优先使用 `imageio-ffmpeg` 或后续内置 ffmpeg 运行时。

## 状态展示

设置中心显示：

- OCR 模型：未安装 / 已安装 / 当前不需要
- QR：可用 / 当前不需要
- ffmpeg：未安装 / 可用 / 当前不需要
