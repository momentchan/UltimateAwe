import { LevaWrapper } from "@core";
import { Route, Switch } from "wouter";
import UltimateStage from "../components/ultimate/UltimateStage";
import UnitySimulator from "../components/ultimate/UnitySimulator";
import { BlobShaderControlsProvider } from "../components/ultimate/blobShaderControls";
import { BatchControlsProvider } from "../components/ultimate/batchControls";
import { DebugControlsProvider } from "../components/ultimate/debugControls";

function DisplayApp() {
  return (
    <BlobShaderControlsProvider>
      <BatchControlsProvider>
        <DebugControlsProvider>
          {/* Leva: H — separate from Debug panel (D) */}
          <LevaWrapper dock="top-right" initialHidden={true} />
          <UltimateStage />
        </DebugControlsProvider>
      </BatchControlsProvider>
    </BlobShaderControlsProvider>
  );
}

export default function App() {
  return (
    <Switch>
      <Route path="/sim" component={UnitySimulator} />
      <Route path="/" component={DisplayApp} />
      <Route component={DisplayApp} />
    </Switch>
  );
}
