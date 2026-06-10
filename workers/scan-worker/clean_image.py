import sys
from pathlib import Path

from report import emit


def main():
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    target = Path(sys.argv[2]) if len(sys.argv) > 2 else None
    if not source or not source.exists() or not target:
        emit({"ok": False, "error": "invalid_image_clean_input"})
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(source.read_bytes())
    emit({"ok": True, "output": str(target), "strategy": "copy_placeholder"})


if __name__ == "__main__":
    main()
