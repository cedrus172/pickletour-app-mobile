import { useCallback, useEffect, useRef, useState } from "react";
import { Keyboard, Platform, View } from "react-native";
import type { KeyboardEvent } from "react-native";

export function useChatKeyboard(active = true) {
  const paneRef = useRef<View>(null);
  const [paneBottom, setPaneBottom] = useState(0);
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const isIos = Platform.OS === "ios";

  // Measure the full pane in the same coordinate space as the keyboard frame.
  // The keyboard padding belongs to this pane, so it cannot move its own boundary.
  const measurePane = useCallback(() => {
    if (!isIos) return;
    paneRef.current?.measureInWindow((_x, y, _width, height) => {
      if (height > 0) setPaneBottom(y + height);
    });
  }, [isIos]);

  useEffect(() => {
    if (!active || Platform.OS === "web") return;

    const show = (event: KeyboardEvent) => {
      setKeyboardTop(event.endCoordinates.screenY);
      measurePane();
    };
    const animateShow = (event: KeyboardEvent) => {
      Keyboard.scheduleLayoutAnimation(event);
      show(event);
    };
    const hide = () => setKeyboardTop(null);
    const subscriptions = [
      Keyboard.addListener("keyboardDidShow", show),
      Keyboard.addListener("keyboardDidHide", hide),
    ];
    if (isIos) {
      subscriptions.push(
        Keyboard.addListener("keyboardWillShow", animateShow),
        Keyboard.addListener("keyboardWillChangeFrame", animateShow),
        Keyboard.addListener("keyboardWillHide", (event) => {
          Keyboard.scheduleLayoutAnimation(event);
          hide();
        }),
      );
    }

    setKeyboardTop(Keyboard.metrics()?.screenY ?? null);
    measurePane();
    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, [active, isIos, measurePane]);

  // Android uses adjustResize and already has room for the keyboard.
  const keyboardOverlap = active && isIos && keyboardTop !== null
    ? Math.max(0, paneBottom - keyboardTop)
    : 0;
  const keyboardOpen = active && (isIos ? keyboardOverlap > 0 : keyboardTop !== null);

  return { paneRef, measurePane, keyboardOpen, keyboardOverlap };
}
