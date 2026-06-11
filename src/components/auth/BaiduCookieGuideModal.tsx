import { ExternalLink, X } from "lucide-react";
import { GuideStepCard } from "./GuideStepCard";
import { SessionImportForm } from "./SessionImportForm";
import type { SessionImportPayload } from "./SessionImportForm";

export function BaiduCookieGuideModal({
  open,
  onClose,
  onOpenLoginPage,
  onImport,
  importing
}: {
  open: boolean;
  onClose: () => void;
  onOpenLoginPage: () => void;
  onImport: (payload: SessionImportPayload) => Promise<void> | void;
  importing?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="auth-modal-backdrop">
      <div className="modal-card auth-guide-modal" role="dialog" aria-label="最短登录态获取教程">
        <button className="icon-close" type="button" onClick={onClose} aria-label="关闭教程">
          <X size={18} />
        </button>
        <div className="auth-guide-head">
          <span className="tag pink">最短教程</span>
          <h3>最短登录态获取教程</h3>
          <p>只需要复制 BDUSS 和 STOKEN 两个值。软件不会自动读取浏览器 Cookie。</p>
        </div>

        <div className="guide-steps-grid">
          <GuideStepCard
            step={1}
            title="打开百度网盘并确认已登录"
            visual={<BrowserVisual />}
            action={<button className="secondary-btn" type="button" onClick={onOpenLoginPage}><ExternalLink size={16} />打开百度网盘</button>}
          >
            如果网页右上角能看到头像或网盘文件列表，说明已经登录。
          </GuideStepCard>
          <GuideStepCard step={2} title="打开开发者工具" visual={<KeyVisual />}>
            在百度网盘网页按 F12。如果 F12 无效，右键页面空白处，选择“检查”。
          </GuideStepCard>
          <GuideStepCard step={3} title="进入 Cookies 列表" visual={<CookieTreeVisual />}>
            在开发者工具顶部选择 Application / 应用 / 存储，左侧找到 Cookies，点击 https://pan.baidu.com。
          </GuideStepCard>
          <GuideStepCard step={4} title="复制 BDUSS" visual={<CookieTableVisual name="BDUSS" />}>
            在 Cookie 表格里搜索 BDUSS，双击 Value，Ctrl+A 全选后 Ctrl+C 复制。
          </GuideStepCard>
          <GuideStepCard step={5} title="复制 STOKEN" visual={<CookieTableVisual name="STOKEN" />}>
            继续搜索 STOKEN。如果 pan.baidu.com 下没有，可以查看 .baidu.com 或 passport.baidu.com 的 Cookies。
          </GuideStepCard>
          <GuideStepCard step={6} title="回到软件粘贴" visual={<PasteVisual />}>
            把 BDUSS 粘贴到 BDUSS 输入框，把 STOKEN 粘贴到 STOKEN 输入框，然后点击确认导入。
          </GuideStepCard>
        </div>

        <SessionImportForm onImport={onImport} importing={importing} />
      </div>
    </div>
  );
}

function BrowserVisual() {
  return (
    <div className="mock-browser">
      <span />
      <span />
      <b>pan.baidu.com</b>
      <i />
    </div>
  );
}

function KeyVisual() {
  return (
    <div className="mock-keyboard">
      <b>F12</b>
      <span>检查</span>
    </div>
  );
}

function CookieTreeVisual() {
  return (
    <div className="mock-tree">
      <b>Application</b>
      <span>Storage</span>
      <span>Cookies</span>
      <em>https://pan.baidu.com</em>
    </div>
  );
}

function CookieTableVisual({ name }: { name: string }) {
  return (
    <div className="mock-cookie-table">
      <span>Name</span>
      <span>Value</span>
      <b>{name}</b>
      <em>已隐藏</em>
    </div>
  );
}

function PasteVisual() {
  return (
    <div className="mock-paste-form">
      <span>BDUSS</span>
      <span>STOKEN</span>
      <b>确认导入</b>
    </div>
  );
}
