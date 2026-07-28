import { createContext, useContext, useMemo } from "react";
import { useControls } from "leva";

const DEBUG_SCHEMA = {
  showAlignGuide: { value: false, label: "Align guide" },
};

const DebugCtrlContext = createContext(null);

/** Leva "Debug" folder for stage overlays / non-shader toggles. */
export function DebugControlsProvider({ children }) {
  const flat = useControls("Debug", DEBUG_SCHEMA);
  const value = useMemo(() => flat, [flat]);
  return (
    <DebugCtrlContext.Provider value={value}>{children}</DebugCtrlContext.Provider>
  );
}

export function useDebugCtrl() {
  const ctrl = useContext(DebugCtrlContext);
  if (!ctrl) {
    throw new Error("useDebugCtrl must be used within DebugControlsProvider");
  }
  return ctrl;
}
