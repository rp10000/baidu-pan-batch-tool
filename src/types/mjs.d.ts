declare module "*.mjs" {
  export function redactSensitiveText(value: string): string;
  export function formatSmokeReport(input: {
    generatedAt: string;
    environment: Record<string, string | boolean | undefined>;
    checks: Array<{ name: string; status: string; message: string }>;
    hasTestShare: boolean;
    notes?: string[];
  }): string;
}
