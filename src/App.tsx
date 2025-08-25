import {useMemo, useState} from "react";
import {
  BODIES,
  type Body,
  type Mode,
  phi,
  weakRate,
  circularOrbitSpeed,
  schwarzschildStaticRate,
} from "./physics";
import {schwarzschildRadius} from "./physics";
import {SpacetimeBackground} from "./visuals/SpacetimeBackground";
import {useEffect} from "react";

export default function App() {
  // 入力（初期インプットで画面が決まる）
  const [bodyId, setBodyId] = useState<Body["id"]>("earth");
  const [mode, setMode] = useState<Mode>("surface");
  const [altKm, setAltKm] = useState<number>(0);
  const [useExactStatic, setUseExactStatic] = useState<boolean>(false);
  const [simple, setSimple] = useState<boolean>(true);
  const [rsMul, setRsMul] = useState<number>(2.5); // BH用：r = Rs * rsMul

  const body = useMemo(() => BODIES.find((b) => b.id === bodyId)!, [bodyId]);
  const earth = BODIES.find((b) => b.id === "earth")!;
  const isBH = body.kind === "bh";

  // 地球（海面・静止）を基準
  const fEarth = useMemo(
    () => weakRate(phi(earth.massKg, earth.radiusM), 0),
    [earth.massKg, earth.radiusM]
  );

  // 対象の r / v
  const r = useMemo(() => {
    if (isBH) {
      const Rs = schwarzschildRadius(body.massKg);
      return Rs * Math.max(rsMul, 1.0001); // 事象の地平面（=1）より少し外に強制
    }
    return mode === "surface" ? body.radiusM : body.radiusM + altKm * 1000;
  }, [body, mode, altKm, isBH, rsMul]);

  const v = useMemo(() => {
    if (isBH) return 0; // フェーズ1は“静止”のみ
    return mode === "circularOrbit" ? circularOrbitSpeed(body.massKg, r) : 0;
  }, [isBH, body, mode, r]);

  // 対象の進み係数
  const fBody = useMemo(() => {
    if (isBH) {
      return schwarzschildStaticRate(body.massKg, r); // 正確式
    }
    if (useExactStatic && v === 0)
      return schwarzschildStaticRate(body.massKg, r);
    return weakRate(phi(body.massKg, r), v);
  }, [isBH, body, r, v, useExactStatic]);

  // 相対比と差分
  const R = fBody / fEarth;
  const perDay = (R - 1) * 86400;

  const earth1s_to_body = R; // 地球の1秒 → 対象で R 秒
  const body1s_to_earth = R === 0 ? Infinity : 1 / R; // 対象の1秒 → 地球で 1/R 秒

  const earth1h_to_body = R * 3600;
  const body1h_to_earth = R === 0 ? Infinity : 3600 / R;

  // 背景の“時間色”（>1:青、<1:赤）— 見やすいよう非線形に
  function hueShiftFromRatio(Ratio: number) {
    const d = Ratio - 1;
    const s = Math.min(1, Math.sqrt(Math.abs(d)) * 2e4);
    return (d >= 0 ? 1 : -1) * s; // -1..1
  }
  const hueShift = hueShiftFromRatio(R);

  const fmt = (x: number, d = 6) =>
    Number.isFinite(x)
      ? x.toLocaleString(undefined, {maximumFractionDigits: d})
      : "—";
  const fmtPerDay = (secPerDay: number) => {
    const a = Math.abs(secPerDay);
    if (a >= 1) return `${secPerDay.toFixed(3)} s/day`;
    if (a >= 1e-3) return `${(secPerDay * 1e3).toFixed(3)} ms/day`;
    if (a >= 1e-6) return `${(secPerDay * 1e6).toFixed(3)} µs/day`;
    if (a >= 1e-9) return `${(secPerDay * 1e9).toFixed(3)} ns/day`;
    return `${secPerDay.toExponential(2)} s/day`;
  };

  const fmtSec = (sec: number) => {
    const a = Math.abs(sec);
    if (a >= 1) return `${sec.toFixed(6)} s`;
    if (a >= 1e-3) return `${(sec * 1e3).toFixed(3)} ms`;
    if (a >= 1e-6) return `${(sec * 1e6).toFixed(3)} µs`;
    if (a >= 1e-9) return `${(sec * 1e9).toFixed(3)} ns`;
    return `${sec.toExponential(2)} s`;
  };

  // プリセット（GPS）
  const setGPS = () => {
    setBodyId("earth");
    setMode("circularOrbit");
    setAltKm(20200);
    setUseExactStatic(false);
  };

  useEffect(() => {
    if (isBH) {
      setMode("staticAltitude"); // UI上はdisabledだが値も揃えておく
      setRsMul((m) => Math.max(m, 2.0)); // 初期を2Rsなど無難に
    }
  }, [isBH]);

  return (
    <div style={{position: "relative", minHeight: "100vh", color: "white"}}>
      {/* 背景（初期インプットに従って 1 天体の歪みを表示） */}
      <SpacetimeBackground
        massKg={body.massKg}
        radiusM={r}
        hueShift={hueShift}
      />

      {/* 前面UI */}
      <main
        style={{
          position: "relative",
          zIndex: 2,
          maxWidth: 980,
          margin: "0 auto",
          padding: "24px 16px",
        }}
      >
        <header style={{marginBottom: 12}}>
          <h1 style={{fontSize: 28, fontWeight: 800, lineHeight: 1.2}}>
            相対性 × WebGL 時間体感アプリ（フェーズ1）
          </h1>
          <p style={{opacity: 0.9}}>
            天体と条件を選ぶと、<b>地球基準</b>
            で「時間がどれだけ遅れる/速いか」を数値と色で表示します。
          </p>
        </header>

        {/* 入力（初期インプット） */}
        <section
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            background: "rgba(0,0,0,0.35)",
            padding: 12,
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* 天体 */}
          <label>
            天体
            <select
              value={bodyId}
              onChange={(e) => setBodyId(e.target.value as Body["id"])}
              style={sel}
            >
              {BODIES.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          {/* モード（BHは固定で静止） */}
          <label>
            モード
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as Mode)}
              style={sel}
              disabled={isBH}
            >
              <option value="surface">表面（静止）</option>
              <option value="staticAltitude">静止（高度指定）</option>
              <option value="circularOrbit">円軌道（高度指定）</option>
            </select>
          </label>

          {/* 距離入力：BHなら r/Rs、通常は高度 */}
          {isBH ? (
            <label>
              距離（r / Rs）
              <input
                type="range"
                min={1.01}
                max={50}
                step={0.01}
                value={rsMul}
                onChange={(e) => setRsMul(Number(e.target.value))}
                style={{width: "100%"}}
              />
              <div style={{fontSize: 12, opacity: 0.8, marginTop: 4}}>
                現在: <b>{rsMul.toFixed(2)} Rs</b>
              </div>
            </label>
          ) : (
            <label>
              高度 [km]（表面=0）
              <input
                type="number"
                value={altKm}
                onChange={(e) => setAltKm(Number(e.target.value))}
                style={inp}
                disabled={mode === "surface"}
                placeholder="例: GPS ≈ 20200"
              />
            </label>
          )}

          {/* 強重力の正確式チェック：BHは常に適用 */}
          <label style={{gridColumn: "1/-1"}}>
            <input
              type="checkbox"
              checked={isBH ? true : useExactStatic}
              onChange={(e) => setUseExactStatic(e.target.checked)}
              disabled={isBH || v !== 0}
            />{" "}
            強重力・静止では正確式で計算（BHは常に適用）
          </label>

          <div
            style={{
              gridColumn: "1/-1",
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button onClick={setGPS} style={btn}>
              GPS プリセット（地球・円軌道・高度20200km）
            </button>
            <label style={{display: "flex", alignItems: "center", gap: 8}}>
              <input
                type="checkbox"
                checked={simple}
                onChange={(e) => setSimple(e.target.checked)}
              />
              シンプル表示（R と 差分/日）
            </label>
          </div>
        </section>

        {/* 結果 */}
        <section style={card}>
          {isBH && (
            <div
              style={{
                marginTop: 8,
                padding: "8px 10px",
                borderRadius: 8,
                background: "rgba(255,120,120,0.12)",
                border: "1px solid rgba(255,120,120,0.25)",
              }}
            >
              <b>ブラックホール：</b> 静止の厳密式で計算中。現在の距離{" "}
              <b>{rsMul.toFixed(2)} Rs</b>（Rs
              に近づくほど時間は極端に遅れます）。
            </div>
          )}

          <h2 style={h2}>結果</h2>
          {simple ? (
            <div
              style={{
                display: "grid",
                gap: 8,
                gridTemplateColumns: "1fr 1fr",
                alignItems: "end",
              }}
            >
              <div>
                <div style={{fontSize: 14, opacity: 0.85}}>
                  相対比（地球=1.000000…）
                </div>
                <div style={{fontSize: 36, fontWeight: 900, lineHeight: 1.1}}>
                  R = {fmt(R, 8)}
                </div>
                <div style={{fontSize: 13, opacity: 0.8, marginTop: 4}}>
                  {R > 1
                    ? "地球より“速い”（青）"
                    : R < 1
                    ? "地球より“遅い”（赤）"
                    : "地球とほぼ同じ"}
                </div>
              </div>
              <div>
                <div style={{fontSize: 14, opacity: 0.85}}>差分/日</div>
                <div style={{fontSize: 32, fontWeight: 900, lineHeight: 1.1}}>
                  {fmtPerDay(perDay)}
                </div>
                <div style={{fontSize: 13, opacity: 0.8, marginTop: 4}}>
                  ※ 地球で1日経つ間に、対象ではどれだけズレるか
                </div>
              </div>
              <div
                style={{
                  gridColumn: "1 / -1",
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                <div style={{fontSize: 14, opacity: 0.85, marginBottom: 6}}>
                  1 秒の対応
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div>
                    <div style={{fontSize: 12, opacity: 0.8}}>
                      地球の 1 秒 → 対象では
                    </div>
                    <div style={{fontSize: 18, fontWeight: 800}}>
                      {fmtSec(earth1s_to_body)}
                    </div>
                  </div>
                  <div>
                    <div style={{fontSize: 12, opacity: 0.8}}>
                      対象の 1 秒 → 地球では
                    </div>
                    <div style={{fontSize: 18, fontWeight: 800}}>
                      {Number.isFinite(body1s_to_earth)
                        ? fmtSec(body1s_to_earth)
                        : "—"}
                    </div>
                  </div>
                </div>

                {/* 1時間版（任意。不要なら削除OK） */}
                <div style={{fontSize: 12, opacity: 0.7, marginTop: 8}}>
                  参考：地球の 1 時間 → 対象では{" "}
                  <b>{fmtSec(earth1h_to_body)}</b> ／ 対象の 1 時間 → 地球では{" "}
                  <b>
                    {Number.isFinite(body1h_to_earth)
                      ? fmtSec(body1h_to_earth)
                      : "—"}
                  </b>
                </div>
              </div>
            </div>
          ) : (
            <>
              <ul style={{lineHeight: 1.8, margin: 0}}>
                <li>
                  対象の進み係数 f<sub>body</sub> = <b>{fmt(fBody, 12)}</b>
                </li>
                <li>
                  地球（海面・静止） f<sub>earth</sub> ={" "}
                  <b>{fmt(fEarth, 12)}</b>
                </li>
                <li>
                  相対比 R = <b>{fmt(R, 12)}</b>
                </li>
              </ul>
              <ul style={{lineHeight: 1.8, margin: "6px 0 0"}}>
                <li>
                  差分/日：<b>{fmtPerDay(perDay)}</b>
                </li>
              </ul>
              <hr
                style={{
                  border: "none",
                  borderTop: "1px solid rgba(255,255,255,0.12)",
                  margin: "10px 0",
                }}
              />
              <h3>1 秒の対応</h3>
              <ul style={{lineHeight: 1.8, margin: 0}}>
                <li>
                  地球の 1 秒 → 対象では：<b>{fmtSec(earth1s_to_body)}</b>
                </li>
                <li>
                  対象の 1 秒 → 地球では：
                  <b>
                    {Number.isFinite(body1s_to_earth)
                      ? fmtSec(body1s_to_earth)
                      : "—"}
                  </b>
                </li>
              </ul>
              <p style={{fontSize: 12, opacity: 0.7, marginTop: 6}}>
                （R = {fmt(R, 8)} に基づく換算。R &gt; 1 は対象の時間が速い／R
                &lt; 1 は遅い）
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

const sel: React.CSSProperties = {
  width: "100%",
  padding: 8,
  marginTop: 6,
  color: "white",
  border: "1px solid rgba(255,255,255,0.2)",
  borderRadius: 8,
};
const inp: React.CSSProperties = {...sel};
const btn: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)",
  color: "white",
  cursor: "pointer",
};
const card: React.CSSProperties = {
  marginTop: 14,
  background: "rgba(0,0,0,0.45)",
  padding: 12,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.08)",
};
const h2: React.CSSProperties = {
  fontSize: 18,
  fontWeight: 800,
  margin: "0 0 8px",
};
