import { describe, expect, it } from "vitest";
import { createBaiduSessionImportPlan } from "./BaiduSessionImportService";

describe("BaiduSessionImportService", () => {
  const capabilities = { bduss: true, stoken: true, cookies: true };

  it("plans BDUSS and STOKEN import with spawn-safe args", () => {
    const plan = createBaiduSessionImportPlan({
      mode: "bduss_stoken",
      bduss: "fakeBDUSSValue1234",
      stoken: "fakeSTOKENValue5678",
      capabilities
    });
    expect(plan.ok).toBe(true);
    expect(plan.args).toEqual(["login", "--bduss", "fakeBDUSSValue1234", "--stoken", "fakeSTOKENValue5678"]);
    expect(plan.redactedCommand).not.toContain("fakeBDUSSValue1234");
  });

  it("requires both BDUSS and STOKEN", () => {
    const plan = createBaiduSessionImportPlan({
      mode: "bduss_stoken",
      bduss: "fakeBDUSSValue1234",
      capabilities
    });
    expect(plan.ok).toBe(false);
    expect(plan.error).toContain("STOKEN");
  });

  it("plans complete cookie import only when supported", () => {
    const plan = createBaiduSessionImportPlan({
      mode: "cookie",
      cookie: "BDUSS=fake; STOKEN=fake",
      capabilities
    });
    expect(plan.ok).toBe(true);
    expect(plan.args).toEqual(["login", "--cookies", "BDUSS=fake; STOKEN=fake"]);
    expect(plan.redactedCommand).toContain("<redacted-cookie>");
  });
});
