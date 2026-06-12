import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from "react";
import type { ReactNode } from "react";
import { inputSample } from "../data/prototypeData";
import type { ProcessingOptions, ShareTemplateSettings, TransferMode } from "../domain/types";
import { defaultFastScanOptions } from "../domain/scanOptions";
import type { ScanMode, ScanOptions } from "../domain/scanOptions";

export interface BatchDraftState {
  rawInput: string;
  hasUserEdited: boolean;
  selectedMode: "single" | "batch";
  transferMode: TransferMode;
  mergeLinks: boolean;
  autoClassify: boolean;
  autoTransfer: boolean;
  scanWatermark: boolean;
  scanTrafficContent: boolean;
  autoRemoveWatermark: boolean;
  removeTrafficFields: boolean;
  autoCreateShareCode: boolean;
  autoRenameFiles: boolean;
  renameRule: string;
  targetDirectory: string;
  scanOptions: ScanOptions;
  shareTiming: ProcessingOptions["shareTiming"];
  shareTemplate: ShareTemplateSettings;
  persistDraft: boolean;
  lastUpdatedAt?: string;
}

type BatchDraftAction =
  | { type: "hydrate"; state?: Partial<BatchDraftState> }
  | { type: "setRawInput"; rawInput: string }
  | { type: "restoreSample" }
  | { type: "clearRawInput" }
  | { type: "setSelectedMode"; selectedMode: "single" | "batch" }
  | { type: "setTransferMode"; transferMode: TransferMode }
  | { type: "setScanMode"; scanOptions: ScanOptions }
  | { type: "toggleScanOption"; key: keyof ScanOptions }
  | { type: "setOption"; key: keyof ProcessingOptions; value: ProcessingOptions[keyof ProcessingOptions] }
  | { type: "setPersistDraft"; persistDraft: boolean };

interface BatchDraftStoreValue extends BatchDraftState {
  options: ProcessingOptions;
  setRawInput: (rawInput: string) => void;
  restoreSampleInput: () => void;
  clearRawInput: () => void;
  setSelectedMode: (selectedMode: "single" | "batch") => void;
  setTransferMode: (transferMode: TransferMode) => void;
  setScanModeOptions: (scanOptions: ScanOptions) => void;
  toggleScanOption: (key: keyof ScanOptions) => void;
  setOption: <K extends keyof ProcessingOptions>(key: K, value: ProcessingOptions[K]) => void;
  setPersistDraft: (persistDraft: boolean) => void;
}

const BatchDraftContext = createContext<BatchDraftStoreValue | undefined>(undefined);

export function createInitialBatchDraftState(): BatchDraftState {
  return {
    rawInput: "",
    hasUserEdited: false,
    selectedMode: "batch",
    transferMode: "original",
    mergeLinks: false,
    autoClassify: false,
    autoTransfer: true,
    scanWatermark: false,
    scanTrafficContent: false,
    autoRemoveWatermark: false,
    removeTrafficFields: false,
    autoCreateShareCode: true,
    autoRenameFiles: false,
    renameRule: "{分类}_{日期}_{序号}",
    targetDirectory: "盘姬测试/panjie/raw/{taskId}",
    scanOptions: defaultFastScanOptions(),
    shareTiming: "share_immediately",
    shareTemplate: {
      type: "xiaohongshu_virtual",
      title: "资料包",
      storeName: "",
      orderNo: "",
      note: "",
      customTemplate: ""
    },
    persistDraft: true,
    lastUpdatedAt: undefined
  };
}

export function batchDraftReducer(state: BatchDraftState, action: BatchDraftAction): BatchDraftState {
  switch (action.type) {
    case "hydrate": {
      const merged = { ...state, ...safePartialState(action.state) };
      if (!merged.persistDraft) {
        return touch({ ...merged, rawInput: "", hasUserEdited: false }, false);
      }
      return merged;
    }
    case "setRawInput":
      return touch({ ...state, rawInput: action.rawInput, hasUserEdited: true });
    case "restoreSample":
      return touch({ ...state, rawInput: inputSample, hasUserEdited: true });
    case "clearRawInput":
      return touch({ ...state, rawInput: "", hasUserEdited: true });
    case "setSelectedMode":
      return touch({ ...state, selectedMode: action.selectedMode });
    case "setTransferMode":
      return touch(applyTransferMode(state, action.transferMode));
    case "setScanMode":
      return touch({
        ...applyTransferMode(state, modeFromScan(action.scanOptions.mode)),
        scanOptions: action.scanOptions,
        scanWatermark: action.scanOptions.checkWatermark,
        scanTrafficContent: action.scanOptions.checkContactInfo || action.scanOptions.checkTrafficWords,
        autoRemoveWatermark: action.scanOptions.createCleanCopy,
        removeTrafficFields: action.scanOptions.createCleanCopy
      });
    case "toggleScanOption": {
      const current = state.scanOptions[action.key];
      if (typeof current !== "boolean") return state;
      const scanOptions = {
        ...state.scanOptions,
        enabled: true,
        mode: state.scanOptions.mode === "off" ? "standard" : state.scanOptions.mode,
        [action.key]: !current
      };
      return touch({
        ...state,
        scanOptions,
        scanWatermark: scanOptions.checkWatermark,
        scanTrafficContent: scanOptions.checkContactInfo || scanOptions.checkTrafficWords || scanOptions.checkOcrText || scanOptions.checkQrCode,
        autoRemoveWatermark: scanOptions.createCleanCopy,
        removeTrafficFields: scanOptions.createCleanCopy
      });
    }
    case "setOption":
      return touch({ ...state, [action.key]: action.value });
    case "setPersistDraft":
      return touch({
        ...state,
        persistDraft: action.persistDraft,
        rawInput: action.persistDraft ? state.rawInput : "",
        hasUserEdited: action.persistDraft ? state.hasUserEdited : false
      });
  }
}

export function optionsFromBatchDraft(state: BatchDraftState): ProcessingOptions {
  return {
    transferMode: state.transferMode,
    mergeLinks: state.mergeLinks,
    autoClassify: state.autoClassify,
    autoTransfer: state.autoTransfer,
    scanWatermark: state.scanWatermark,
    scanTrafficContent: state.scanTrafficContent,
    autoRemoveWatermark: state.autoRemoveWatermark,
    removeTrafficFields: state.removeTrafficFields,
    autoCreateShareCode: state.autoCreateShareCode,
    autoRenameFiles: state.autoRenameFiles,
    renameRule: state.renameRule,
    targetDirectory: state.targetDirectory,
    scanOptions: state.scanOptions,
    shareTiming: state.shareTiming,
    shareTemplate: state.shareTemplate
  };
}

export function BatchDraftProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(batchDraftReducer, undefined, createInitialBatchDraftState);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const api = getDraftApi();
    if (!api?.read) {
      hydratedRef.current = true;
      return;
    }
    void api.read().then((saved) => {
      dispatch({ type: "hydrate", state: saved });
      hydratedRef.current = true;
    }).catch(() => {
      hydratedRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (!hydratedRef.current) return;
    const api = getDraftApi();
    if (!api?.write) return;
    void api.write(state.persistDraft ? state : { ...state, rawInput: "", hasUserEdited: false });
  }, [state]);

  const setRawInput = useCallback((rawInput: string) => dispatch({ type: "setRawInput", rawInput }), []);
  const restoreSampleInput = useCallback(() => dispatch({ type: "restoreSample" }), []);
  const clearRawInput = useCallback(() => dispatch({ type: "clearRawInput" }), []);
  const setSelectedMode = useCallback((selectedMode: "single" | "batch") => dispatch({ type: "setSelectedMode", selectedMode }), []);
  const setTransferMode = useCallback((transferMode: TransferMode) => dispatch({ type: "setTransferMode", transferMode }), []);
  const setScanModeOptions = useCallback((scanOptions: ScanOptions) => dispatch({ type: "setScanMode", scanOptions }), []);
  const toggleScanOption = useCallback((key: keyof ScanOptions) => dispatch({ type: "toggleScanOption", key }), []);
  const setOption = useCallback(<K extends keyof ProcessingOptions>(key: K, value: ProcessingOptions[K]) => {
    dispatch({ type: "setOption", key, value });
  }, []);
  const setPersistDraft = useCallback((persistDraft: boolean) => dispatch({ type: "setPersistDraft", persistDraft }), []);
  const options = useMemo(() => optionsFromBatchDraft(state), [state]);

  const value = useMemo(
    () => ({
      ...state,
      options,
      setRawInput,
      restoreSampleInput,
      clearRawInput,
      setSelectedMode,
      setTransferMode,
      setScanModeOptions,
      toggleScanOption,
      setOption,
      setPersistDraft
    }),
    [clearRawInput, options, restoreSampleInput, setOption, setPersistDraft, setRawInput, setScanModeOptions, setSelectedMode, setTransferMode, state, toggleScanOption]
  );

  return createElement(BatchDraftContext.Provider, { value }, children);
}

export function useBatchDraftStore(): BatchDraftStoreValue {
  const value = useContext(BatchDraftContext);
  if (!value) throw new Error("useBatchDraftStore must be used inside BatchDraftProvider");
  return value;
}

function touch(state: BatchDraftState, updateTimestamp = true): BatchDraftState {
  return updateTimestamp ? { ...state, lastUpdatedAt: new Date().toISOString() } : state;
}

function safePartialState(state?: Partial<BatchDraftState>): Partial<BatchDraftState> {
  if (!state || typeof state !== "object") return {};
  const partial: Partial<BatchDraftState> = {
    rawInput: typeof state.rawInput === "string" ? state.rawInput : undefined,
    hasUserEdited: typeof state.hasUserEdited === "boolean" ? state.hasUserEdited : undefined,
    selectedMode: state.selectedMode === "single" ? "single" : state.selectedMode === "batch" ? "batch" : undefined,
    transferMode: isTransferMode(state.transferMode) ? state.transferMode : undefined,
    mergeLinks: typeof state.mergeLinks === "boolean" ? state.mergeLinks : undefined,
    autoClassify: typeof state.autoClassify === "boolean" ? state.autoClassify : undefined,
    autoTransfer: typeof state.autoTransfer === "boolean" ? state.autoTransfer : undefined,
    autoCreateShareCode: typeof state.autoCreateShareCode === "boolean" ? state.autoCreateShareCode : undefined,
    autoRenameFiles: typeof state.autoRenameFiles === "boolean" ? state.autoRenameFiles : undefined,
    renameRule: typeof state.renameRule === "string" ? state.renameRule : undefined,
    targetDirectory: typeof state.targetDirectory === "string" ? state.targetDirectory : undefined,
    shareTemplate: safeShareTemplate(state.shareTemplate),
    persistDraft: typeof state.persistDraft === "boolean" ? state.persistDraft : undefined
  };
  return omitUndefined(partial);
}

function applyTransferMode(state: BatchDraftState, transferMode: TransferMode): BatchDraftState {
  if (transferMode === "original") {
    return {
      ...state,
      transferMode,
      autoClassify: false,
      autoRenameFiles: false,
      scanWatermark: false,
      scanTrafficContent: false,
      autoRemoveWatermark: false,
      removeTrafficFields: false,
      scanOptions: defaultFastScanOptions(),
      targetDirectory: "盘姬测试/panjie/raw/{taskId}"
    };
  }
  if (transferMode === "archive") {
    return {
      ...state,
      transferMode,
      autoClassify: true,
      autoRenameFiles: true,
      scanWatermark: false,
      scanTrafficContent: false,
      autoRemoveWatermark: false,
      removeTrafficFields: false,
      scanOptions: defaultFastScanOptions(),
      targetDirectory: "盘姬测试/panjie/output/{taskId}/{分类}"
    };
  }
  return {
    ...state,
    transferMode,
    autoClassify: true,
    autoRenameFiles: true,
    targetDirectory: "盘姬测试/panjie/output/{taskId}/{分类}"
  };
}

function modeFromScan(mode: ScanMode): TransferMode {
  if (mode === "off") return "original";
  if (mode === "standard") return "archive";
  return "scan_clean";
}

function isTransferMode(mode: unknown): mode is TransferMode {
  return mode === "original" || mode === "archive" || mode === "scan_clean";
}

function safeShareTemplate(value: unknown): ShareTemplateSettings | undefined {
  if (!value || typeof value !== "object") return undefined;
  const template = value as Partial<ShareTemplateSettings>;
  if (
    template.type !== "baidu_standard" &&
    template.type !== "xiaohongshu_virtual" &&
    template.type !== "wechat_simple" &&
    template.type !== "after_sale_resend" &&
    template.type !== "custom"
  ) {
    return undefined;
  }
  return {
    type: template.type,
    title: typeof template.title === "string" ? template.title : "资料包",
    storeName: typeof template.storeName === "string" ? template.storeName : "",
    orderNo: typeof template.orderNo === "string" ? template.orderNo : "",
    note: typeof template.note === "string" ? template.note : "",
    customTemplate: typeof template.customTemplate === "string" ? template.customTemplate : ""
  };
}

function omitUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, field]) => field !== undefined)) as Partial<T>;
}

function getDraftApi():
  | {
      read?: () => Promise<Partial<BatchDraftState> | undefined>;
      write?: (state: BatchDraftState) => Promise<{ ok: boolean }>;
    }
  | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as typeof window & {
    panjieDraft?: {
      read?: () => Promise<Partial<BatchDraftState> | undefined>;
      write?: (state: BatchDraftState) => Promise<{ ok: boolean }>;
    };
  }).panjieDraft;
}
