const MAX_FILENAME_LENGTH = 160;
const ILLEGAL_FILENAME_CHARS = /[\\/:*?"<>|]/g;

export function applyRenameRule(input: {
  originalName: string;
  category: string;
  date: string;
  index: number;
  rule: string;
}): string {
  const { baseName, extension } = splitFileName(input.originalName);
  const paddedIndex = String(input.index).padStart(3, "0");
  const hasExtensionPlaceholder = input.rule.includes("{扩展名}");
  const rendered = input.rule
    .replaceAll("{原文件名}", baseName)
    .replaceAll("{分类}", input.category)
    .replaceAll("{日期}", input.date)
    .replaceAll("{序号}", paddedIndex)
    .replaceAll("{扩展名}", extension);

  const withExtension = hasExtensionPlaceholder || !extension ? rendered : `${rendered}${extension}`;
  return truncatePreservingExtension(sanitizeFileName(withExtension), extension);
}

function splitFileName(fileName: string): { baseName: string; extension: string } {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === fileName.length - 1) {
    return { baseName: fileName, extension: "" };
  }

  return {
    baseName: fileName.slice(0, lastDot),
    extension: fileName.slice(lastDot)
  };
}

function sanitizeFileName(value: string): string {
  const sanitized = value.replace(ILLEGAL_FILENAME_CHARS, "_").trim();
  return sanitized || "未命名";
}

function truncatePreservingExtension(value: string, extension: string): string {
  if (value.length <= MAX_FILENAME_LENGTH) {
    return value;
  }

  if (!extension || !value.endsWith(extension)) {
    return value.slice(0, MAX_FILENAME_LENGTH);
  }

  return `${value.slice(0, MAX_FILENAME_LENGTH - extension.length)}${extension}`;
}
