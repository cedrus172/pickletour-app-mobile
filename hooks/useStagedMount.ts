// hooks/useStagedMount.ts
// Dựng dần các khối nằm dưới màn hình đầu tiên (trang chủ…): khung hình đầu chỉ dựng phần đang
// nhìn thấy; sau khi hết tương tác/animation mới mở lần lượt từng "tầng" (mỗi tầng tự gọi API của
// nó). Người dùng bắt đầu cuộn thì mở hết ngay để không thấy chỗ trống.
import { useCallback, useEffect, useRef, useState } from "react";
import { InteractionManager } from "react-native";

export function useStagedMount(total: number, stepMs = 140) {
  const [stage, setStage] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const task = InteractionManager.runAfterInteractions(() => {
      for (let i = 1; i <= total; i++) {
        timers.push(
          setTimeout(() => {
            if (!cancelled) setStage((s) => (s >= i ? s : i));
          }, (i - 1) * stepMs),
        );
      }
    });
    return () => {
      cancelled = true;
      task.cancel();
      timers.forEach(clearTimeout);
    };
  }, [total, stepMs]);

  /** Gắn vào onScrollBeginDrag: cuộn là mở hết các tầng còn lại. */
  const revealAll = useCallback(() => {
    if (done.current) return;
    done.current = true;
    setStage(total);
  }, [total]);

  return { stage, revealAll };
}
