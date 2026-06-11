import type { StorageAdapter } from "../adapters/StorageAdapter";
import { RealProcessingService } from "./RealProcessingService";

export class LocalCliProcessingService extends RealProcessingService {
  constructor(adapter: StorageAdapter, options: { delayMs?: number } = {}) {
    super(adapter, options);
  }
}
