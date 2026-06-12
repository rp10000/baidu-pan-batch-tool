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
  mode = "bduss_stoken",
  onImport,
  disabled = false,
  importing = false,
  title = "粘贴并导入登录态"
}: {
  mode?: BaiduSessionImportMode;
  onImport: (payload: SessionImportPayload) => Promise<void> | void;
  disabled?: boolean;
  importing?: boolean;
  title?: string;
}) {
  const [bduss, setBduss] = useState("");
  const [stoken, setStoken] = useState("");
  const [cookie, setCookie] = useState("");
  const [visible, setVisible] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const bdussState = useMemo(() => parseBaiduSessionInput(bduss, "bduss"), [bduss]);
  const stokenState = useMemo(() => parseBaiduSessionInput(stoken, "stoken"), [stoken]);
  const cookieState = useMemo(() => parseBaiduSessionInput(cookie, "cookie"), [cookie]);
  const ready = mode === "cookie" ? cookieState.hasCookie : bdussState.hasBDUSS && stokenState.hasSTOKEN;

  async function pasteInto(setter: (value: string) => void) {
    const text = await navigator.clipboard?.readText().catch(() => "");
    if (text) setter(text.trim());
  }

  async function confirmImport() {
    setConfirming(false);
    await onImport({
      mode,
      bduss: bduss.trim(),
      stoken: stoken.trim(),
      cookie: cookie.trim()
    });
  }

  function clear() {
    setBduss("");
    setStoken("");
    setCookie("");
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

      {mode === "bduss_stoken" ? (
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
      ) : (
        <label className="secret-textarea-label">
          <span>完整 Cookie 字符串</span>
          <textarea
            className="textarea secret-textarea"
            value={cookie}
            placeholder="粘贴完整 Cookie 字符串"
            onChange={(event) => setCookie(event.target.value)}
          />
          <small className={cookieState.hasCookie ? "ok-text" : "warn-text"}>
            {cookieState.hasCookie ? "Cookie 已识别，导入前仍会二次确认。" : "未识别到 Cookie。默认建议使用 BDUSS + STOKEN。"}
          </small>
        </label>
      )}

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
          <div className="api-row"><span>BDUSS</span><b>{mode === "cookie" ? "来自完整 Cookie" : "已识别"}</b></div>
          <div className="api-row"><span>STOKEN</span><b>{mode === "cookie" ? "来自完整 Cookie" : "已识别"}</b></div>
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
