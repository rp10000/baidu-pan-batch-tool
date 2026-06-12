import type { ScanOptions } from "../domain/scanOptions";
import { shouldCheckOcrModel } from "../domain/scanOptions";

export interface ModelStatus {
  required: boolean;
  installed: boolean;
  cacheDirectory: string;
  message: string;
}

export class ModelManagerService {
  inspectOcrModel(options: ScanOptions): ModelStatus {
    const required = shouldCheckOcrModel(options);
    return {
      required,
      installed: false,
      cacheDirectory: "models/paddleocr",
      message: required ? "OCR 模型未安装，可在设置中心安装" : "当前模式不需要 OCR 模型"
    };
  }
}
