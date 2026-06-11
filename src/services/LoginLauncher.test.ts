import { describe, expect, it } from "vitest";
import { buildLoginStartArgs, createBaiduPcsLoginScript } from "./LoginLauncher";

describe("LoginLauncher", () => {
  it("generates a login cmd script with an absolute BaiduPCS-Go path", () => {
    const script = createBaiduPcsLoginScript({
      cliPath: "C:\\Program Files\\Panjie\\bin\\BaiduPCS-Go\\BaiduPCS-Go.exe"
    });

    expect(script).toContain("title BaiduPCS-Go 登录");
    expect(script).toContain('cd /d "C:\\Program Files\\Panjie\\bin\\BaiduPCS-Go"');
    expect(script).toContain('"C:\\Program Files\\Panjie\\bin\\BaiduPCS-Go\\BaiduPCS-Go.exe" login');
  });

  it("opens cmd.exe through Start-Process without using the window title as executable", () => {
    const args = buildLoginStartArgs("C:\\Users\\ASUS\\AppData\\Roaming\\Panjie\\runtime\\baidupcs-login.cmd");

    expect(args).toEqual([
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      "Start-Process -FilePath 'cmd.exe' -ArgumentList @('/k', 'C:\\Users\\ASUS\\AppData\\Roaming\\Panjie\\runtime\\baidupcs-login.cmd') -WindowStyle Normal"
    ]);
    expect(args[3]).toBe("-Command");
    expect(args[4]).toContain("Start-Process -FilePath 'cmd.exe'");
    expect(args[4]).not.toContain("BaiduPCS-Go 登录");
  });
});
