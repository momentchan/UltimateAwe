import { Leva } from "leva";
import { useLocation } from "wouter";
import { LevaWrapper } from "@core";
import UltimateStage from "../components/ultimate/UltimateStage";
import { BlobShaderControlsProvider } from "../components/ultimate/blobShaderControls";
import { BatchControlsProvider } from "../components/ultimate/batchControls";
import { DebugControlsProvider } from "../components/ultimate/debugControls";

export default function App() {
  const [location] = useLocation();
  const isDebug = location === "/debug";

  return (
    <BlobShaderControlsProvider>
      <BatchControlsProvider>
        <DebugControlsProvider>
          {/* Controls always register; panel only on /debug (H to toggle there). */}
          {isDebug ? <LevaWrapper dock="top-right" /> : <Leva hidden />}
          <UltimateStage />
        </DebugControlsProvider>
      </BatchControlsProvider>
    </BlobShaderControlsProvider>
  );
}
