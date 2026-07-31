import { Leva } from "leva";
import { Route, Switch, useLocation } from "wouter";
import { LevaWrapper } from "@core";
import UltimateStage from "../components/ultimate/UltimateStage";
import UnitySimulator from "../components/ultimate/UnitySimulator";
import { BlobShaderControlsProvider } from "../components/ultimate/blobShaderControls";
import { BatchControlsProvider } from "../components/ultimate/batchControls";
import { DebugControlsProvider } from "../components/ultimate/debugControls";

function DisplayApp() {
  const [location] = useLocation();
  const isDebug = location === "/debug";

  return (
    <BlobShaderControlsProvider>
      <BatchControlsProvider>
        <DebugControlsProvider>
          {isDebug ? <LevaWrapper dock="top-right" /> : <Leva hidden />}
          <UltimateStage showDebug={isDebug} />
        </DebugControlsProvider>
      </BatchControlsProvider>
    </BlobShaderControlsProvider>
  );
}

export default function App() {
  return (
    <Switch>
      <Route path="/sim" component={UnitySimulator} />
      <Route path="/debug" component={DisplayApp} />
      <Route path="/" component={DisplayApp} />
      <Route component={DisplayApp} />
    </Switch>
  );
}
