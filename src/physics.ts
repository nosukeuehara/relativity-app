// 物理定数
export const G = 6.6743e-11; // m^3 kg^-1 s^-2
export const C = 299_792_458; // m/s
export const M_SUN = 1.98847e30; // kg
export const R_SUN = 6.957e8; // m

export type BodyKind = "normal" | "bh"; // ← 追加
export type Body = {
  id: string;
  name: string;
  massKg: number;
  radiusM: number;
  kind?: BodyKind; // 既定は "normal"
};

// Schwarzschild半径 Rs = 2GM/c^2
export function schwarzschildRadius(massKg: number) {
  return (2 * G * massKg) / (C * C);
}

export type Mode = "surface" | "staticAltitude" | "circularOrbit";

export const BODIES: Body[] = [
  {id: "earth", name: "地球", massKg: 5.972e24, radiusM: 6.371e6},
  {id: "moon", name: "月", massKg: 7.347673e22, radiusM: 1.7374e6},
  {id: "mars", name: "火星", massKg: 6.4171e23, radiusM: 3.3895e6},
  {id: "venus", name: "金星", massKg: 4.8675e24, radiusM: 6.0518e6},
  {id: "merc", name: "水星", massKg: 3.3011e23, radiusM: 2.4397e6},
  {id: "jup", name: "木星", massKg: 1.89813e27, radiusM: 6.9911e7},
  {id: "sun", name: "太陽", massKg: 1.98847e30, radiusM: 6.9634e8},
  {
    id: "ns",
    name: "中性子星 (1.4 M☉, R=12km)",
    massKg: 1.4 * M_SUN,
    radiusM: 12_000,
  },
  {
    id: "r136a1",
    name: "R136a1（~200 M☉, ~30 R☉）",
    massKg: 200 * M_SUN,
    radiusM: 30 * R_SUN,
  },

  // ★ 追加：ブラックホール（半径Mは描画の都合だけ、計算は Rs×倍率）
  {
    id: "bh10",
    name: "ブラックホール（10 M☉）",
    massKg: 10 * M_SUN,
    radiusM: 3_000,
    kind: "bh",
  },
  {
    id: "sgrA",
    name: "Sgr A*（銀河中心 ~4.3×10^6 M☉）",
    massKg: 4.3e6 * M_SUN,
    radiusM: 1_000_000,
    kind: "bh",
  },
];

// 重力ポテンシャル Φ = -GM/r
export function phi(massKg: number, r: number) {
  return (-G * massKg) / r;
}

// 弱重力・低速近似：dτ/dt ≈ 1 + Φ/c² − v²/(2c²)
export function weakRate(phiVal: number, v: number) {
  return 1 + phiVal / (C * C) - (v * v) / (2 * C * C);
}

// 円軌道速度 v = √(GM/r)
export function circularOrbitSpeed(massKg: number, r: number) {
  return Math.sqrt((G * massKg) / r);
}

// 強重力・静止の正確式（シュバルツシルト；運動なし）
export function schwarzschildStaticRate(massKg: number, r: number) {
  const x = (2 * G * massKg) / (r * C * C);
  if (x >= 1) return 0; // 事象の地平面内（無効）
  return Math.sqrt(1 - x);
}
