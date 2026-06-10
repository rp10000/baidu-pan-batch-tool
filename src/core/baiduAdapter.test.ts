import { describe, expect, it } from "vitest";
import { createMockBaiduAdapter } from "./baiduAdapter";

describe("createMockBaiduAdapter", () => {
  it("exposes the required capability matrix with explicit verification defaults", () => {
    const adapter = createMockBaiduAdapter();

    expect(adapter.getCapabilityMatrix()).toEqual({
      can_oauth_login: "needs_official_verification",
      can_list_files: "needs_official_verification",
      can_mkdir: "needs_official_verification",
      can_transfer_shared_link: "needs_official_verification",
      can_create_share_link: "needs_official_verification",
      can_move_file: "needs_official_verification",
      can_get_share_file_metadata: "needs_official_verification"
    });
  });

  it("lets tests and UI override verified mock capabilities", () => {
    const adapter = createMockBaiduAdapter({
      can_oauth_login: "supported",
      can_transfer_shared_link: "unsupported"
    });

    expect(adapter.getCapabilityMatrix().can_oauth_login).toBe("supported");
    expect(adapter.getCapabilityMatrix().can_transfer_shared_link).toBe("unsupported");
  });
});
