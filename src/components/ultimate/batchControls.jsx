import { createContext, useContext, useMemo } from "react";
import { useControls } from "leva";

/** Default reflect-cycle phase lengths in seconds. */
export const BATCH_DEFAULTS = {
  fadeSec: 1.5,
  holdSec: 1.5,
  revealSec: 1.5,
  /** Reserved for auto reflect; not wired yet. */
  intervalSec: 3 * 60,
};

const BATCH_SCHEMA = {
  fadeSec: {
    value: BATCH_DEFAULTS.fadeSec,
    min: 0.2,
    max: 10,
    step: 0.1,
    label: "Fade to gray (s)",
  },
  holdSec: {
    value: BATCH_DEFAULTS.holdSec,
    min: 0.2,
    max: 10,
    step: 0.1,
    label: "Loading hold (s)",
  },
  revealSec: {
    value: BATCH_DEFAULTS.revealSec,
    min: 0.2,
    max: 10,
    step: 0.1,
    label: "Reveal (s)",
  },
};

const BatchCtrlContext = createContext(null);

/** Separate Leva root panel folder for batch / reflect timings. */
export function BatchControlsProvider({ children }) {
  const flat = useControls("Batch Reflect", BATCH_SCHEMA);
  const value = useMemo(() => flat, [flat]);
  return (
    <BatchCtrlContext.Provider value={value}>{children}</BatchCtrlContext.Provider>
  );
}

export function useBatchCtrl() {
  const ctrl = useContext(BatchCtrlContext);
  if (!ctrl) {
    throw new Error("useBatchCtrl must be used within BatchControlsProvider");
  }
  return ctrl;
}
