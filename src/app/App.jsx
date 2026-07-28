import { LevaWrapper } from "@core";
import UltimateStage from "../components/ultimate/UltimateStage";
import { BlobShaderControlsProvider } from "../components/ultimate/blobShaderControls";

export default function App() {
  return (
    <BlobShaderControlsProvider>
      {/* Press H to toggle. Docked right so it doesn't cover the counter panel. */}
      <LevaWrapper dock="top-right" />
      <UltimateStage />
    </BlobShaderControlsProvider>
  );
}
