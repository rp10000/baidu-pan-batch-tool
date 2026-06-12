import type { StorageAdapter } from "../adapters/StorageAdapter";
import { OriginalTransferService } from "./OriginalTransferService";

export class LocalCliProcessingService extends OriginalTransferService {
  constructor(adapter: StorageAdapter, options: { delayMs?: number } = {}) {
    super(adapter, options);
  }
}
