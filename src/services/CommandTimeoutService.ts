export type CommandProbeStatus = "found" | "missing" | "timeout" | "error" | "skipped_dependency_missing";

export interface CommandProbeResultInput {
  executablePath?: string;
  exitCode?: number;
  timedOut?: boolean;
}

export function classifyCommandProbeResult(input: CommandProbeResultInput): CommandProbeStatus {
  if (!input.executablePath) return "missing";
  if (input.timedOut || input.exitCode === 124) return "timeout";
  if (input.exitCode === 0) return "found";
  return "error";
}
