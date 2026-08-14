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
  /** Unused in UI (labels/dots are HTML); kept for tooling / fallback. */
  radar: tex(PARTS, "RadarChart_Dots_2@.png"),
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
  /* Official A-we IP digital swatches (數位用 Hex) */
  absorb: {
    id: "absorb",
    zh: "接住型",
    en: "Absorb",
    color: "#c1c6c9",
    character: "Huggee",
  },
  reflect: {
    id: "reflect",
    zh: "反彈型",
    en: "Reflect",
    color: "#ff6339",
    character: "Bounzee",
  },
  withdraw: {
    id: "withdraw",
    zh: "隱身型",
    en: "Withdraw",
    color: "#006ebb",
    character: "Fadee",
  },
  transform: {
    id: "transform",
    zh: "轉化型",
    en: "Transform",
    color: "#f4eb45",
    character: "Twistee",
  },
  diffuse: {
    id: "diffuse",
    zh: "模糊型",
    en: "Diffuse",
    color: "#bf9fd6",
    character: "Mistee",
  },
};

export function faceAsset(typeId, level = 1) {
  const t = TYPES[typeId];
  if (!t) return ASSETS.faces.normal;
  const lv = Math.min(3, Math.max(1, level));
  return tex(PARTS, `${t.character}Lv${lv}_2@.png`);
}

/**
 * Per-sprite canvas size + eye-pair center (mouth excluded).
 * Display uses a fixed stage anchor; the img is shifted so this point stays put.
 */
const FACE_SHEETS = {
  HuggeeLv1: { w: 3173, h: 2189, eyeX: 1556.1, eyeY: 1365.9 },
  HuggeeLv2: { w: 3172, h: 2189, eyeX: 1585.8, eyeY: 1385.0 },
  HuggeeLv3: { w: 3172, h: 2189, eyeX: 1587.2, eyeY: 1367.1 },
  BounzeeLv1: { w: 3173, h: 2190, eyeX: 1554.1, eyeY: 1355.5 },
  BounzeeLv2: { w: 3172, h: 2190, eyeX: 1585.3, eyeY: 1403.2 },
  BounzeeLv3: { w: 3172, h: 2190, eyeX: 1584.6, eyeY: 1430.3 },
  FadeeLv1: { w: 3173, h: 2189, eyeX: 1585.6, eyeY: 1441.6 },
  FadeeLv2: { w: 3172, h: 2189, eyeX: 1585.4, eyeY: 1480.1 },
  FadeeLv3: { w: 3172, h: 2189, eyeX: 1594.8, eyeY: 1568.5 },
  TwisteeLv1: { w: 3173, h: 2190, eyeX: 1540.6, eyeY: 1314.0 },
  TwisteeLv2: { w: 3172, h: 2190, eyeX: 1588.4, eyeY: 1245.8 },
  TwisteeLv3: { w: 3172, h: 2190, eyeX: 1581.8, eyeY: 1176.2 },
  MisteeLv1: { w: 3173, h: 2190, eyeX: 1557.0, eyeY: 1349.0 },
  MisteeLv2: { w: 3172, h: 2190, eyeX: 1585.4, eyeY: 1349.0 },
  MisteeLv3: { w: 3172, h: 2190, eyeX: 1585.5, eyeY: 1349.0 },
  loading: { w: 3224, h: 2225, eyeX: 1598.8, eyeY: 1486.4 },
  normal: { w: 3223, h: 2225, eyeX: 1557.7, eyeY: 1457.3 },
};

/** Display width of expression sheets (matches blob hole ~1585). */
const FACE_DISPLAY_WIDTH = 1586;
/** Unified eye center on the 2160×3840 stage (Huggee Lv1 at original sheet placement). */
export const FACE_EYE_TARGET = { x: 1080, y: 1711 };

function resolveFaceSheet(faceKind, typeId, level) {
  if (faceKind === "loading") return FACE_SHEETS.loading;
  if (faceKind === "idle") return FACE_SHEETS.normal;
  const t = TYPES[typeId];
  if (!t) return FACE_SHEETS.normal;
  const lv = Math.min(3, Math.max(1, level));
  return FACE_SHEETS[`${t.character}Lv${lv}`] ?? FACE_SHEETS.HuggeeLv1;
}

/**
 * Inner img size + transform so the eye pair sits on FACE_EYE_TARGET.
 * Anchor left/top stay fixed; only the inner translate changes.
 */
export function facePlacement(faceKind, typeId, level = 1) {
  const sheet = resolveFaceSheet(faceKind, typeId, level);
  const scale = FACE_DISPLAY_WIDTH / sheet.w;
  return {
    width: FACE_DISPLAY_WIDTH,
    height: sheet.h * scale,
    originX: sheet.eyeX / sheet.w,
    originY: sheet.eyeY / sheet.h,
  };
}

export function allFaceUrls() {
  const urls = [ASSETS.faces.normal, ASSETS.faces.loading];
  for (const t of Object.values(TYPES)) {
    for (let lv = 1; lv <= 3; lv += 1) {
      urls.push(tex(PARTS, `${t.character}Lv${lv}_2@.png`));
    }
  }
  return urls;
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
