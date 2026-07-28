import { createContext, useContext, useMemo } from "react";
import { folder, useControls } from "leva";
import { TYPES } from "./assets";
import { TYPE_ORDER } from "./ultimateData";

/** Default layer params (hole-normalized, y-down like CSS).
 *  Centers sit near the blob edge, under the outside radar dots/labels.
 *  Radii are large so every type can tint the whole blob, not just locally. */
export const LAYER_DEFAULTS = {
  absorb: {
    cx: 0.5,
    cy: 0.08,
    rx: 0.95,
    ry: 0.9,
    speed: 0.21,
    amp: 0.015,
    phase: 0.0,
    enabled: true,
  },
  transform: {
    cx: 0.9,
    cy: 0.3,
    rx: 0.95,
    ry: 0.9,
    speed: 0.31,
    amp: 0.03,
    phase: 4.4,
    enabled: true,
  },
  withdraw: {
    cx: 0.78,
    cy: 0.88,
    rx: 0.95,
    ry: 0.9,
    speed: 0.27,
    amp: 0.035,
    phase: 3.1,
    enabled: true,
  },
  reflect: {
    cx: 0.22,
    cy: 0.88,
    rx: 0.95,
    ry: 0.9,
    speed: 0.24,
    amp: 0.035,
    phase: 5.6,
    enabled: true,
  },
  diffuse: {
    cx: 0.1,
    cy: 0.3,
    rx: 0.95,
    ry: 0.9,
    speed: 0.34,
    amp: 0.03,
    phase: 1.7,
    enabled: true,
  },
};

/** Draw order: base → accents (last wins when overlapping). */
export const LAYER_DRAW_ORDER = [
  "absorb",
  "diffuse",
  "withdraw",
  "transform",
  "reflect",
];

/**
 * Leva folders flatten keys into the parent object, so every control id must be
 * unique across folders (absorbCx vs reflectCx).
 */
function layerFolderSchema(typeId) {
  const d = LAYER_DEFAULTS[typeId];
  return folder(
    {
      [`${typeId}Enabled`]: { value: d.enabled, label: "Enabled" },
      [`${typeId}Cx`]: { value: d.cx, min: 0, max: 1, step: 0.01, label: "Center X" },
      [`${typeId}Cy`]: { value: d.cy, min: 0, max: 1, step: 0.01, label: "Center Y" },
      [`${typeId}Rx`]: { value: d.rx, min: 0.05, max: 2, step: 0.01, label: "Radius X" },
      [`${typeId}Ry`]: { value: d.ry, min: 0.05, max: 2, step: 0.01, label: "Radius Y" },
      [`${typeId}Speed`]: { value: d.speed, min: 0, max: 1.5, step: 0.01, label: "Drift speed" },
      [`${typeId}Amp`]: { value: d.amp, min: 0, max: 0.2, step: 0.005, label: "Drift amp" },
      [`${typeId}Phase`]: {
        value: d.phase,
        min: 0,
        max: Math.PI * 2,
        step: 0.05,
        label: "Phase",
      },
    },
    { collapsed: true, color: TYPES[typeId].color },
  );
}

export function layerFromCtrl(ctrl, typeId) {
  return {
    enabled: Boolean(ctrl[`${typeId}Enabled`]),
    cx: ctrl[`${typeId}Cx`],
    cy: ctrl[`${typeId}Cy`],
    rx: ctrl[`${typeId}Rx`],
    ry: ctrl[`${typeId}Ry`],
    speed: ctrl[`${typeId}Speed`],
    amp: ctrl[`${typeId}Amp`],
    phase: ctrl[`${typeId}Phase`],
  };
}

const BLOB_SHADER_SCHEMA = (() => {
  const schema = {
    baseColor: { value: "#f2f0ec", label: "Base color" },
    fullAtPercent: {
      value: 5,
      min: 5,
      max: 100,
      step: 1,
      label: "Full at %",
    },
    colorSharpness: {
      value: 1.3,
      min: 0.5,
      max: 4,
      step: 0.05,
      label: "Color sharpness",
    },
    vibrance: {
      value: 2.5,
      min: 0.5,
      max: 2.5,
      step: 0.05,
      label: "Vibrance",
    },
    noiseEnabled: { value: true, label: "UV noise" },
    noiseAmount: {
      value: 0.2,
      min: 0,
      max: 0.35,
      step: 0.005,
      label: "Noise amount",
    },
    noiseScale: {
      value: 2.4,
      min: 0.2,
      max: 8,
      step: 0.05,
      label: "Noise scale",
    },
    noiseSpeed: {
      value: 1,
      min: 0,
      max: 1.5,
      step: 0.01,
      label: "Noise speed",
    },
    showLayerDebug: { value: true, label: "Show layer positions" },
    "Loading fill": folder(
      {
        loadingBase: { value: "#b4b2b0", label: "Base" },
        loadingSharpness: {
          value: 2.56,
          min: 0.4,
          max: 3,
          step: 0.05,
          label: "Falloff sharpness",
        },
        loadingHiColor: { value: "#f0efed", label: "Highlight" },
        loadingHiCx: {
          value: 0.84,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Hi center X",
        },
        loadingHiCy: {
          value: 0.51,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Hi center Y",
        },
        loadingHiRx: {
          value: 0.93,
          min: 0.1,
          max: 1.5,
          step: 0.01,
          label: "Hi radius X",
        },
        loadingHiRy: {
          value: 0.61,
          min: 0.1,
          max: 1.5,
          step: 0.01,
          label: "Hi radius Y",
        },
        loadingHiStrength: {
          value: 1.57,
          min: 0,
          max: 2,
          step: 0.01,
          label: "Hi strength",
        },
        loadingLoColor: { value: "#454140", label: "Shadow" },
        loadingLoCx: {
          value: 0.27,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Lo center X",
        },
        loadingLoCy: {
          value: 0.77,
          min: 0,
          max: 1,
          step: 0.01,
          label: "Lo center Y",
        },
        loadingLoRx: {
          value: 0.85,
          min: 0.1,
          max: 1.5,
          step: 0.01,
          label: "Lo radius X",
        },
        loadingLoRy: {
          value: 0.93,
          min: 0.1,
          max: 1.5,
          step: 0.01,
          label: "Lo radius Y",
        },
        loadingLoStrength: {
          value: 1.58,
          min: 0,
          max: 2,
          step: 0.01,
          label: "Lo strength",
        },
      },
      { collapsed: false },
    ),
  };
  TYPE_ORDER.forEach((typeId) => {
    // Folder title = English type name; control ids stay prefixed (absorbCx…)
    // because leva flattens folder keys into the parent object.
    schema[TYPES[typeId].en] = layerFolderSchema(typeId);
  });
  return schema;
})();

const BlobShaderCtrlContext = createContext(null);

/**
 * Always-mounted host so Leva registers controls even in Loading mode
 * (otherwise the panel is empty and H appears to do nothing).
 */
export function BlobShaderControlsProvider({ children }) {
  const flat = useControls("Blob Shader", BLOB_SHADER_SCHEMA);
  const value = useMemo(() => flat, [flat]);
  return (
    <BlobShaderCtrlContext.Provider value={value}>
      {children}
    </BlobShaderCtrlContext.Provider>
  );
}

export function useBlobShaderCtrl() {
  const ctrl = useContext(BlobShaderCtrlContext);
  if (!ctrl) {
    throw new Error("useBlobShaderCtrl must be used within BlobShaderControlsProvider");
  }
  return ctrl;
}
