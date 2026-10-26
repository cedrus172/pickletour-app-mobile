// constants/pickclip.ts
// Danh sách venue có PickClip (mỗi venue = 1 Pi, expose API public qua Cloudflare Tunnel).
// Nguồn: PiTailscale/docs/README.md. Tạm cấu hình cứng ở đây; về sau có thể cho backend
// trả về (venue.piBaseUrl) rồi thay PICKCLIP_VENUES bằng dữ liệu fetch.

export type PickClipVenue = {
  id: string;
  name: string;
  /** Base URL public của Pi (không có dấu / cuối). */
  baseUrl: string;
  city?: string;
};

export const PICKCLIP_VENUES: PickClipVenue[] = [
  { id: "lavong", name: "Pickleball Lã Vọng", baseUrl: "https://lavong.pickletour.vn", city: "Hà Nội" },
  { id: "quangtrung", name: "Pickleball Quang Trung", baseUrl: "https://quangtrung.pickletour.vn", city: "Hà Nội" },
];
