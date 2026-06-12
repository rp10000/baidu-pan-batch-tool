import { expect, test } from "@playwright/test";

const userLinks = [
  "https://pan.baidu.com/s/1draftA 提取码: a111",
  "https://pan.baidu.com/s/1draftB 提取码: b222",
  "https://pan.baidu.com/s/1draftC 提取码: c333"
].join("\n");

test("batch draft input survives page switching and clear does not restore sample", async ({ page }) => {
  await page.goto("/");
  const nav = page.locator('nav[aria-label="主导航"]');

  await nav.getByRole("button", { name: /批量处理/ }).click();
  const input = page.locator("#share-input");
  await expect(input).toHaveValue("");
  await input.fill(userLinks);
  await expect(page.getByLabel("链接识别统计")).toContainText("有效链接");

  await nav.getByRole("button", { name: /设置中心/ }).click();
  await expect(page.getByRole("heading", { name: "设置中心" })).toBeVisible();
  await nav.getByRole("button", { name: /扫描检查/ }).click();
  await expect(page.getByRole("heading", { name: "扫描检查" })).toBeVisible();
  await nav.getByRole("button", { name: /批量处理/ }).click();
  await expect(input).toHaveValue(userLinks);
  await page.screenshot({ path: "artifacts/screenshots/fix-batch-input-persist.png", fullPage: true });

  await page.getByRole("button", { name: "清空" }).click();
  await expect(input).toHaveValue("");
  await nav.getByRole("button", { name: /设置中心/ }).click();
  await nav.getByRole("button", { name: /批量处理/ }).click();
  await expect(input).toHaveValue("");

  await page.getByRole("button", { name: "恢复示例输入" }).click();
  await expect(input).toHaveValue(/https:\/\/pan\.baidu\.com\/s\/1abcDEF/);
});
