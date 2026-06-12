import { describe, expect, it } from "vitest";
import { inputSample } from "../data/prototypeData";
import { defaultStandardScanOptions } from "../domain/scanOptions";
import { batchDraftReducer, createInitialBatchDraftState, optionsFromBatchDraft } from "./batchDraftStore";

describe("batchDraftStore", () => {
  it("starts with empty input instead of sample links", () => {
    const state = createInitialBatchDraftState();

    expect(state.rawInput).toBe("");
    expect(state.hasUserEdited).toBe(false);
    expect(state.transferMode).toBe("original");
    expect(optionsFromBatchDraft(state).autoClassify).toBe(false);
    expect(optionsFromBatchDraft(state).autoRenameFiles).toBe(false);
    expect(optionsFromBatchDraft(state).scanOptions.enabled).toBe(false);
    expect(optionsFromBatchDraft(state).targetDirectory).toContain("盘姬测试");
  });

  it("keeps user input in state across page unmounts", () => {
    const state = batchDraftReducer(createInitialBatchDraftState(), {
      type: "setRawInput",
      rawInput: "https://pan.baidu.com/s/1abc 提取码: 1234"
    });

    expect(state.rawInput).toContain("1abc");
    expect(state.hasUserEdited).toBe(true);
  });

  it("does not restore samples after clear", () => {
    const edited = batchDraftReducer(createInitialBatchDraftState(), { type: "restoreSample" });
    const cleared = batchDraftReducer(edited, { type: "clearRawInput" });
    const hydrated = batchDraftReducer(createInitialBatchDraftState(), { type: "hydrate", state: cleared });

    expect(edited.rawInput).toBe(inputSample);
    expect(cleared.rawInput).toBe("");
    expect(hydrated.rawInput).toBe("");
    expect(hydrated.hasUserEdited).toBe(true);
  });

  it("keeps scan options and rename settings in draft state", () => {
    const scanOptions = defaultStandardScanOptions();
    const scanned = batchDraftReducer(createInitialBatchDraftState(), { type: "setScanMode", scanOptions });
    const renamed = batchDraftReducer(scanned, { type: "setOption", key: "renameRule", value: "{分类}_{序号}" });

    expect(renamed.scanOptions.mode).toBe("standard");
    expect(renamed.transferMode).toBe("archive");
    expect(renamed.scanTrafficContent).toBe(true);
    expect(renamed.renameRule).toBe("{分类}_{序号}");
  });

  it("maps transfer modes to safe default options", () => {
    const archived = batchDraftReducer(createInitialBatchDraftState(), { type: "setTransferMode", transferMode: "archive" });
    const original = batchDraftReducer(archived, { type: "setTransferMode", transferMode: "original" });

    expect(archived.autoClassify).toBe(true);
    expect(archived.autoRenameFiles).toBe(true);
    expect(archived.targetDirectory).toContain("output");
    expect(original.autoClassify).toBe(false);
    expect(original.autoRenameFiles).toBe(false);
    expect(original.scanOptions.enabled).toBe(false);
    expect(original.targetDirectory).toContain("raw");
  });

  it("drops sensitive raw input when draft persistence is disabled", () => {
    const edited = batchDraftReducer(createInitialBatchDraftState(), {
      type: "setRawInput",
      rawInput: "https://pan.baidu.com/s/1private 提取码: 1234"
    });
    const disabled = batchDraftReducer(edited, { type: "setPersistDraft", persistDraft: false });

    expect(disabled.persistDraft).toBe(false);
    expect(disabled.rawInput).toBe("");
    expect(disabled.hasUserEdited).toBe(false);
  });

  it("keeps new defaults when hydrating older drafts without template fields", () => {
    const hydrated = batchDraftReducer(createInitialBatchDraftState(), {
      type: "hydrate",
      state: {
        rawInput: "https://pan.baidu.com/s/1old 1234",
        hasUserEdited: true
      }
    });

    expect(hydrated.shareTemplate.type).toBe("xiaohongshu_virtual");
    expect(optionsFromBatchDraft(hydrated).shareTemplate.title).toBe("资料包");
  });
});
