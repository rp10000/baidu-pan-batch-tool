# Windows Local CLI Smoke Report

generatedAt: 2026-06-14T15:46:12.426Z
status: pass

## CLI

- detected: true
- name: BaiduPCS-Go
- path: <repo>\tools\baidu-cli\BaiduPCS-Go\BaiduPCS-Go-v4.0.1-windows-x64\BaiduPCS-Go.exe
- version: BaiduPCS-Go version v4.0.1
- loginStatus: logged_in
- loginStateSource: BaiduPCS-Go local config, not browser credentials
- configDir: %APPDATA%/BaiduPCS-Go
- riskLevel: medium
- testRoot: /盘姬测试

## Safety

- chromeCookieRead: false
- ckOrBdussRead: false
- browserUserDataRead: false
- networkCapture: false
- destructiveDelete: false

## Checks

| check | status | message |
| --- | --- | --- |
| detect | pass | BaiduPCS-Go detected |
| version | pass | BaiduPCS-Go version v4.0.1 |
| config | pass | local CLI config only; browser credentials were not read |
| help | pass | login, ls, mkdir, upload, mv, transfer, share |
| whoami | pass | logged_in_redacted |
| ls | pass | ok |
| mkdir | pass | ok |
| upload | pass | ok |
| rename | pass | ok |
| mkdir category | pass | ok |
| mv | pass | ok |
| share | pass | generated_redacted |
| transfer | pass | ui_draft_share_passed |
