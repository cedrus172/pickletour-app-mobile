// utils/facebookAuth.ts
// Đăng nhập / liên kết Facebook qua web-auth (expo-web-browser), KHÔNG dùng SDK native
// → OTA được. Backend trả URL Facebook; sau khi xong nó chuyển hướng về
// pickletourapp://fb-auth?fb=...  và openAuthSessionAsync bắt lại URL đó.
import * as WebBrowser from "expo-web-browser";

export const FB_AUTH_REDIRECT = "pickletourapp://fb-auth";

export type FbAuthParams = Record<string, string>;

function decodePart(v: string) {
  try {
    return decodeURIComponent(v.replace(/\+/g, " "));
  } catch {
    return v;
  }
}

/** Tách query (và fragment) của URL callback thành object. */
export function parseFacebookAuthUrl(url: string): FbAuthParams {
  const out: FbAuthParams = {};
  const raw = String(url || "");
  const qIdx = raw.indexOf("?");
  const hIdx = raw.indexOf("#");
  const parts: string[] = [];
  if (qIdx >= 0) parts.push(raw.slice(qIdx + 1, hIdx > qIdx ? hIdx : undefined));
  if (hIdx >= 0) parts.push(raw.slice(hIdx + 1));
  for (const part of parts) {
    for (const pair of part.split("&")) {
      if (!pair) continue;
      const eq = pair.indexOf("=");
      const k = decodePart(eq >= 0 ? pair.slice(0, eq) : pair);
      const v = decodePart(eq >= 0 ? pair.slice(eq + 1) : "");
      if (k && !(k in out)) out[k] = v;
    }
  }
  return out;
}

/**
 * Mở trình duyệt xác thực Facebook. Trả về params của URL callback,
 * hoặc null nếu người dùng tự đóng trình duyệt.
 */
export async function openFacebookAuthSession(
  url: string,
  redirect?: string | null,
): Promise<FbAuthParams | null> {
  const redirectUrl = String(redirect || FB_AUTH_REDIRECT);
  const result = await WebBrowser.openAuthSessionAsync(url, redirectUrl);
  if (result.type !== "success" || !result.url) return null;
  return parseFacebookAuthUrl(result.url);
}

/** Lấy message lỗi từ lỗi RTK Query / Error. */
export function facebookAuthErrorMessage(err: any, fallback: string) {
  return String(
    err?.data?.message || err?.data?.error || err?.message || err?.error || fallback,
  );
}
