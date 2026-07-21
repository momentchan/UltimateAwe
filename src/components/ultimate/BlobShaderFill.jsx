import { Suspense, useMemo } from "react";
import { Canvas, extend, useLoader, useThree } from "@react-three/fiber";
import { NodeMaterial, WebGPURenderer, TextureLoader } from "three/webgpu";
import {
  color,
  cos,
  length,
  mix,
  sin,
  smoothstep,
  texture,
  time,
  uv,
  vec2,
  vec4,
} from "three/tsl";
import { ASSETS, TYPES, DESIGN } from "./assets";

extend({ NodeMaterial });

/* Transparent hole punched in Background_2@.png, in 1x design px */
const HOLE = { x: 286, y: 993, w: 1585, h: 1094 };

/* Gradient layers, bottom to top (mirrors the old CSS radial-gradient stack).
   cx/cy/rx/ry are in hole-normalized coords, y-down like CSS. */
const LAYERS = [
  { type: "absorb", cx: 0.5, cy: 0.5, rx: 0.55, ry: 0.5, speed: 0.21, amp: 0.02, phase: 0.0 },
  { type: "diffuse", cx: 0.35, cy: 0.65, rx: 0.32, ry: 0.32, speed: 0.34, amp: 0.045, phase: 1.7 },
  { type: "withdraw", cx: 0.55, cy: 0.7, rx: 0.36, ry: 0.4, speed: 0.27, amp: 0.05, phase: 3.1 },
  { type: "transform", cx: 0.7, cy: 0.35, rx: 0.4, ry: 0.36, speed: 0.31, amp: 0.045, phase: 4.4 },
  { type: "reflect", cx: 0.3, cy: 0.4, rx: 0.44, ry: 0.4, speed: 0.24, amp: 0.05, phase: 5.6 },
];

function GradientPlane() {
  const maskTex = useLoader(TextureLoader, ASSETS.background);
  const size = useThree((s) => s.size);

  const nodes = useMemo(() => {
    const u = uv();

    // Map full-stage uv into hole-normalized, y-down coords
    const holeMin = vec2(HOLE.x / DESIGN.width, 1 - (HOLE.y + HOLE.h) / DESIGN.height);
    const holeSize = vec2(HOLE.w / DESIGN.width, HOLE.h / DESIGN.height);
    const local = u.sub(holeMin).div(holeSize);
    const p = vec2(local.x, local.y.oneMinus());

    let c = color("#c8c8c8");
    for (const l of LAYERS) {
      const t = time.mul(l.speed).add(l.phase);
      const center = vec2(
        sin(t).mul(l.amp).add(l.cx),
        cos(t.mul(0.8)).mul(l.amp).add(l.cy),
      );
      const d = length(p.sub(center).div(vec2(l.rx, l.ry)));
      // Reversed-edge smoothstep is undefined in WGSL; invert explicitly
      const w = smoothstep(0.0, 1.0, d).oneMinus();
      c = mix(c, color(TYPES[l.type].color), w);
    }

    // Stencil alpha: opaque black outside, 0 inside the blob hole
    const holeMask = texture(maskTex).a.oneMinus();

    return {
      colorNode: vec4(c, 1),
      opacityNode: holeMask,
    };
  }, [maskTex]);

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
 * WebGPU gradient fill for the a-We blob.
 * Covers the whole design canvas; Background_2@.png alpha masks it
 * to the blob hole, so the shader itself never needs the outline.
 */
export default function BlobShaderFill() {
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
          <GradientPlane />
        </Suspense>
      </Canvas>
    </div>
  );
}
