# Windows Local CLI Smoke Report

generatedAt: 2026-06-11T15:55:31.069Z
status: manual_auth_required

## CLI

- detected: true
- name: BaiduPCS-Go
- path: <repo>\tools\baidu-cli\BaiduPCS-Go\BaiduPCS-Go-v4.0.1-windows-x64\BaiduPCS-Go.exe
- version: BaiduPCS-Go version v4.0.1
- loginStatus: manual_auth_required
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
| whoami | manual_auth_required | login_required |
| mkdir | skipped | not_logged_in |
| upload | skipped | not_logged_in |
| rename | skipped | not_logged_in |
| mv | skipped | not_logged_in |
| transfer | blocked_missing_test_share | not_logged_in |
| share | skipped | not_logged_in |
