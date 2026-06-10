export interface CleanTextResult {
  cleanedContent: string;
  strategy: "remove_risk_lines";
}

const riskLinePatterns = [
  /https?:\/\/[^\s]+/i,
  /1[3-9]\d{9}/,
  /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,
  /加微信|进群|公众号|联系我|VX|QQ群/i
];

export class CleanCopyService {
  cleanText(content: string): CleanTextResult {
    const cleanedContent = content
      .split(/\r?\n/)
      .filter((line) => !riskLinePatterns.some((pattern) => pattern.test(line)))
      .join("\n");

    return {
      cleanedContent,
      strategy: "remove_risk_lines"
    };
  }
}
