import {Canvas, useFrame, useThree} from "@react-three/fiber";
import * as THREE from "three";
import {useMemo, useRef, useState} from "react";
import {G, C} from "../physics";

function strengthFromMassRadius(massKg: number, radiusM: number) {
  const rs = (2 * G * massKg) / (C * C);
  const ratio = rs / Math.max(radiusM, 1e-3);
  const l = Math.log10(Math.max(ratio, 1e-20));
  const lo = -9.5,
    hi = -5.0;
  const s = (l - lo) / (hi - lo);
  return Math.min(1, Math.max(0, s));
}

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main(){ vUv = uv; gl_Position = vec4(position,1.0); }
`;

const FRAG = /* glsl */ `
precision highp float;
uniform vec2  uResolution;
uniform float uTime;
uniform vec2  uCenter;
uniform float uStrength;
uniform float uHueShift;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  float a=hash(i);
  float b=hash(i+vec2(1.,0.));
  float c=hash(i+vec2(0.,1.));
  float d=hash(i+vec2(1.,1.));
  vec2 u=f*f*(3.-2.*f);
  return mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
}
vec3 hsv2rgb(vec3 c){
  vec3 p=abs(fract(c.xxx+vec3(0.,2./3.,1./3.))*6.-3.);
  vec3 q=clamp(p-1.,0.,1.);
  return c.z*mix(vec3(1.),q,c.y);
}

void main(){
  vec2 uv=vUv;
  vec2 aspect=vec2(uResolution.x/uResolution.y,1.0);
  vec2 p=(uv-0.5)*aspect;
  vec2 c=(uCenter-0.5)*aspect;
  vec2 d=p-c; float r=length(d)+1e-4;

  float bend = mix(0.1, 3.0, uStrength) * uStrength / r;
  vec2 warped = p - normalize(d) * bend;

  float stars = smoothstep(0.995,1.0, noise(warped*170.0 + vec2(0.0, uTime*0.07)));
  vec2 g = warped*6.0;
  float grid = 1.0 - min(abs(sin(g.x*3.14159)), abs(sin(g.y*3.14159)));
  grid = smoothstep(0.985, 0.999, grid) * 0.35;

  vec3 col = vec3(0.03,0.04,0.08) + vec3(1.0)*stars*1.2 + vec3(0.12,0.35,0.8)*grid;

  float ringR = mix(0.06, 0.42, uStrength);
  float ringW = mix(0.008,0.06, uStrength);
  float ring = smoothstep(ringR-ringW, ringR+ringW, r) - smoothstep(ringR-1.2*ringW, ringR+1.2*ringW, r);
  col += vec3(1.0, 0.85, 0.35) * clamp(ring,0.0,1.0);

  float hue = 0.58 + 0.12*uHueShift;
  col = mix(col, hsv2rgb(vec3(hue,0.5,1.0)), 0.18*abs(uHueShift));

  float core = clamp(smoothstep(0.0, mix(0.08,0.35,uStrength), r), 0.0, 1.0);
  col *= (1.0 - core);

  float v = smoothstep(0.95,0.2,length(p));
  col *= mix(0.65,1.0,v);

  gl_FragColor = vec4(col,1.0);
}
`;

function FullscreenShader({
  massKg,
  radiusM,
  hueShift,
}: {
  massKg: number;
  radiusM: number;
  hueShift: number;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const {size} = useThree();
  const [center, setCenter] = useState<[number, number]>([0.55, 0.55]);
  const strength = useMemo(
    () => strengthFromMassRadius(massKg, radiusM),
    [massKg, radiusM]
  );

  useFrame((state) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    mat.current.uniforms.uResolution.value.set(size.width, size.height);
    mat.current.uniforms.uCenter.value.set(center[0], center[1]);
    mat.current.uniforms.uStrength.value = strength;
    mat.current.uniforms.uHueShift.value = hueShift;
  });

  return (
    <mesh
      onPointerMove={(e) => {
        if (e.uv) {
          setCenter([e.uv.x, e.uv.y]);
        }
      }}
    >
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={VERT}
        fragmentShader={FRAG}
        uniforms={{
          uResolution: {value: new THREE.Vector2(size.width, size.height)},
          uTime: {value: 0},
          uCenter: {value: new THREE.Vector2(0.55, 0.55)},
          uStrength: {value: strength},
          uHueShift: {value: hueShift},
        }}
      />
    </mesh>
  );
}

export function SpacetimeBackground({
  massKg,
  radiusM,
  hueShift,
}: {
  massKg: number;
  radiusM: number;
  hueShift: number;
}) {
  return (
    <div
      style={{position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none"}}
    >
      <Canvas
        gl={{antialias: true, powerPreference: "high-performance"}}
        dpr={[1, 2]}
        camera={{position: [0, 0, 1]}}
      >
        <FullscreenShader
          massKg={massKg}
          radiusM={radiusM}
          hueShift={hueShift}
        />
      </Canvas>
    </div>
  );
}
