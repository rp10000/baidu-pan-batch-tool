export interface RemoteFileLike {
  name: string;
  isDir: boolean;
  size?: number;
}

export interface ClassificationRule {
  category: string;
  extensions?: string[];
  keywords?: string[];
}

export interface ClassificationResult {
  category: string;
  reason: string;
}

export function createDefaultClassificationRules(): ClassificationRule[] {
  return [
    { category: "courses", keywords: ["课程", "教程", "课件", "训练营", "讲义"] },
    { category: "documents", extensions: ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md"] },
    { category: "images", extensions: ["jpg", "jpeg", "png", "webp", "gif", "bmp", "tiff"] },
    { category: "videos", extensions: ["mp4", "mov", "mkv", "avi", "wmv", "flv", "m4v"] },
    { category: "audio", extensions: ["mp3", "wav", "m4a", "aac", "flac", "ogg"] },
    { category: "archives", extensions: ["zip", "rar", "7z", "tar", "gz", "bz2"] },
    { category: "software", extensions: ["exe", "msi", "dmg", "apk", "pkg", "deb", "rpm"] }
  ];
}

export function classifyRemoteFile(
  file: RemoteFileLike,
  rules: ClassificationRule[] = createDefaultClassificationRules()
): ClassificationResult {
  const normalizedName = file.name.toLowerCase();
  const extension = getExtension(file.name);

  const structuralRule = rules.find((rule) => {
    return (rule.category === "archives" || rule.category === "software") && extension && rule.extensions?.includes(extension);
  });

  if (structuralRule && extension) {
    return { category: structuralRule.category, reason: `extension:${extension}` };
  }

  for (const rule of rules) {
    const keyword = rule.keywords?.find((candidate) => normalizedName.includes(candidate.toLowerCase()));
    if (keyword) {
      return { category: rule.category, reason: `keyword:${keyword}` };
    }
  }

  for (const rule of rules) {
    if (extension && rule.extensions?.includes(extension)) {
      return { category: rule.category, reason: `extension:${extension}` };
    }
  }

  return { category: "uncategorized", reason: "no_rule_matched" };
}

function getExtension(name: string): string | undefined {
  const lastDot = name.lastIndexOf(".");
  if (lastDot < 0 || lastDot === name.length - 1) {
    return undefined;
  }
  return name.slice(lastDot + 1).toLowerCase();
}
