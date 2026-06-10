# Windows Local CLI Smoke Report

generatedAt: 2026-06-10T17:37:59.379Z
status: pass

## CLI

- detected: true
- name: BaiduPCS-Go
- version: BaiduPCS-Go version v4.0.1
- loginStatus: logged_in
- riskLevel: medium
- testRoot: 盘姬测试

## Checks

| check | status | message |
| --- | --- | --- |
| detect | pass | BaiduPCS-Go detected |
| version | pass | BaiduPCS-Go version v4.0.1 |
| help | pass | login, ls, mkdir, upload, mv, transfer, share |
| whoami | pass | logged_in_redacted |
| ls | pass | ok |
| mkdir | pass | ok |
| upload | pass | ok |
| rename | pass | ok |
| mkdir category | pass | ok |
| mv | pass | ok |
| transfer | skipped_missing_test_share | missing user test share |
| share | pass | generated_redacted |
