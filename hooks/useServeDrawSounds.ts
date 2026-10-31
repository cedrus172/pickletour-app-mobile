import { useAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { AppState } from "react-native";

type SoundKind = "coin" | "color" | "wheel" | "result";

/** Draw audio follows the animation; cancellation also invalidates pending async playback. */
export function useServeDrawSounds(visible: boolean, enabled: boolean) {
  const coin = useAudioPlayer(visible ? require("@/assets/sfx/serve-draw/coin.wav") : null);
  const color = useAudioPlayer(visible ? require("@/assets/sfx/serve-draw/color.wav") : null);
  const wheel = useAudioPlayer(visible ? require("@/assets/sfx/serve-draw/wheel.wav") : null);
  const result = useAudioPlayer(visible ? require("@/assets/sfx/serve-draw/result.wav") : null);
  const players = useMemo(() => ({ coin, color, wheel, result }), [coin, color, wheel, result]);
  const generation = useRef(0);
  const gate = useRef({ visible, enabled });
  gate.current = { visible, enabled };
  const audioMode = useRef<Promise<void>>(Promise.resolve());
  const pendingLoad = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    generation.current += 1;
    pendingLoad.current?.();
    pendingLoad.current = null;
    Object.values(players).forEach((player) => {
      try { player.pause(); } catch { /* Player may already be released on unmount. */ }
    });
  }, [players]);

  useEffect(() => {
    if (!visible || !enabled) { stop(); return; }
    // Do not change recording permissions/mode used by referee voice commands.
    audioMode.current = setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "mixWithOthers" }).catch(() => {});
    Object.values(players).forEach((player) => { player.volume = 0.55; player.loop = false; });
  }, [visible, enabled, players, stop]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") stop();
    });
    return () => { subscription.remove(); stop(); };
  }, [stop]);

  const play = useCallback(async (kind: SoundKind) => {
    stop();
    if (!gate.current.visible || !gate.current.enabled || (AppState.currentState && AppState.currentState !== "active")) return;
    const request = generation.current;
    const startedAt = Date.now();
    const current = () => generation.current === request && gate.current.visible && gate.current.enabled;
    try {
      await audioMode.current;
      if (!current()) return;
      const player: AudioPlayer = players[kind];
      if (!player.isLoaded) {
        await new Promise<void>((resolve) => {
          const complete = () => { subscription.remove(); clearTimeout(timeout); if (pendingLoad.current === complete) pendingLoad.current = null; resolve(); };
          const subscription = player.addListener("playbackStatusUpdate", (status) => { if (status.isLoaded) complete(); });
          const timeout = setTimeout(complete, 600);
          pendingLoad.current = complete;
          if (player.isLoaded) complete();
        });
      }
      if (!current() || !player.isLoaded) return;
      // Loading latency must not leave the running sound playing after the reveal.
      const offset = kind === "result" ? 0 : (Date.now() - startedAt) / 1000;
      if (kind !== "result" && offset >= 2.2) return;
      await player.seekTo(offset);
      if (current()) player.play();
    } catch { /* Audio must never block scoring, animation, or the draw result. */ }
  }, [players, stop]);

  return useMemo(() => ({
    start: (mode: "coin" | "color" | "wheel") => { void play(mode); },
    finish: () => { void play("result"); },
    stop,
  }), [play, stop]);
}
