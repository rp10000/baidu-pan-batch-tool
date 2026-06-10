import type { LocalCliAdapter, LocalCliRiskLevel } from "../adapters/LocalCliAdapter";

export interface LocalCliSmokeCheck {
  name: string;
  status: "pass" | "fail" | "skipped" | "manual_auth_required" | "skipped_missing_test_share";
  message: string;
}

export interface LocalCliSmokeResult {
  status: "pass" | "diagnostic" | "manual_auth_required";
  cliName: string;
  version?: string;
  riskLevel: LocalCliRiskLevel;
  checks: LocalCliSmokeCheck[];
}

export async function runLocalCliSmoke(
  adapter: LocalCliAdapter,
  options: { tryLogin?: boolean; hasTestShare?: boolean } = {}
): Promise<LocalCliSmokeResult> {
  const checks: LocalCliSmokeCheck[] = [];
  const installed = await adapter.checkInstalled();
  checks.push({ name: "version", status: installed.status === "not_detected" ? "fail" : "pass", message: installed.message });

  if (installed.status === "not_detected") {
    return { status: "diagnostic", cliName: adapter.name, riskLevel: adapter.riskLevel, checks };
  }

  if (options.tryLogin) {
    const login = await adapter.login();
    if (!login.ok) {
      checks.push({ name: "login", status: "manual_auth_required", message: login.error ?? "需要人工登录" });
      return {
        status: "manual_auth_required",
        cliName: adapter.name,
        version: installed.version,
        riskLevel: login.status === "manual_cookie_mode" ? "high_manual_cookie_only" : adapter.riskLevel,
        checks
      };
    }
    checks.push({ name: "login", status: "pass", message: "登录流程完成" });
  }

  const connection = await adapter.checkLogin();
  if (!connection.ok) {
    checks.push({ name: "whoami", status: "manual_auth_required", message: connection.message });
    return { status: "manual_auth_required", cliName: adapter.name, version: installed.version, riskLevel: adapter.riskLevel, checks };
  }

  checks.push({ name: "whoami", status: "pass", message: "已登录，账号信息已脱敏" });

  const root = "盘姬测试";
  const smokeDir = `${root}/panjie-smoke-test`;
  const docDir = `${smokeDir}/文档`;
  await pushCheck(checks, "ls", adapter.listFiles({ remoteDirectory: root }).then(() => ({ ok: true })));
  await pushCheck(checks, "mkdir", adapter.mkdir({ remoteDirectory: smokeDir }));
  await pushCheck(checks, "upload", adapter.uploadFile({ localPath: "artifacts/local-smoke/hello.txt", remotePath: `${smokeDir}/hello.txt` }));
  await pushCheck(checks, "rename", adapter.renameFile({ remotePath: `${smokeDir}/hello.txt`, newName: "盘姬测试_001.txt" }));
  await pushCheck(checks, "mkdir category", adapter.mkdir({ remoteDirectory: docDir }));
  await pushCheck(checks, "mv", adapter.moveFile({ remotePath: `${smokeDir}/盘姬测试_001.txt`, targetDirectory: `${docDir}/盘姬测试_001.txt` }));

  if (options.hasTestShare) {
    await pushCheck(checks, "transfer", adapter.transferSharedLink({ url: "<redacted>", extractCode: "<redacted>", targetDirectory: smokeDir }));
  } else {
    checks.push({ name: "transfer", status: "skipped_missing_test_share", message: "缺少用户自有测试分享链接" });
  }

  await pushCheck(checks, "share", adapter.createShareLink({ remotePaths: [smokeDir], periodDays: 7 }));

  const hasFailure = checks.some((check) => check.status === "fail");
  return {
    status: hasFailure ? "diagnostic" : "pass",
    cliName: adapter.name,
    version: installed.version,
    riskLevel: adapter.riskLevel,
    checks
  };
}

async function pushCheck(checks: LocalCliSmokeCheck[], name: string, operation: Promise<{ ok: boolean; error?: string }>) {
  const result = await operation;
  checks.push({ name, status: result.ok ? "pass" : "fail", message: result.error ?? (result.ok ? "ok" : "failed") });
}
