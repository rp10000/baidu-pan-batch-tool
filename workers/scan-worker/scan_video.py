import sys
from pathlib import Path

from report import emit


def main():
    video_path = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    interval_sec = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    max_frames = int(sys.argv[3]) if len(sys.argv) > 3 else 30
    if not video_path or not video_path.exists():
        emit({"ok": False, "findings": [], "error": "video_not_found"})
        return
    emit({"ok": True, "file": str(video_path), "intervalSec": interval_sec, "maxFrames": max_frames, "findings": []})


if __name__ == "__main__":
    main()
