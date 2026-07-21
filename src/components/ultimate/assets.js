/** Design canvas: 2160 x 3840 (portrait exhibition). Assets are mostly 2x. */

const PARTS = "02 各項元件";
const ALIGN = "01 對位用圖";

function tex(folder, file) {
  // encodeURI keeps "@" literal (filenames like Title_2@.png); %40 404s in Vite.
  return encodeURI(`/textures/${folder}/${file}`);
}

export const ASSETS = {
  align: {
    output: tex(ALIGN, "Output.png"),
    loading: tex(ALIGN, "Loading.png"),
  },
  background: tex(PARTS, "Background_2@.png"),
  title: tex(PARTS, "Title_2@.png"),
  radar: tex(PARTS, "RadarChart_2@.png"),
  distributionBar: tex(PARTS, "Distribution Bar_2@.png"),
  dataBar: tex(PARTS, "Data Bar_2@.png"),
  crown: tex(PARTS, "crown_2@.png"),
  raise: tex(PARTS, "raise_2@.png"),
  drop: tex(PARTS, "drop_2@.png"),
  even: tex(PARTS, "even_2@.png"),
  faces: {
    normal: tex(PARTS, "NormalFace_2@.png"),
    loading: tex(PARTS, "LoadingFace_2@.png"),
  },
};

/** Personality type → expression sprites (Lv1–3). */
export const TYPES = {
  /* Colors sampled from align map distribution bar */
  absorb: {
    id: "absorb",
    zh: "接住型",
    en: "Absorb",
    color: "#EEEEEF",
    character: "Huggee",
  },
  reflect: {
    id: "reflect",
    zh: "反彈型",
    en: "Reflect",
    color: "#D96A41",
    character: "Bounzee",
  },
  withdraw: {
    id: "withdraw",
    zh: "隱身型",
    en: "Withdraw",
    color: "#2E6CB4",
    character: "Fadee",
  },
  transform: {
    id: "transform",
    zh: "轉化型",
    en: "Transform",
    color: "#EDDC73",
    character: "Twistee",
  },
  diffuse: {
    id: "diffuse",
    zh: "模糊型",
    en: "Diffuse",
    color: "#B6A0D2",
    character: "Mistee",
  },
};

export function faceAsset(typeId, level = 1) {
  const t = TYPES[typeId];
  if (!t) return ASSETS.faces.normal;
  const lv = Math.min(3, Math.max(1, level));
  return tex(PARTS, `${t.character}Lv${lv}_2@.png`);
}

/** Sample Output state matching the AI reference ranking. */
export const SAMPLE_OUTPUT = {
  mode: "output",
  level: 1,
  entries: [
    { typeId: "reflect", percent: 50, count: 2500, trend: "up" },
    { typeId: "absorb", percent: 25, count: 1250, trend: "even" },
    { typeId: "diffuse", percent: 12, count: 600, trend: "down" },
    { typeId: "withdraw", percent: 8, count: 400, trend: "down" },
    { typeId: "transform", percent: 5, count: 250, trend: "even" },
  ],
};

export const SAMPLE_LOADING = {
  mode: "loading",
  level: 1,
  entries: [
    { typeId: "reflect", percent: 0, count: 0, trend: "even", placeholder: true },
    { typeId: "absorb", percent: 0, count: 0, trend: "even", placeholder: true },
    { typeId: "diffuse", percent: 0, count: 0, trend: "even", placeholder: true },
    { typeId: "withdraw", percent: 0, count: 0, trend: "even", placeholder: true },
    { typeId: "transform", percent: 0, count: 0, trend: "even", placeholder: true },
  ],
};

export const DESIGN = {
  width: 2160,
  height: 3840,
};
