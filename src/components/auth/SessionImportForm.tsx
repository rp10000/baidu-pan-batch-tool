import { Eye, EyeOff, Import, ClipboardPaste, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { parseBaiduSessionInput } from "../../services/BaiduSessionParser";
import type { BaiduSessionImportMode } from "../../services/BaiduSessionImportService";

export interface SessionImportPayload {
  mode: BaiduSessionImportMode;
  bduss?: string;
  stoken?: string;
  cookie?: string;
}

export function SessionImportForm({
  onImport,
  disabled = false,
  importing = false,
  title = "粘贴 BDUSS / STOKEN"
}: {
  onImport: (payload: SessionImportPayload) => Promise<void> | void;
  disabled?: boolean;
  importing?: boolean;
  title?: string;
}) {
  const [bduss, setBduss] = useState("");
  const [stoken, setStoken] = useState("");
  const [visible, setVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const bdussState = useMemo(() => parseBaiduSessionInput(bduss, "bduss"), [bduss]);
  const stokenState = useMemo(() => parseBaiduSessionInput(stoken, "stoken"), [stoken]);
  const ready = bdussState.hasBDUSS && stokenState.hasSTOKEN;

  async function pasteInto(setter: (value: string) => void) {
    const text = await navigator.clipboard?.readText().catch(() => "");
    if (text) setter(text.trim());
  }

  async function confirmImport() {
    setConfirming(false);
    await onImport({
      mode: "bduss_stoken",
      bduss: bduss.trim(),
      stoken: stoken.trim()
    });
  }

  function clear() {
    setBduss("");
    setStoken("");
  }

  return (
    <div className="session-import-form">
      <div className="section-heading">
        <h4>{title}</h4>
        <button className="text-btn" type="button" onClick={() => setVisible(!visible)}>
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          {visible ? "隐藏" : "显示"}
        </button>
      </div>

      <div className="secret-grid">
        <label>
          <span>BDUSS</span>
          <div className="secret-input-row">
            <input
              className="input"
              type={visible ? "text" : "password"}
              value={bduss}
              placeholder="粘贴 BDUSS"
              onChange={(event) => setBduss(event.target.value)}
              autoComplete="off"
            />
            <button className="secondary-btn icon-only" type="button" onClick={() => void pasteInto(setBduss)}>
              <ClipboardPaste size={16} />
            </button>
          </div>
          <small className={bdussState.hasBDUSS ? "ok-text" : "warn-text"}>
            {bdussState.hasBDUSS ? `已识别 ${bdussState.redactedPreview.bduss}` : "缺少 BDUSS，请按教程复制。"}
          </small>
        </label>
        <label>
          <span>STOKEN</span>
          <div className="secret-input-row">
            <input
              className="input"
              type={visible ? "text" : "password"}
              value={stoken}
              placeholder="粘贴 STOKEN"
              onChange={(event) => setStoken(event.target.value)}
              autoComplete="off"
            />
            <button className="secondary-btn icon-only" type="button" onClick={() => void pasteInto(setStoken)}>
              <ClipboardPaste size={16} />
            </button>
          </div>
          <small className={stokenState.hasSTOKEN ? "ok-text" : "warn-text"}>
            {stokenState.hasSTOKEN ? `已识别 ${stokenState.redactedPreview.stoken}` : "缺少 STOKEN，BaiduPCS-Go 可能无法登录。"}
          </small>
        </label>
      </div>

      <div className="dual-actions">
        <button className="secondary-btn" type="button" onClick={clear}>
          <Trash2 size={16} />
          清空
        </button>
        <button className="primary-btn" type="button" disabled={!ready || disabled || importing} onClick={() => setConfirming(true)}>
          <Import size={16} />
          {importing ? "导入中" : "确认导入"}
        </button>
      </div>

      {confirming && (
        <div className="confirm-panel" role="dialog" aria-label="确认导入百度网盘登录态">
          <h4>确认导入百度网盘登录态</h4>
          <p>登录态只会导入本机 BaiduPCS-Go，用于本机自用。软件不会上传，也不会写入日志。</p>
          <div className="api-row"><span>BDUSS</span><b>已识别</b></div>
          <div className="api-row"><span>STOKEN</span><b>已识别</b></div>
          <div className="modal-actions">
            <button className="secondary-btn" type="button" onClick={() => setConfirming(false)}>
              取消
            </button>
            <button className="primary-btn" type="button" onClick={() => void confirmImport()}>
              确认导入
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
