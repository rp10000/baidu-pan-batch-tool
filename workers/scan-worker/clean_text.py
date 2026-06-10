import re
import sys
from pathlib import Path

from report import emit


RISK_LINE = re.compile(r"https?://|1[3-9]\d{9}|@|加微信|进群|公众号|联系我|VX|QQ群", re.I)


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    if not source or not source.exists() or not target:
        emit({"ok": False, "error": "invalid_text_clean_input"})
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    lines = [line for line in source.read_text(encoding="utf-8", errors="ignore").splitlines() if not RISK_LINE.search(line)]
    target.write_text("\n".join(lines), encoding="utf-8")
    emit({"ok": True, "output": str(target), "strategy": "remove_risk_lines"})


if __name__ == "__main__":
    main()
