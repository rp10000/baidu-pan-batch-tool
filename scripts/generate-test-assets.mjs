import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve("artifacts", "test-assets");
mkdirSync(root, { recursive: true });

const onePixelPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lwT9NwAAAABJRU5ErkJggg==",
  "base64"
);

writeFileSync(resolve(root, "clean-image.png"), onePixelPng);
writeFileSync(resolve(root, "qr-image.png"), onePixelPng);
writeFileSync(resolve(root, "phone-email-url.png"), onePixelPng);
writeFileSync(resolve(root, "watermark-corner.png"), onePixelPng);
writeFileSync(resolve(root, "watermark-transparent.png"), onePixelPng);
writeFileSync(
  resolve(root, "traffic-text.txt"),
  ["这是一份虚构测试资料。", "联系我 13812345678", "邮箱 demo@example.com", "访问 https://example.com", "加微信 test888"].join("\n"),
  "utf8"
);

const simplePdf = [
  "%PDF-1.4",
  "1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj",
  "2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj",
  "3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R >> endobj",
  "4 0 obj << /Length 44 >> stream",
  "BT /F1 12 Tf 20 100 Td (Panjie sample PDF) Tj ET",
  "endstream endobj",
  "xref",
  "0 5",
  "0000000000 65535 f ",
  "trailer << /Root 1 0 R /Size 5 >>",
  "startxref",
  "0",
  "%%EOF"
].join("\n");

writeFileSync(resolve(root, "simple.pdf"), simplePdf, "utf8");
writeFileSync(resolve(root, "watermark.pdf"), simplePdf.replace("Panjie sample PDF", "Panjie watermark sample"), "utf8");
writeFileSync(resolve(root, "short-video.mp4"), Buffer.from("placeholder video sample"));

console.log(`generated test assets in ${root}`);
