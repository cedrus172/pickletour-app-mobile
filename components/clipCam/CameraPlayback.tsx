import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import { setAudioModeAsync } from "expo-audio";
import { Text } from "@/components/ui/i18nText";
import type { ThemeTokens } from "@/hooks/useThemeTokens";
import { cameraCanSeekLocally, cameraFrameTime } from "@/utils/clipPlayback";

export type CameraPlaybackHandle = { currentTimeMs: () => number; seekToTime: (timeMs: number) => boolean; toggle: () => void };
type Props = { uri: string; mode: "live" | "playback"; originMs: number; autoPlay: boolean; C: ThemeTokens; onPlayingChange: (playing: boolean) => void };

const CameraPlayback = forwardRef<CameraPlaybackHandle, Props>(function CameraPlayback({ uri, mode, originMs, autoPlay, C, onPlayingChange }, ref) {
  const player = useVideoPlayer({ uri, contentType: "hls" }, (p) => {
    p.loop = false; p.muted = false; p.timeUpdateEventInterval = 1; if (autoPlay) p.play();
  });
  const video = useRef<VideoView>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [time, setTime] = useState(originMs);
  const handlers = useRef({ onPlayingChange }); handlers.current = { onPlayingChange };
  const readTime = () => cameraFrameTime(mode, originMs, player.currentTime, player.currentLiveTimestamp, player.currentOffsetFromLive);
  useEffect(() => { void setAudioModeAsync({ playsInSilentMode: true }).catch(() => {}); }, []);
  useEffect(() => {
    handlers.current.onPlayingChange(player.playing);
    const playing = player.addListener("playingChange", ({ isPlaying }) => handlers.current.onPlayingChange(isPlaying));
    const progress = player.addListener("timeUpdate", (event) => {
      const next = cameraFrameTime(mode, originMs, event.currentTime, event.currentLiveTimestamp, event.currentOffsetFromLive);
      setTime(next);
    });
    return () => { playing.remove(); progress.remove(); };
  }, [player, mode, originMs]);
  useImperativeHandle(ref, () => ({
    currentTimeMs: readTime,
    seekToTime(timeMs) {
      if (!cameraCanSeekLocally(mode, player.isLive, originMs, timeMs, player.duration)) return false;
      player.currentTime = (timeMs - originMs) / 1000;
      setTime(timeMs); return true;
    },
    toggle() { if (player.playing) player.pause(); else player.play(); },
  }));
  const date = new Date(time), pad = (n: number) => String(n).padStart(2, "0");
  return (
    <View testID="camera-playback-video" style={styles.frame}>
      <VideoView ref={video} player={player} style={StyleSheet.absoluteFill} nativeControls={fullscreen || !C.isV2} contentFit="contain" onFullscreenEnter={() => setFullscreen(true)} onFullscreenExit={() => setFullscreen(false)} />
      <View pointerEvents="none" style={[styles.pill, { left: 10, top: 10 }]}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.primary }} /><Text style={{ color: C.primary, fontSize: 12, fontWeight: "700" }}>{mode === "playback" ? "Đang xem lại" : "Trực tiếp"}</Text></View>
      <View pointerEvents="none" style={[styles.pill, { left: 10, bottom: 10 }]}><Text style={{ color: "#F0F6FF", fontSize: 12, fontWeight: "600" }}>{`${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())} · ${pad(date.getDate())}/${pad(date.getMonth() + 1)}`}</Text></View>
      {C.isV2 && <Pressable accessibilityRole="button" accessibilityLabel="Xem toàn màn hình" onPress={() => { void video.current?.enterFullscreen().catch(() => {}); }} style={[styles.pill, { right: 8, bottom: 8, width: 44, height: 44, justifyContent: "center" }]}><Ionicons name="scan-outline" size={23} color="#F0F6FF" /></Pressable>}
    </View>
  );
});
export default CameraPlayback;
const styles = StyleSheet.create({ frame: { width: "100%", aspectRatio: 16 / 9, borderRadius: 12, overflow: "hidden", backgroundColor: "#000" }, pill: { position: "absolute", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "rgba(2,14,29,0.78)", flexDirection: "row", alignItems: "center", gap: 6 } });
