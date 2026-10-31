/** Thời điểm tuyệt đối của khung hình; ưu tiên metadata HLS nếu máy sân có gửi. */
export function cameraFrameTime(mode: "live" | "playback", originMs: number, seconds: number, liveTimestamp: number | null, liveOffset: number | null, now = Date.now()) {
  const expected = originMs + Math.max(0, Number.isFinite(seconds) ? seconds : 0) * 1000;
  // Một số đầu ghi gắn giờ encode hiện tại vào playback, không phải giờ khung hình cũ.
  if (Number.isFinite(liveTimestamp) && (liveTimestamp || 0) > 0 && (mode === "live" || Math.abs(liveTimestamp! - expected) <= 60_000)) return Math.min(liveTimestamp!, now);
  if (mode === "live" && Number.isFinite(liveOffset) && liveOffset !== null) return now - Math.max(0, liveOffset) * 1000;
  return Math.min(now, expected);
}

/** Không tua quá hiện tại. Nguồn HLS đang cuốn cửa sổ phải mở lại đúng mốc NVR. */
export function cameraSeekTarget(currentMs: number, deltaSeconds: number, now = Date.now()) {
  return Math.max(0, Math.min(currentMs + deltaSeconds * 1000, now));
}

export function cameraCanSeekLocally(mode: "live" | "playback", isLive: boolean, originMs: number, targetMs: number, durationSeconds: number) {
  const offset = (targetMs - originMs) / 1000;
  return mode === "playback" && !isLive && Number.isFinite(durationSeconds) && durationSeconds > 0 && offset >= 0 && offset < durationSeconds;
}

/** Khoảng nhanh bắt đầu tại mốc người dùng chọn; không đưa giờ tương lai vào API. */
export function cameraCutRange(anchor: Date, seconds: number, now = Date.now()) {
  const start = new Date(Math.min(anchor.getTime(), now));
  return { start, end: new Date(Math.min(start.getTime() + seconds * 1000, now)) };
}

/** Giữ tên gốc nếu file không có timestamp bắt đầu, tránh suy đoán thời điểm trận. */
export function cameraHistoryTitle(name: string, channelName: string) {
  const match = name.match(/_(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})/);
  return match ? `${channelName} · ${match[3]}/${match[2]} · ${match[4]}:${match[5]}` : name;
}
