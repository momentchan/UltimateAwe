import { LevaWrapper } from "@core";
import { Route, Switch } from "wouter";
import UltimateStage from "../components/ultimate/UltimateStage";
import UnitySimulator from "../components/ultimate/UnitySimulator";
import { BlobShaderControlsProvider } from "../components/ultimate/blobShaderControls";
import { BatchControlsProvider } from "../components/ultimate/batchControls";
import { DebugControlsProvider } from "../components/ultimate/debugControls";

/** Single display route. D = debug panel, H = Leva. `/sim` stays separate. */
function DisplayApp() {
  return (
    <BlobShaderControlsProvider>
      <BatchControlsProvider>
        <DebugControlsProvider>
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
