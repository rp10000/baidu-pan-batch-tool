import { capabilitiesForMode } from "./adapterMode";
import { PendingStorageAdapter } from "./PendingStorageAdapter";

export class BaiduSdkAdapter extends PendingStorageAdapter {
  constructor() {
    super("baidu_sdk", capabilitiesForMode("baidu_sdk"), "百度网盘 SDK / OpenAPI 接入待实现");
  }
}
