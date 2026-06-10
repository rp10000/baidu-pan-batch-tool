import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { platform } from "node:os";

const host = "127.0.0.1";
const port = Number.parseInt(process.env.PANJIE_BDPAN_BRIDGE_PORT ?? "17632", 10);
const allowedSubcommands = new Set([
  "whoami",
  "transfer",
  "ls",
  "mkdir",
  "rename",
  "mv",
  "download",
  "upload",
  "share"
]);

const server = createServer(async (request, response) => {
  setCorsHeaders(request, response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== "POST" || request.url !== "/bdpan/run") {
    response.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  try {
    const body = JSON.parse(await readBody(request));
    const command = validateCommand(body);
    const result = await runBdpan(command);
    response.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify(result));
  } catch (error) {
    response.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ exitCode: 2, stdout: "", stderr: error instanceof Error ? error.message : "bad_request" }));
  }
});

server.listen(port, host, () => {
  console.log(`Panjie bdpan bridge listening on http://${host}:${port}`);
});

function validateCommand(value) {
  if (!value || typeof value !== "object") {
    throw new Error("invalid_command");
  }

  if (!allowedSubcommands.has(value.subcommand)) {
    throw new Error("subcommand_not_allowed");
  }

  if (!Array.isArray(value.args) || !value.args.every((item) => typeof item === "string")) {
    throw new Error("invalid_args");
  }

  return {
    subcommand: value.subcommand,
    args: value.args
  };
}

function runBdpan(command) {
  const invocation = buildInvocation(command);
  return new Promise((resolve) => {
    const child = spawn(invocation.command, invocation.args, {
      shell: false,
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill();
      resolve({ exitCode: 124, stdout, stderr: "bdpan command timed out" });
    }, 120000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ exitCode: 127, stdout, stderr: error.message });
    });
    child.on("close", (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode: exitCode ?? 1, stdout, stderr });
    });
  });
}

function buildInvocation(command) {
  if (platform() === "win32") {
    return {
      command: "wsl.exe",
      args: ["--exec", "bdpan", command.subcommand, ...command.args]
    };
  }

  return {
    command: "bdpan",
    args: [command.subcommand, ...command.args]
  };
}

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 64 * 1024) {
        reject(new Error("request_too_large"));
      }
    });
    request.on("end", () => resolve(body || "{}"));
    request.on("error", reject);
  });
}

function setCorsHeaders(request, response) {
  const origin = request.headers.origin;
  const allowedOrigin =
    typeof origin === "string" && /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(origin)
      ? origin
      : `http://${host}:5173`;
  response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
