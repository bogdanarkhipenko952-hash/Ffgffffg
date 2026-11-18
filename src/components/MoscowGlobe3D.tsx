import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  MOSCOW_CITY_TOWERS,
  MOSCOW_HUBS,
  buildMoskvaRiver,
  buildMoscowAvenues,
  buildMoscowRing,
  generateMoscowDotGrid,
  moscowKmToUnitVec,
} from '../lib/moscowMap';
import { Vec3, buildGreatCircleArc } from '../lib/globeMath';

export interface MoscowGlobeState {
  vw: number;
  heroHeight: number;
  uv: number;
  up: number;
  isPortrait: boolean;
  reducedMotion: boolean;
  scrollFadeOpacity: number;
  hidden: boolean;
}

export interface MoscowGlobe3DProps {
  stateRef: React.MutableRefObject<MoscowGlobeState>;
}

const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _normVec = new THREE.Vector3();
const _upAxis = new THREE.Vector3(0, 1, 0);
const _color = new THREE.Color();

function toThreeVec(v: Vec3, radius = 1): THREE.Vector3 {
  return new THREE.Vector3(v.x * radius, v.y * radius, v.z * radius);
}

function createProceduralPlanetTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Clean cool porcelain gradient across the globe
    const bg = ctx.createLinearGradient(0, 0, 0, canvas.height);
    bg.addColorStop(0, '#eef3ff');
    bg.addColorStop(0.5, '#f9fbff');
    bg.addColorStop(1, '#e4ecff');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle equirectangular topographic parallels and meridians
    ctx.strokeStyle = 'rgba(47, 99, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 18; i++) {
      const y = (i / 18) * canvas.height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }
    for (let i = 0; i < 36; i++) {
      const x = (i / 36) * canvas.width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Soft radial highlight centered on Moscow (phi=0, theta=pi/2 -> center of texture when rotated)
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.5;
    const rad = ctx.createRadialGradient(cx, cy, 18, cx, cy, 220);
    rad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    rad.addColorStop(0.45, 'rgba(238, 243, 255, 0.45)');
    rad.addColorStop(1, 'rgba(220, 232, 255, 0)');
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function detectSoftwareWebGL(): boolean {
  try {
    const probe = document.createElement('canvas');
    const gl = probe.getContext('webgl2') || probe.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const MoscowGlobe3D: React.FC<MoscowGlobe3DProps> = ({ stateRef }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const disposables: Array<{ dispose: () => void }> = [];

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.cursor = 'grab';
    renderer.domElement.style.touchAction = 'pan-y';
    renderer.domElement.setAttribute('data-testid', 'globe-canvas');
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envRT.texture;
    pmremGenerator.dispose();
    disposables.push(envRT);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 40);
    camera.position.set(0, 0, 5.2);

    // Three-point warm/cool architectural lighting rig
    const hemiLight = new THREE.HemisphereLight(0xf3f7ff, 0x9cb4eb, 1.05);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfffaf0, 1.9);
    keyLight.position.set(-4.5, 4.2, 5.0);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3a6bff, 1.6);
    rimLight.position.set(4.0, -2.5, -3.5);
    scene.add(rimLight);

    const planetRoot = new THREE.Group();
    scene.add(planetRoot);

    const R = 1.0;

    // 1. Core Porcelain-Glass 3D Planet Sphere
    const globeTex = createProceduralPlanetTexture();
    globeTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    globeTex.offset.x = -0.25;
    disposables.push(globeTex);

    const coreGeo = new THREE.SphereGeometry(R, 64, 64);
    const coreMat = new THREE.MeshPhysicalMaterial({
      map: globeTex,
      color: 0xf7f9ff,
      roughness: 0.36,
      metalness: 0.06,
      clearcoat: 0.42,
      clearcoatRoughness: 0.24,
      envMapIntensity: 0.85,
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    planetRoot.add(coreMesh);
    disposables.push(coreGeo, coreMat);

    // 2. Atmospheric Fresnel Rim Glow Shader (using NormalBlending for crisp cobalt on white)
    const atmosGeo = new THREE.SphereGeometry(R * 1.035, 64, 64);
    const atmosMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      uniforms: {
        uColorInner: { value: new THREE.Color('#6f96ff') },
        uColorRim: { value: new THREE.Color('#2f63ff') },
      },
      vertexShader: `
        varying vec3 vNormalView;
        varying vec3 vViewPos;
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mvPos.xyz;
          vNormalView = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColorInner;
        uniform vec3 uColorRim;
        varying vec3 vNormalView;
        varying vec3 vViewPos;
        void main() {
          vec3 V = normalize(vViewPos);
          float ndotv = clamp(dot(vNormalView, V), 0.0, 1.0);
          float rim = pow(1.0 - ndotv, 2.75);
          vec3 col = mix(uColorInner, uColorRim, smoothstep(0.25, 0.9, rim));
          float alpha = rim * 0.56;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    const atmosMesh = new THREE.Mesh(atmosGeo, atmosMat);
    planetRoot.add(atmosMesh);
    disposables.push(atmosGeo, atmosMat);

    // Outer soft cobalt halo silhouette
    const outerHaloGeo = new THREE.SphereGeometry(R * 1.13, 48, 48);
    const outerHaloMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      vertexShader: `
        varying vec3 vNormalView;
        varying vec3 vViewPos;
        void main() {
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vViewPos = -mvPos.xyz;
          vNormalView = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        varying vec3 vNormalView;
        varying vec3 vViewPos;
        void main() {
          vec3 V = normalize(vViewPos);
          float ndotv = clamp(dot(-vNormalView, V), 0.0, 1.0);
          float glow = pow(ndotv, 2.2) * 0.24;
          gl_FragColor = vec4(0.184, 0.388, 1.0, glow);
        }
      `,
    });
    const outerHaloMesh = new THREE.Mesh(outerHaloGeo, outerHaloMat);
    planetRoot.add(outerHaloMesh);
    disposables.push(outerHaloGeo, outerHaloMat);

    // 3. Full-Sphere 3D Geodesic Wireframe Graticule
    const gratPositions: number[] = [];
    const gratR = R * 1.003;
    for (let lat = -60; lat <= 60; lat += 20) {
      const phi = (lat * Math.PI) / 180;
      const y = Math.sin(phi) * gratR;
      const rLat = Math.cos(phi) * gratR;
      const segs = 64;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        gratPositions.push(
          Math.cos(a0) * rLat,
          y,
          Math.sin(a0) * rLat,
          Math.cos(a1) * rLat,
          y,
          Math.sin(a1) * rLat
        );
      }
    }
    for (let lon = 0; lon < 180; lon += 20) {
      const theta = (lon * Math.PI) / 180;
      const segs = 64;
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        gratPositions.push(
          Math.cos(a0) * Math.cos(theta) * gratR,
          Math.sin(a0) * gratR,
          Math.cos(a0) * Math.sin(theta) * gratR,
          Math.cos(a1) * Math.cos(theta) * gratR,
          Math.sin(a1) * gratR,
          Math.cos(a1) * Math.sin(theta) * gratR
        );
      }
    }
    const gratGeo = new THREE.BufferGeometry();
    gratGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(gratPositions, 3)
    );
    const gratMat = new THREE.LineBasicMaterial({
      color: 0x2f63ff,
      transparent: true,
      opacity: 0.14,
    });
    const gratLines = new THREE.LineSegments(gratGeo, gratMat);
    planetRoot.add(gratLines);
    disposables.push(gratGeo, gratMat);

    // 4. Full-Sphere Geodesic Continent & Ocean Dot Relief (Fibonacci lattice outside Moscow cap)
    const globalStuds: Array<{ v: Vec3; isLand: boolean }> = [];
    const fibCount = 1350;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < fibCount; i++) {
      const y = 1 - (i / (fibCount - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = goldenAngle * i;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      if (z > 0.69) continue; // Leave crisp margin around Moscow urban relief
      // Smooth spherical harmonic relief so 360-deg inspection reveals continent clusters
      const n =
        Math.sin(x * 3.2 + y * 1.7) * Math.cos(z * 2.8 - y * 2.1) +
        0.5 * Math.cos(x * 5.4 - z * 4.3);
      const isLand = n > -0.05;
      if (!isLand && i % 2 === 0) continue;
      globalStuds.push({ v: { x, y, z }, isLand });
    }

    const studGeo = new THREE.CylinderGeometry(0.0052, 0.0052, 1, 6);
    const studMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.45,
      metalness: 0.2,
    });
    const studInst = new THREE.InstancedMesh(studGeo, studMat, globalStuds.length);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < globalStuds.length; i++) {
      const { v, isLand } = globalStuds[i];
      _normVec.set(v.x, v.y, v.z).normalize();
      const h = isLand ? 0.009 : 0.003;
      dummy.position.copy(_normVec).multiplyScalar(R + h * 0.45);
      dummy.quaternion.setFromUnitVectors(_upAxis, _normVec);
      dummy.scale.set(isLand ? 1.1 : 0.75, h, isLand ? 1.1 : 0.75);
      dummy.updateMatrix();
      studInst.setMatrixAt(i, dummy.matrix);
      _color.set(isLand ? '#7994d8' : '#cbd7f6');
      studInst.setColorAt(i, _color);
    }
    studInst.instanceMatrix.needsUpdate = true;
    if (studInst.instanceColor) studInst.instanceColor.needsUpdate = true;
    studInst.computeBoundingSphere();
    planetRoot.add(studInst);
    disposables.push(studGeo, studMat);

    // 5. Sleek 3D Sculpted Moscow Urban Micro-Pillars (InstancedMesh)
    const moscowDots = generateMoscowDotGrid();
    const blockGeo = new THREE.CylinderGeometry(0.0048, 0.0058, 1, 6);
    const blockMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.34,
      metalness: 0.25,
    });
    const blockInst = new THREE.InstancedMesh(
      blockGeo,
      blockMat,
      moscowDots.length
    );

    for (let i = 0; i < moscowDots.length; i++) {
      const v = moscowDots[i];
      _normVec.set(v.x, v.y, v.z).normalize();
      const radialDist = Math.hypot(v.x, v.y);
      const centerFactor = Math.max(0, 1 - radialDist / 0.72);
      const pseudoRand = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      const height = 0.006 + centerFactor * 0.019 + pseudoRand * 0.008;

      dummy.position.copy(_normVec).multiplyScalar(R + height * 0.45);
      dummy.quaternion.setFromUnitVectors(_upAxis, _normVec);
      dummy.scale.set(0.85 + centerFactor * 0.3, height, 0.85 + centerFactor * 0.3);
      dummy.updateMatrix();
      blockInst.setMatrixAt(i, dummy.matrix);

      if (centerFactor > 0.68 && pseudoRand > 0.65) {
        _color.set('#2f63ff');
      } else if (centerFactor > 0.32) {
        _color.set('#1e263b');
      } else {
        _color.set('#556382');
      }
      blockInst.setColorAt(i, _color);
    }
    blockInst.instanceMatrix.needsUpdate = true;
    if (blockInst.instanceColor) blockInst.instanceColor.needsUpdate = true;
    blockInst.computeBoundingSphere();
    planetRoot.add(blockInst);
    disposables.push(blockGeo, blockMat);

    // 6. Raised 3D Moscow Concentric Rings (Bulvarnoe, Sadovoe, TTK, MKAD)
    const addRingTube = (
      rxKm: number,
      ryKm: number,
      tubeR: number,
      altitude: number,
      colorHex: string,
      roughness: number,
      metalness: number
    ) => {
      const pts = buildMoscowRing(rxKm, ryKm, -8, 90).map((v) =>
        toThreeVec(v, R + altitude)
      );
      const curve = new THREE.CatmullRomCurve3(pts, true);
      const geo = new THREE.TubeGeometry(curve, 96, tubeR, 8, true);
      const mat = new THREE.MeshStandardMaterial({
        color: colorHex,
        roughness,
        metalness,
      });
      const mesh = new THREE.Mesh(geo, mat);
      planetRoot.add(mesh);
      disposables.push(geo, mat);
    };

    addRingTube(3.4, 3.8, 0.0042, 0.011, '#2f63ff', 0.25, 0.55); // Садовое
    addRingTube(7.4, 8.2, 0.0046, 0.011, '#1e3a8a', 0.3, 0.45); // ТТК
    addRingTube(17.2, 20.4, 0.0072, 0.012, '#2f63ff', 0.22, 0.65); // МКАД

    // Radial Moscow Avenues extending smoothly past MKAD
    const avenues = buildMoscowAvenues(28, 20);
    const avenueMat = new THREE.LineBasicMaterial({
      color: 0x2f63ff,
      transparent: true,
      opacity: 0.24,
    });
    disposables.push(avenueMat);
    for (const av of avenues) {
      const avPts = av.map((v) => toThreeVec(v, R + 0.006));
      const avGeo = new THREE.BufferGeometry().setFromPoints(avPts);
      const avLine = new THREE.Line(avGeo, avenueMat);
      planetRoot.add(avLine);
      disposables.push(avGeo);
    }

    // 7. 3D Sculpted Moskva River Ribbon
    const riverPts = buildMoskvaRiver(72).map((v) =>
      toThreeVec(v, R + 0.010)
    );
    const riverCurve = new THREE.CatmullRomCurve3(riverPts, false);
    const riverGeo = new THREE.TubeGeometry(riverCurve, 84, 0.0115, 8, false);
    const riverMat = new THREE.MeshPhysicalMaterial({
      color: 0x5c8aff,
      emissive: 0x2f63ff,
      emissiveIntensity: 0.22,
      roughness: 0.16,
      metalness: 0.12,
      clearcoat: 0.85,
    });
    const riverMesh = new THREE.Mesh(riverGeo, riverMat);
    planetRoot.add(riverMesh);
    disposables.push(riverGeo, riverMat);

    // 8. 3D Architectural Landmarks: Moscow-City Towers & Kremlin Citadel
    const cityGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x2f63ff,
      roughness: 0.15,
      metalness: 0.78,
      clearcoat: 0.9,
      emissive: 0x1639b5,
      emissiveIntensity: 0.25,
    });
    disposables.push(cityGlassMat);

    for (const t of MOSCOW_CITY_TOWERS) {
      const v = moscowKmToUnitVec(t.dxKm, t.dyKm);
      _normVec.set(v.x, v.y, v.z).normalize();
      const towerGeo = new THREE.BoxGeometry(t.width, t.height, t.width);
      const towerMesh = new THREE.Mesh(towerGeo, cityGlassMat);
      towerMesh.position.copy(_normVec).multiplyScalar(R + t.height * 0.5 + 0.005);
      towerMesh.quaternion.setFromUnitVectors(_upAxis, _normVec);
      planetRoot.add(towerMesh);
      disposables.push(towerGeo);
    }

    // Kremlin central spire
    const kremPos = moscowKmToUnitVec(0.2, 0.3);
    const kremNorm = new THREE.Vector3(kremPos.x, kremPos.y, kremPos.z).normalize();
    const kremGroup = new THREE.Group();
    kremGroup.position.copy(kremNorm).multiplyScalar(R + 0.005);
    kremGroup.quaternion.setFromUnitVectors(_upAxis, kremNorm);

    const kremBaseGeo = new THREE.CylinderGeometry(0.022, 0.026, 0.022, 6);
    const kremBaseMat = new THREE.MeshStandardMaterial({
      color: 0x111522,
      roughness: 0.4,
      metalness: 0.35,
    });
    const kremBase = new THREE.Mesh(kremBaseGeo, kremBaseMat);
    kremBase.position.y = 0.011;
    kremGroup.add(kremBase);

    const kremSpireGeo = new THREE.ConeGeometry(0.011, 0.048, 6);
    const kremSpireMat = new THREE.MeshStandardMaterial({
      color: 0x2f63ff,
      emissive: 0x2f63ff,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.7,
    });
    const kremSpire = new THREE.Mesh(kremSpireGeo, kremSpireMat);
    kremSpire.position.y = 0.042;
    kremGroup.add(kremSpire);
    planetRoot.add(kremGroup);
    disposables.push(kremBaseGeo, kremBaseMat, kremSpireGeo, kremSpireMat);

    // 9. 3D Service Hub Beacons + Projection Anchor Vectors
    const hubAnchors: Array<{
      surfaceVec: THREE.Vector3;
      labelAnchorLocal: THREE.Vector3;
    }> = [];

    const stemGeo = new THREE.CylinderGeometry(0.004, 0.004, 0.055, 8);
    const headGeo = new THREE.OctahedronGeometry(0.018, 0);
    const collarGeo = new THREE.TorusGeometry(0.026, 0.0032, 8, 24);
    const pinCobaltMat = new THREE.MeshStandardMaterial({
      color: 0x2f63ff,
      emissive: 0x2f63ff,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.5,
    });
    const pinStemMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.4,
      metalness: 0.4,
    });
    disposables.push(stemGeo, headGeo, collarGeo, pinCobaltMat, pinStemMat);

    for (const hub of MOSCOW_HUBS) {
      const v = moscowKmToUnitVec(hub.dxKm, hub.dyKm);
      const n = new THREE.Vector3(v.x, v.y, v.z).normalize();

      const pinGroup = new THREE.Group();
      pinGroup.position.copy(n).multiplyScalar(R + 0.006);
      pinGroup.quaternion.setFromUnitVectors(_upAxis, n);

      const collar = new THREE.Mesh(collarGeo, pinCobaltMat);
      collar.rotation.x = Math.PI / 2;
      collar.position.y = 0.005;
      pinGroup.add(collar);

      const stem = new THREE.Mesh(stemGeo, pinStemMat);
      stem.position.y = 0.028;
      pinGroup.add(stem);

      const head = new THREE.Mesh(headGeo, pinCobaltMat);
      head.position.y = 0.062;
      pinGroup.add(head);

      planetRoot.add(pinGroup);

      hubAnchors.push({
        surfaceVec: n.clone(),
        labelAnchorLocal: n.clone().multiplyScalar(R + 0.115),
      });
    }

    // 10. 3D Elevated Route Arcs & Animated Delivery Shuttles
    const hubVecs = MOSCOW_HUBS.map((h) => moscowKmToUnitVec(h.dxKm, h.dyKm));
    const arcPairs: Array<[number, number]> = [
      [0, 1], // Кремль <-> Москва-Сити
      [0, 2], // Кремль <-> Север САО
      [0, 3], // Кремль <-> Юг ЮАО
      [0, 4], // Кремль <-> Запад ЗАО
      [1, 2], // Москва-Сити <-> Север САО
    ];

    const arcMat = new THREE.MeshStandardMaterial({
      color: 0x2f63ff,
      emissive: 0x1d4ed8,
      emissiveIntensity: 0.35,
      roughness: 0.25,
      metalness: 0.4,
      transparent: true,
      opacity: 0.88,
    });
    const shuttleGeo = new THREE.SphereGeometry(0.014, 12, 12);
    const shuttleMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const shuttleGlowGeo = new THREE.SphereGeometry(0.022, 12, 12);
    const shuttleGlowMat = new THREE.MeshBasicMaterial({
      color: 0x2f63ff,
      transparent: true,
      opacity: 0.55,
    });
    disposables.push(
      arcMat,
      shuttleGeo,
      shuttleMat,
      shuttleGlowGeo,
      shuttleGlowMat
    );

    const shuttles: Array<{
      curve: THREE.CatmullRomCurve3;
      group: THREE.Group;
      speed: number;
      phase: number;
    }> = [];

    arcPairs.forEach(([a, b], idx) => {
      const arcPts = buildGreatCircleArc(hubVecs[a], hubVecs[b], 44).map((v) =>
        toThreeVec(v, R)
      );
      const curve = new THREE.CatmullRomCurve3(arcPts);
      const tubeGeo = new THREE.TubeGeometry(curve, 48, 0.0046, 8, false);
      const tubeMesh = new THREE.Mesh(tubeGeo, arcMat);
      planetRoot.add(tubeMesh);
      disposables.push(tubeGeo);

      const shuttleGroup = new THREE.Group();
      shuttleGroup.add(new THREE.Mesh(shuttleGeo, shuttleMat));
      shuttleGroup.add(new THREE.Mesh(shuttleGlowGeo, shuttleGlowMat));
      planetRoot.add(shuttleGroup);

      shuttles.push({
        curve,
        group: shuttleGroup,
        speed: 0.28 + idx * 0.04,
        phase: idx * 0.23,
      });
    });

    // 11. Two Outer Architectural Orbital Rings around the 3D Planet
    const orbitGroup = new THREE.Group();
    scene.add(orbitGroup);

    const orbitMat1 = new THREE.MeshBasicMaterial({
      color: 0x2f63ff,
      transparent: true,
      opacity: 0.24,
    });
    const orbitGeo1 = new THREE.TorusGeometry(1.24, 0.0028, 8, 128);
    const orbitRing1 = new THREE.Mesh(orbitGeo1, orbitMat1);
    orbitRing1.rotation.set(Math.PI * 0.39, Math.PI * 0.12, 0);
    orbitGroup.add(orbitRing1);

    const orbitMat2 = new THREE.MeshBasicMaterial({
      color: 0x7a9cff,
      transparent: true,
      opacity: 0.18,
    });
    const orbitGeo2 = new THREE.TorusGeometry(1.36, 0.0022, 8, 128);
    const orbitRing2 = new THREE.Mesh(orbitGeo2, orbitMat2);
    orbitRing2.rotation.set(-Math.PI * 0.34, -Math.PI * 0.18, 0.2);
    orbitGroup.add(orbitRing2);
    disposables.push(orbitMat1, orbitGeo1, orbitMat2, orbitGeo2);

    // Interactive Pointer Drag-to-Inspect State
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragYawOffset = 0;
    let dragPitchOffset = 0;
    let lastInteractionTime = -10;

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      lastInteractionTime = performance.now() / 1000;
      renderer.domElement.style.cursor = 'grabbing';
      renderer.domElement.setPointerCapture?.(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragYawOffset += dx * 0.0065;
      dragPitchOffset = THREE.MathUtils.clamp(
        dragPitchOffset + dy * 0.0055,
        -0.95,
        0.95
      );
      lastInteractionTime = performance.now() / 1000;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isDragging) return;
      isDragging = false;
      lastInteractionTime = performance.now() / 1000;
      renderer.domElement.style.cursor = 'grab';
      renderer.domElement.releasePointerCapture?.(e.pointerId);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    let lastSizeKey = '';
    const syncViewport = () => {
      const {
        vw: curVw,
        heroHeight: curH,
        isPortrait: port,
        uv: curUv,
        up: curUp,
      } = stateRef.current;
      const w = mount.clientWidth || curVw;
      const h = mount.clientHeight || curH;
      if (w <= 0 || h <= 0) return { w: 1, h: 1 };

      const scale = port ? curUp : curUv;
      const key = `${w}|${h}|${scale.toFixed(4)}|${port}`;
      if (key !== lastSizeKey) {
        lastSizeKey = key;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;

        // Frame the entire 3D sphere + orbital rings cleanly inside the right side on desktop
        // or centered on portrait mobile, using setViewOffset so sphere remains perfectly round!
        const targetScreenX = port ? w * 0.5 : w - 385 * scale;
        const targetScreenY = port ? h * 0.5 : h * 0.51;
        const desiredPixelRadius = port
          ? Math.min(w, h) * 0.34
          : Math.min(340 * scale, h * 0.39);
        const fovRad = (camera.fov * Math.PI) / 180;
        const camDist = (h * 0.5) / (desiredPixelRadius * Math.tan(fovRad * 0.5));
        camera.position.set(0, 0, Math.max(3.6, Math.min(8.5, camDist)));

        const offsetX = -(targetScreenX - w * 0.5);
        const offsetY = -(targetScreenY - h * 0.5);
        camera.setViewOffset(w, h, offsetX, offsetY, w, h);
        camera.updateProjectionMatrix();
      }
      return { w, h };
    };

    if (!isSoftwareGl) {
      syncViewport();
      renderer.compile(scene, camera);
    }

    const startMs = performance.now();
    let prevMs = startMs;
    let frameId = 0;
    let disposed = false;

    const afterDraw = (cb: () => void) => {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    };

    const tick = () => {
      if (disposed) return;

      const nowMs = performance.now();
      const dt = Math.min(0.1, Math.max(0.001, (nowMs - prevMs) / 1000));
      prevMs = nowMs;
      const elapsedSec = (nowMs - startMs) / 1000;

      const {
        reducedMotion: rm,
        scrollFadeOpacity: fadeOp,
        hidden: isHidden,
      } = stateRef.current;

      const { w, h } = syncViewport();

      if (!isHidden && fadeOp > 0.005) {
        // Spring drag offset gently back toward Moscow showcase after release
        const idleSinceDrag = nowMs / 1000 - lastInteractionTime;
        if (!isDragging && idleSinceDrag > 2.0) {
          dragYawOffset = THREE.MathUtils.damp(dragYawOffset, 0, 2.2, dt);
          dragPitchOffset = THREE.MathUtils.damp(dragPitchOffset, 0, 2.2, dt);
        }

        // Smooth continuous 3D architectural precession showcasing Moscow centered on the sphere
        const baseYaw = rm ? 0.14 : 0.14 + Math.sin(elapsedSec * 0.42) * 0.22;
        const basePitch = rm ? 0.15 : 0.15 + Math.cos(elapsedSec * 0.31) * 0.08;

        planetRoot.rotation.y = baseYaw + dragYawOffset;
        planetRoot.rotation.x = basePitch + dragPitchOffset;
        planetRoot.rotation.z = -0.04;

        // Orbit rings gentle continuous rotation
        if (!rm) {
          orbitRing1.rotation.z = elapsedSec * 0.16;
          orbitRing2.rotation.z = -elapsedSec * 0.12;
        }

        // Move 3D route shuttles smoothly along raised arcs
        for (let i = 0; i < shuttles.length; i++) {
          const s = shuttles[i];
          const pingPong = rm
            ? 0.5
            : 0.5 - 0.5 * Math.cos((elapsedSec * s.speed + s.phase) * Math.PI * 2);
          s.curve.getPointAt(pingPong, s.group.position);
        }

        planetRoot.updateMatrixWorld(true);
        camera.updateMatrixWorld(true);

        // Update 3D-projected HTML pin labels (cleanly separated from sphere dots & left headline!)
        const isPort = stateRef.current.isPortrait;
        for (let i = 0; i < hubAnchors.length; i++) {
          const labelEl = labelsRef.current[i];
          if (!labelEl) continue;
          const anchor = hubAnchors[i];

          _vecA.copy(anchor.surfaceVec).transformDirection(planetRoot.matrixWorld);
          const facingZ = _vecA.z;

          if (facingZ <= 0.18) {
            labelEl.style.opacity = '0';
            continue;
          }

          _vecB.copy(anchor.labelAnchorLocal).applyMatrix4(planetRoot.matrixWorld);
          _vecB.project(camera);

          const sx = (_vecB.x * 0.5 + 0.5) * w;
          const sy = (-_vecB.y * 0.5 + 0.5) * h;
          const horizonAlpha = THREE.MathUtils.clamp((facingZ - 0.18) * 3.8, 0, 1);
          const leftGuardAlpha = isPort
            ? 1
            : THREE.MathUtils.clamp((sx - w * 0.49) / (w * 0.05), 0, 1);

          labelEl.style.transform = `translate3d(${sx.toFixed(1)}px, ${sy.toFixed(1)}px, 0) translate(-50%, -100%)`;
          labelEl.style.opacity = (horizonAlpha * leftGuardAlpha * fadeOp).toFixed(3);
        }

        renderer.domElement.style.opacity = String(fadeOp);
        renderer.render(scene, camera);
      } else {
        renderer.domElement.style.opacity = '0';
        for (let i = 0; i < labelsRef.current.length; i++) {
          const el = labelsRef.current[i];
          if (el) el.style.opacity = '0';
        }
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (domEl.parentNode === mount) {
        mount.removeChild(domEl);
      }
    };
  }, []);

  return (
    <div className="gwrap">
      <div ref={mountRef} className="w-full h-full" />
      <div className="globe-labels" aria-hidden="true">
        {MOSCOW_HUBS.map((hub, i) => (
          <div
            key={hub.id}
            ref={(el) => {
              labelsRef.current[i] = el;
            }}
            className="globe-pin-label"
          >
            <span className="lbl-full">{hub.label}</span>
            <span className="lbl-short">{hub.shortLabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
