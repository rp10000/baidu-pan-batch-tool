import { describe, expect, it } from "vitest";
import { createMockBaiduAdapter } from "./baiduAdapter";

describe("createMockBaiduAdapter", () => {
  it("exposes the required capability matrix with explicit unknown defaults", () => {
    const adapter = createMockBaiduAdapter();

    expect(adapter.getCapabilityMatrix()).toEqual({
      can_oauth_login: "unknown_needs_manual_verification",
      can_list_files: "unknown_needs_manual_verification",
      can_mkdir: "unknown_needs_manual_verification",
      can_transfer_shared_link: "unknown_needs_manual_verification",
      can_create_share_link: "unknown_needs_manual_verification",
      can_move_file: "unknown_needs_manual_verification",
      can_get_share_file_metadata: "unknown_needs_manual_verification"
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
