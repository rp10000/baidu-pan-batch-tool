# bdpan Smoke Report

generatedAt: 2026-06-10T15:08:47.410Z

## Environment

- Windows WSL: available
- WSL distro: docker-desktop
- Node: missing
- npm: missing
- npx: missing
- bdpan: not installed
- bdpan path: not found
- loginStatus: unverified
- displayName: unverified

## Test Share

shareUrl: <redacted>
pwd: <redacted>
provided: false

## Checks

| command | status | message |
| --- | --- | --- |
| bridge | fail | fetch failed |
| whoami | fail | bdpan not installed |
| mkdir | skipped | bdpan not installed |
| ls | skipped | bdpan not installed |
| transfer | skipped | TEST_SHARE_URL not provided |
| rename | skipped | TEST_SHARE_URL not provided |
| mv | skipped | TEST_SHARE_URL not provided |
| share | skipped | TEST_SHARE_URL not provided |

## Notes

- WSL has no complete Node/npm/npx environment; bdpan installation was skipped.
- bdpan executable was not found in WSL PATH.
