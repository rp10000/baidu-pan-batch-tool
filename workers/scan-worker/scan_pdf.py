import sys
from pathlib import Path

from report import emit


def main():
    pdf_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    max_pages = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    if not pdf_path or not pdf_path.exists():
        emit({"ok": False, "findings": [], "error": "pdf_not_found"})
        return
    emit({"ok": True, "file": str(pdf_path), "maxPages": max_pages, "findings": []})


if __name__ == "__main__":
    main()
