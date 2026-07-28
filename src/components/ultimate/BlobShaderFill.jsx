import { Suspense, useLayoutEffect, useMemo } from "react";
import { Canvas, extend, useLoader, useThree } from "@react-three/fiber";
import { Color } from "three";
import { NodeMaterial, WebGPURenderer, TextureLoader } from "three/webgpu";
import {
  color,
  clamp,
  cos,
  float,
  length,
  max,
  mix,
  mx_noise_float,
  pow,
  sin,
  smoothstep,
  texture,
  time,
  uniform,
  uv,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import { ASSETS, TYPES, DESIGN } from "./assets";
import { TYPE_ORDER } from "./ultimateData";
import {
  LAYER_DEFAULTS,
  LAYER_DRAW_ORDER,
  layerFromCtrl,
  useBlobShaderCtrl,
} from "./blobShaderControls";

extend({ NodeMaterial });

/* Transparent hole punched in Background_2@.png, in 1x design px */
const HOLE = { x: 286, y: 993, w: 1585, h: 1094 };

function createLayerUniforms() {
  return Object.fromEntries(
    TYPE_ORDER.map((typeId) => {
      const d = LAYER_DEFAULTS[typeId];
      return [
        typeId,
        {
          enabled: uniform(d.enabled ? 1 : 0),
          cx: uniform(d.cx),
          cy: uniform(d.cy),
          rx: uniform(d.rx),
          ry: uniform(d.ry),
          speed: uniform(d.speed),
          amp: uniform(d.amp),
          phase: uniform(d.phase),
          strength: uniform(0),
        },
      ];
    }),
  );
}

function syncLayerUniforms(layerUniforms, ctrl, percentages) {
  const fullAt = Math.max(1, ctrl.fullAtPercent);
  TYPE_ORDER.forEach((typeId) => {
    const u = layerUniforms[typeId];
    const c = layerFromCtrl(ctrl, typeId);
    u.enabled.value = c.enabled ? 1 : 0;
    u.cx.value = c.cx;
    u.cy.value = c.cy;
    u.rx.value = c.rx;
    u.ry.value = c.ry;
    u.speed.value = c.speed;
    u.amp.value = c.amp;
    u.phase.value = c.phase;
    u.strength.value = (percentages[typeId] ?? 0) / fullAt;
  });
}

function GradientPlane({ entries, ctrl, layerUniforms }) {
  const maskTex = useLoader(TextureLoader, ASSETS.background);
  const size = useThree((s) => s.size);
  const baseColorU = useMemo(() => uniform(new Color("#c8c8c8")), []);
  const sharpnessU = useMemo(() => uniform(1.6), []);
  const vibranceU = useMemo(() => uniform(1.25), []);
  const noiseAmountU = useMemo(() => uniform(0.08), []);
  const noiseScaleU = useMemo(() => uniform(2.4), []);
  const noiseSpeedU = useMemo(() => uniform(0.18), []);

  useLayoutEffect(() => {
    const percentages = Object.fromEntries(
      entries.map((entry) => [entry.typeId, entry.percent]),
    );
    syncLayerUniforms(layerUniforms, ctrl, percentages);
    baseColorU.value.set(ctrl.baseColor);
    sharpnessU.value = ctrl.colorSharpness;
    vibranceU.value = ctrl.vibrance;
    // When disabled, amount goes to 0 so the graph stays hot-reloadable
    noiseAmountU.value = ctrl.noiseEnabled ? ctrl.noiseAmount : 0;
    noiseScaleU.value = ctrl.noiseScale;
    noiseSpeedU.value = ctrl.noiseSpeed;
  }, [
    entries,
    ctrl,
    layerUniforms,
    baseColorU,
    sharpnessU,
    vibranceU,
    noiseAmountU,
    noiseScaleU,
    noiseSpeedU,
  ]);

  const nodes = useMemo(() => {
    const u = uv();

    // Map full-stage uv into hole-normalized, y-down coords
    const holeMin = vec2(HOLE.x / DESIGN.width, 1 - (HOLE.y + HOLE.h) / DESIGN.height);
    const holeSize = vec2(HOLE.w / DESIGN.width, HOLE.h / DESIGN.height);
    const local = u.sub(holeMin).div(holeSize);
    const p0 = vec2(local.x, local.y.oneMinus());

    // Time-varying domain warp (MaterialX noise ≈ continuous Perlin-like field)
    const noisePos = vec3(
      p0.x.mul(noiseScaleU),
      p0.y.mul(noiseScaleU),
      time.mul(noiseSpeedU),
    );
    const nX = mx_noise_float(noisePos);
    const nY = mx_noise_float(noisePos.add(vec3(19.2, 7.4, 3.1)));
    const p = p0.add(vec2(nX, nY).mul(noiseAmountU));

    // Weighted blend (not sequential mix): keeps each type's hue vivid.
    //   color = sum(c_i * w_i^sharp) / sum(w_i^sharp)
    // Higher sharpness → winner-take-more, less muddy midtones.
    let weighted = vec3(0, 0, 0);
    let weightSum = float(0);

    for (const typeId of LAYER_DRAW_ORDER) {
      const l = layerUniforms[typeId];
      const t = time.mul(l.speed).add(l.phase);
      const center = vec2(
        sin(t).mul(l.amp).add(l.cx),
        cos(t.mul(0.8)).mul(l.amp).add(l.cy),
      );
      const d = length(p.sub(center).div(vec2(l.rx, l.ry)));
      const radial = smoothstep(0.0, 1.0, d).oneMinus();
      const w = max(radial.mul(l.strength).mul(l.enabled), 0);
      const wSharp = pow(w, sharpnessU);

      weighted = weighted.add(color(TYPES[typeId].color).mul(wSharp));
      weightSum = weightSum.add(wSharp);
    }

    const blended = weighted.div(max(weightSum, 1e-4));
    // Softly fall back to base only where almost no type influence
    let c = mix(color(baseColorU), blended, clamp(weightSum, 0, 1));

    // Push saturation so overlapping soft radii stay closer to reference art
    const luma = c.r.mul(0.2126).add(c.g.mul(0.7152)).add(c.b.mul(0.0722));
    c = mix(vec3(luma, luma, luma), c, vibranceU);

    // Stencil alpha: opaque black outside, 0 inside the blob hole
    const holeMask = texture(maskTex).a.oneMinus();

    return {
      colorNode: vec4(c, 1),
      opacityNode: holeMask,
    };
  }, [
    maskTex,
    layerUniforms,
    baseColorU,
    sharpnessU,
    vibranceU,
    noiseAmountU,
    noiseScaleU,
    noiseSpeedU,
  ]);

  return (
    <mesh scale={[size.width, size.height, 1]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <nodeMaterial
        colorNode={nodes.colorNode}
        opacityNode={nodes.opacityNode}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/**
 * DOM overlay: shows each layer's center + radius ellipse inside the blob hole.
 * Positions follow leva cx/cy/rx/ry (static, without drift).
 */
function LayerDebugOverlay({ ctrl }) {
  if (!ctrl.showLayerDebug) return null;

  return (
    <div className="ua-blob-debug" aria-hidden>
      {TYPE_ORDER.map((typeId) => {
        const c = layerFromCtrl(ctrl, typeId);
        if (!c.enabled) return null;
        const left = `${c.cx * 100}%`;
        const top = `${c.cy * 100}%`;
        return (
          <div key={typeId} className="ua-blob-debug__layer">
            <div
              className="ua-blob-debug__ellipse"
              style={{
                left,
                top,
                width: `${c.rx * 2 * 100}%`,
                height: `${c.ry * 2 * 100}%`,
                borderColor: TYPES[typeId].color,
              }}
            />
            <div
              className="ua-blob-debug__dot"
              style={{
                left,
                top,
                background: TYPES[typeId].color,
              }}
              title={`${TYPES[typeId].en} (${c.cx.toFixed(2)}, ${c.cy.toFixed(2)})`}
            />
            <span
              className="ua-blob-debug__label"
              style={{ left, top, color: TYPES[typeId].color }}
            >
              {TYPES[typeId].en}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * WebGPU gradient fill for the a-We blob.
 * Covers the whole design canvas; Background_2@.png alpha masks it
 * to the blob hole, so the shader itself never needs the outline.
 */
export default function BlobShaderFill({ entries }) {
  const ctrl = useBlobShaderCtrl();
  const layerUniforms = useMemo(() => createLayerUniforms(), []);

  return (
    <div className="ua-blobgpu">
      <Canvas
        gl={(canvas) => {
          const renderer = new WebGPURenderer({
            ...canvas,
            powerPreference: "high-performance",
            antialias: true,
            alpha: true,
          });
          return renderer.init().then(() => renderer);
        }}
        dpr={[1, 2]}
        orthographic
        camera={{ position: [0, 0, 1], zoom: 1, near: 0.1, far: 10 }}
      >
        <Suspense fallback={null}>
          <GradientPlane
            entries={entries}
            ctrl={ctrl}
            layerUniforms={layerUniforms}
          />
        </Suspense>
      </Canvas>

      <div className="ua-blob-debug-host">
        <LayerDebugOverlay ctrl={ctrl} />
      </div>
    </div>
  );
}
