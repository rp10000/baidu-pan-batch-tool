export const BAIDU_CAPABILITY_NAMES = [
  "can_oauth_login",
  "can_list_files",
  "can_mkdir",
  "can_transfer_shared_link",
  "can_create_share_link",
  "can_move_file",
  "can_get_share_file_metadata"
] as const;

export type BaiduCapabilityName = (typeof BAIDU_CAPABILITY_NAMES)[number];
export type BaiduCapabilityStatus = "supported" | "unsupported" | "needs_official_verification";
export type BaiduCapabilityMatrix = Record<BaiduCapabilityName, BaiduCapabilityStatus>;

export interface BaiduAdapter {
  getCapabilityMatrix(): BaiduCapabilityMatrix;
}

const UNKNOWN_MATRIX = Object.fromEntries(
  BAIDU_CAPABILITY_NAMES.map((name) => [name, "needs_official_verification"])
) as BaiduCapabilityMatrix;

export function createMockBaiduAdapter(
  overrides: Partial<BaiduCapabilityMatrix> = {}
): BaiduAdapter {
  const matrix: BaiduCapabilityMatrix = {
    ...UNKNOWN_MATRIX,
    ...overrides
  };

  return {
    getCapabilityMatrix() {
      return { ...matrix };
    }
  };
}
