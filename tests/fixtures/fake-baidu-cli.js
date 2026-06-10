#!/usr/bin/env node

const scenario = process.env.FAKE_BAIDU_CLI_SCENARIO || "complete";
const args = process.argv.slice(2);
const command = args[0];

if (args.includes("--version")) {
  console.log("BaiduPCS-Go version v4.0.1-fake");
  process.exit(0);
}

if (command === "help" || !command) {
  console.log("login who ls mkdir upload mv transfer share unsupported_transfer unsupported_share manual_cookie_required");
  process.exit(0);
}

if (command === "login") {
  if (scenario === "manual_cookie_required") {
    console.error("manual cookie required");
    process.exit(2);
  }
  console.log("login ok");
  process.exit(0);
}

if (command === "who") {
  if (scenario === "not_logged_in") {
    console.error("未登录");
    process.exit(1);
  }
  console.log("uid: <redacted>");
  process.exit(0);
}

if (command === "transfer" && scenario === "unsupported_transfer") {
  console.error("unsupported transfer");
  process.exit(3);
}

if (command === "share" && scenario === "unsupported_share") {
  console.error("unsupported share");
  process.exit(3);
}

if (["ls", "mkdir", "upload", "mv", "transfer", "share", "quota"].includes(command)) {
  console.log("ok");
  process.exit(0);
}

console.error(`unknown command: ${command}`);
process.exit(2);
