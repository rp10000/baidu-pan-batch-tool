import sys
from pathlib import Path

from report import emit


def main():
    image_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if not image_path or not image_path.exists():
        emit({"ok": False, "findings": [], "error": "image_not_found"})
        return

    # MVP worker shell. Real QR/OCR is installed on demand by the model manager.
    emit({"ok": True, "file": str(image_path), "findings": []})


if __name__ == "__main__":
    main()
