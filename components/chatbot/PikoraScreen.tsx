import React from "react";

import { PikoraSurface } from "./PikoraSurface";

type PikoraScreenProps = {
  bottomPaddingOffset?: number;
  onBack?: (() => void) | null;
};

export default function PikoraScreen({
  bottomPaddingOffset = 0,
  onBack = null,
}: PikoraScreenProps) {
  return (
    <PikoraSurface
      presentation="screen"
      bottomPaddingOffset={bottomPaddingOffset}
      onBack={onBack}
    />
  );
}
