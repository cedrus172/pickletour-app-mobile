import { fetch as expoFetch } from "expo/fetch";
import { Platform } from "react-native";

import { BASE_URL, getDeviceId, getDeviceName } from "@/slices/apiSlice";

type StreamEventHandler = (event: string, data: Record<string, any>) => void;

type SendPikoraMessageStreamOptions = {
  token?: string;
  message: string;
  reasoningMode: string;
  assistantMode: string;
  verificationMode: string;
  pageSnapshot?: Record<string, unknown> | null;
  capabilityKeys?: string[];
  sessionFocusOverride?: Record<string, unknown> | null;
  cohortId?: string;
  currentPath?: string;
  currentUrl?: string;
  pageTitle?: string;
  pageType?: string;
  pageSection?: string;
  pageView?: string;
  clubId?: string;
  newsSlug?: string;
  profileUserId?: string;
  courtId?: string;
  knowledgeMode?: string;
  signal?: AbortSignal | null;
  onEvent?: StreamEventHandler;
};

function normalizeBaseUrl(value?: string | null) {
  return String(value || "")
    .trim()
    .replace(/^['"]+|['"]+$/g, "")
    .replace(/\/+$/, "");
}

function resolveChatStreamUrl(baseUrl?: string | null) {
  const normalized = normalizeBaseUrl(baseUrl);
  return /\/api$/i.test(normalized)
    ? `${normalized}/chat/stream`
    : `${normalized}/api/chat/stream`;
}

export class PikoraStreamError extends Error {
  constructor(
    message: string,
    readonly canUseJsonFallback = false,
    readonly status?: number,
  ) {
    super(message);
    this.name = "PikoraStreamError";
  }
}

function consumeSseChunk(
  buffer: string,
  chunk: string,
  onEvent?: StreamEventHandler,
) {
  const nextBuffer = `${buffer || ""}${chunk || ""}`;
  const records = nextBuffer.split(/\r?\n\r?\n/);
  const remainder = records.pop() ?? "";

  records.forEach((record) => {
    const lines = record.split(/\r?\n/);
    let eventName = "message";
    const dataLines: string[] = [];

    lines.forEach((line) => {
      if (!line) return;
      if (line.startsWith(":")) return;
      if (line.startsWith("event:")) {
        eventName = line.slice(6).trim() || "message";
        return;
      }
      if (line.startsWith("data:")) {
        dataLines.push(line.slice(5).trim());
      }
    });

    if (!dataLines.length) return;

    const rawData = dataLines.join("\n");
    if (rawData === "[DONE]") {
      onEvent?.("done", {});
      return;
    }

    let payload;
    try {
      payload = JSON.parse(rawData);
    } catch {
      return;
    }
    if (payload && typeof payload === "object") onEvent?.(eventName, payload);
  });

  return remainder;
}

export async function sendPikoraMessageStream(
  options: SendPikoraMessageStreamOptions,
) {
  const [deviceId, deviceName] = await Promise.all([
    getDeviceId(),
    getDeviceName(),
  ]);

  const headers: Record<string, string> = {
    Accept: "text/event-stream",
    "Content-Type": "application/json",
    "X-Platform": Platform.OS,
    "X-Device-Id": deviceId,
    "X-Device-Name": String(deviceName || "").replace(/[^\x20-\x7e]/g, " "),
    "x-pkt-surface": "mobile",
  };

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }
  if (options.currentPath) {
    headers["x-pkt-current-path"] = encodeURIComponent(options.currentPath);
  }
  if (options.currentUrl) {
    headers["x-pkt-current-url"] = encodeURIComponent(options.currentUrl);
  }
  if (options.pageTitle) {
    headers["x-pkt-page-title"] = encodeURIComponent(options.pageTitle);
  }
  if (options.pageType) {
    headers["x-pkt-page-type"] = encodeURIComponent(options.pageType);
  }
  if (options.pageSection) {
    headers["x-pkt-page-section"] = encodeURIComponent(options.pageSection);
  }
  if (options.pageView) {
    headers["x-pkt-page-view"] = encodeURIComponent(options.pageView);
  }
  if (options.clubId) {
    headers["x-pkt-club-id"] = encodeURIComponent(options.clubId);
  }
  if (options.newsSlug) {
    headers["x-pkt-news-slug"] = encodeURIComponent(options.newsSlug);
  }
  if (options.profileUserId) {
    headers["x-pkt-profile-user-id"] = encodeURIComponent(options.profileUserId);
  }
  if (options.courtId) {
    headers["x-pkt-court-id"] = encodeURIComponent(options.courtId);
  }
  if (options.cohortId) {
    headers["x-pkt-cohort-id"] = encodeURIComponent(options.cohortId);
  }

  const body = JSON.stringify({
    message: options.message,
    reasoningMode: options.reasoningMode,
    assistantMode: options.assistantMode,
    verificationMode: options.verificationMode,
    pageSnapshot: options.pageSnapshot || null,
    capabilityKeys: Array.isArray(options.capabilityKeys)
      ? options.capabilityKeys
      : [],
    sessionFocusOverride: options.sessionFocusOverride || null,
    knowledgeMode: options.knowledgeMode || "auto",
    cohortId: options.cohortId || "",
    surface: "mobile",
  });

  let response;
  try {
    response = await expoFetch(resolveChatStreamUrl(BASE_URL), {
      method: "POST",
      headers,
      body,
      signal: options.signal ?? undefined,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new PikoraStreamError("Không thể kết nối với Pikora.");
  }

  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new PikoraStreamError(
      detail?.message ||
        (response.status === 429
          ? "Bạn đã đạt giới hạn tin nhắn. Vui lòng thử lại sau."
          : "Pikora đang bận. Bạn thử lại nhé."),
      response.status === 404 || response.status === 405 || response.status === 501,
      response.status,
    );
  }

  if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new PikoraStreamError("Pikora chưa trả về luồng hội thoại.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let receivedResult = false;
  let finished = false;
  const handleEvent: StreamEventHandler = (event, data) => {
    if (event === "error") {
      throw new PikoraStreamError("Pikora chưa thể trả lời lúc này. Bạn thử lại nhé.");
    }
    if (event === "reply" || event === "message_done") {
      receivedResult ||= Boolean(
        String(data.text || data.reply || "").trim() ||
          data.answerCards?.length || data.actions?.length || data.workflow || data.mutationPreview,
      );
    }
    if (event === "done") finished = true;
    options.onEvent?.(event, data);
  };

  try {
    let next = await reader.read();
    while (!next.done) {
      buffer = consumeSseChunk(buffer, decoder.decode(next.value, { stream: true }), handleEvent);
      next = await reader.read();
    }
    consumeSseChunk(buffer, decoder.decode() + "\n\n", handleEvent);
    if (!finished || !receivedResult) {
      throw new PikoraStreamError("Pikora chưa gửi được câu trả lời đầy đủ. Bạn thử lại nhé.");
    }
  } catch (error) {
    void reader.cancel().catch(() => {});
    if (options.signal?.aborted || error instanceof PikoraStreamError) throw error;
    throw new PikoraStreamError("Kết nối với Pikora bị gián đoạn. Bạn thử lại nhé.");
  } finally {
    reader.releaseLock();
  }
}
