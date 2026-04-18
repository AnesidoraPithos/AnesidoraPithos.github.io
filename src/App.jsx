import { useRef, useEffect, useCallback, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { graphData } from './graphData';
import NodePanel from './NodePanel';
import LobePanel from './LobePanel';
import WorkingMemoryTray from './WorkingMemoryTray';
import Journal from './Journal';
import Homunculus from './Homunculus';
import { initAudio, setRegion, setMuted, resumeAudio } from './audioEngine';
import './App.css';

// ─── Palette ─────────────────────────────────────────────────────────────────
const COLORS = {
  0: { base: '#E8B86D', emissive: '#9A5A00', membrane: '#E8C07A' },
  1: { base: '#B04040', emissive: '#5A1010', membrane: '#C06050' },
  2: { base: '#2E7BA8', emissive: '#0A2A5A', membrane: '#3A9ABB' },
  3: { base: '#5C8C6A', emissive: '#1A3320', membrane: '#7AAF88' },
};

// ─── Mood configuration ───────────────────────────────────────────────────────
const MOOD_DRIFT = { focused: 0.35, curious: 1.0, tired: 0.15, flow: 1.8 };
const MOOD_CSS = {
  focused: { '--mood-accent': '#2E7BA8', '--mood-glow': 'rgba(46,123,168,0.5)' },
  curious: { '--mood-accent': '#E8B86D', '--mood-glow': 'rgba(232,184,109,0.5)' },
  tired:   { '--mood-accent': '#5C8C6A', '--mood-glow': 'rgba(92,140,106,0.5)' },
  flow:    { '--mood-accent': '#C07068', '--mood-glow': 'rgba(192,112,104,0.5)' },
};

// ─── Mood selector (inline component) ────────────────────────────────────────
const MOOD_ICONS = { focused: '◈', curious: '◇', tired: '◯', flow: '◉' };
function MoodSelector({ mood, onChange }) {
  return (
    <div className="mood-selector">
      {Object.keys(MOOD_DRIFT).map(key => (
        <button
          key={key}
          className={`mood-btn${mood === key ? ' mood-btn--active' : ''}`}
          onClick={() => onChange(key)}
          title={key}
        >
          <span className="mood-btn__icon">{MOOD_ICONS[key]}</span>
          <span className="mood-btn__label">{key}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Lobe configuration ──────────────────────────────────────────────────────
const LOBE_CONFIG = {
  frontal:  { label: 'Prefrontal Cortex', sublabel: 'Projects & Planning',  position: new THREE.Vector3(0,  90,  340), radius: 110, color: new THREE.Color('#2E7BA8') },
  temporal: { label: 'Temporal Lobes',    sublabel: 'Language & Memory',    position: new THREE.Vector3(0, -40,  100), radius: 160, color: new THREE.Color('#B04040') },
  parietal: { label: 'Parietal Cortex',   sublabel: 'Spatial Reasoning',    position: new THREE.Vector3(0,  60,   80), radius:  90, color: new THREE.Color('#5C8C6A') },
  occipital:{ label: 'Occipital Lobe',    sublabel: 'Visual Work',          position: new THREE.Vector3(0, -60, -260), radius: 100, color: new THREE.Color('#C07068') },
  center:   { label: 'Cerebellum / Core', sublabel: 'Core & Skills',        position: new THREE.Vector3(0,   0,   30), radius:  80, color: new THREE.Color('#E8B86D') },
};

const LOBE_CAMERA = {
  frontal:  { pos: { x: 0, y: 100, z: 530 },  lookAt: { x: 0, y:  90, z:  340 } },
  temporal: { pos: { x: 0, y: -40, z: 300 },  lookAt: { x: 0, y: -40, z:  100 } },
  parietal: { pos: { x: 0, y: 150, z: 250 },  lookAt: { x: 0, y:  60, z:   80 } },
  occipital:{ pos: { x: 0, y: -40, z:-430 },  lookAt: { x: 0, y: -60, z: -260 } },
  center:   { pos: { x: 0, y:   0, z: 220 },  lookAt: { x: 0, y:   0, z:   30 } },
};

// ─── Seeded PRNG (Mulberry32) ─────────────────────────────────────────────────
function seededRng(seed) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
function strHash(str) {
  let h = 0xdeadbeef;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
  return (h ^ (h >>> 16)) >>> 0;
}

// ─── Lobe surface glow sprite ─────────────────────────────────────────────────
function createGlowSprite() {
  const size = 256, cx = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
  g.addColorStop(0,    'rgba(255,255,255,0.85)');
  g.addColorStop(0.30, 'rgba(255,255,255,0.40)');
  g.addColorStop(0.65, 'rgba(255,255,255,0.10)');
  g.addColorStop(1.0,  'rgba(255,255,255,0.00)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const mat = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(canvas),
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    transparent: true,
    opacity: 0,
    color: new THREE.Color('#2E7BA8'),
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.setScalar(110);
  return sprite;
}

// ─── Lobe classification from brain surface hit point ────────────────────────
function classifyLobeFromPoint(worldPoint, brainScene) {
  const local = brainScene.worldToLocal(worldPoint.clone());
  const { x, y, z } = local;
  const r = Math.sqrt(x * x + y * y + z * z) || 1;
  const nx = x / r, ny = y / r, nz = z / r;
  if (nz >  0.42) return 'frontal';
  if (nz < -0.38) return 'occipital';
  if (ny >  0.38) return 'parietal';
  if (Math.abs(nx) > 0.40) return 'temporal';
  return 'center';
}

// ─── Brain material ───────────────────────────────────────────────────────────
function buildBrainMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#C07068'),
    emissive: new THREE.Color('#4A0A05'),
    emissiveIntensity: 0.5,
    roughness: 0.1,
    metalness: 0.0,
    transmission: 0.5,
    thickness: 5.0,
    ior: 1.45,
    clearcoat: 1.0,
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.95,
  });
}

// ─── Build organic cell mesh ──────────────────────────────────────────────────
function buildCellMesh(node) {
  if (node.id === 'mind' || node.id === 'Core' || node.id === 'My Mind') {
    const anchor = new THREE.Group();
    anchor.userData.isMindAnchor = true;
    return anchor;
  }
  const group = new THREE.Group();
  const rng = seededRng(strHash(node.id));
  const radius = (node.size || 6) * 0.95;
  const palette = COLORS[node.group] ?? COLORS[0];

  const geo = new THREE.IcosahedronGeometry(radius, 4);
  const posAttr = geo.attributes.position;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i), y = posAttr.getY(i), z = posAttr.getZ(i);
    const noise = Math.sin(x * 0.5) * Math.cos(y * 0.5) * Math.sin(z * 0.5);
    const scale = 0.85 + noise * 0.25;
    posAttr.setXYZ(i, x * scale, y * scale, z * scale);
  }
  posAttr.needsUpdate = true;
  geo.computeVertexNormals();

  const mat = new THREE.MeshPhongMaterial({
    color: new THREE.Color(palette.base),
    emissive: new THREE.Color(palette.emissive),
    emissiveIntensity: 0.55,
    shininess: 22,
    transparent: true,
    opacity: 0.90,
    side: THREE.FrontSide,
  });
  group.add(new THREE.Mesh(geo, mat));

  const memGeo = new THREE.SphereGeometry(radius * 1.35, 14, 10);
  const memMat = new THREE.MeshPhongMaterial({
    color: new THREE.Color(palette.membrane),
    transparent: true, opacity: 0.055,
    side: THREE.BackSide, depthWrite: false,
  });
  const memMesh = new THREE.Mesh(memGeo, memMat);
  memMesh.raycast = () => {};
  group.add(memMesh);

  if ((node.size ?? 0) >= 10) {
    const nucGeo = new THREE.IcosahedronGeometry(radius * 0.32, 1);
    const nucMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(palette.base),
      emissive: new THREE.Color(palette.base),
      emissiveIntensity: 1.2,
      transparent: true, opacity: 0.75,
    });
    group.add(new THREE.Mesh(nucGeo, nucMat));
  }

  group.userData.pulsePhase = rng() * Math.PI * 2;
  group.userData.nodeId = node.id;
  return group;
}

// ─── Link material ────────────────────────────────────────────────────────────
function makeLinkMaterial(link) {
  const sg = typeof link.source === 'object' ? link.source?.group : undefined;
  const tg = typeof link.target === 'object' ? link.target?.group : undefined;
  let hexColor = '#1A0D08';
  if (sg === 1 || tg === 1) hexColor = '#3D1515';
  if (sg === 2 || tg === 2) hexColor = '#0D1F38';
  if ((sg === 1 && tg === 2) || (sg === 2 && tg === 1)) hexColor = '#1F1A30';
  return new THREE.MeshPhongMaterial({
    color: new THREE.Color(hexColor),
    transparent: true, opacity: 0.62, shininess: 3,
  });
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const graphRef  = useRef(null);
  const targetZ   = useRef(430);
  const currentZ  = useRef(430);
  const nodeFocused = useRef(false);

  const brainMeshRef     = useRef(null);
  const brainLoadingRef  = useRef(false);
  const mouseRef         = useRef({ x: 0, y: 0 });
  const nodeGroupsRef    = useRef(new Map());

  // Canvas container ref + dimensions (kept in sync by ResizeObserver)
  const canvasContainerRef = useRef(null);
  const [canvasDims, setCanvasDims] = useState({
    width:  typeof window !== 'undefined' ? window.innerWidth  : 1280,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  });

  // Mirrors selectedNode state — RAF-safe for click-outside / Escape handlers
  const selectedNodeRef = useRef(null);

  // Lobe detection
  const lobeHitzonesRef      = useRef([]);
  const lobeGlowsRef         = useRef({});
  const hoveredLobeRef       = useRef(null);
  const raycasterRef         = useRef(new THREE.Raycaster());
  const nodeClickedRef       = useRef(false);
  const brainHighlightRef    = useRef(null);
  const brainMeshChildrenRef = useRef([]);

  // Neural pulses
  const pulsesRef   = useRef([]);
  const lastFireRef = useRef(0);

  // Star field canvas
  const starCanvasRef = useRef(null);

  // EEG
  const eegPathRef        = useRef(null);
  const waveParamsRef     = useRef({ freq: 3.2, amp: 14, speed: 1.2, jag: 0 });
  const activeLobeMirrorRef = useRef(null);

  // Mood
  const moodDriftRef = useRef(1.0);
  const moodRef      = useRef('curious');

  // UI state
  const [selectedNode,    setSelectedNode]    = useState(null);
  const [hoveredNode,     setHoveredNode]     = useState(null);
  const [hoveredLobe,     setHoveredLobe]     = useState(null);
  const [selectedLobe,    setSelectedLobe]    = useState(null);
  const [mood,            setMood]            = useState('curious');
  const [trayItems,       setTrayItems]       = useState([]);
  const [isDraggingToTray, setIsDraggingToTray] = useState(false);
  const dragNodeRef = useRef(null);
  const [showJournal,     setShowJournal]     = useState(false);
  const [showHomunculus,  setShowHomunculus]  = useState(false);
  const [isMuted,         setIsMuted]         = useState(false);

  // ── Mood change ────────────────────────────────────────────────────────────
  const handleMoodChange = useCallback((newMood) => {
    setMood(newMood);
    moodDriftRef.current = MOOD_DRIFT[newMood];
    moodRef.current = newMood;
    const vars = MOOD_CSS[newMood];
    Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
    setRegion(hoveredLobeRef.current ?? 'center', newMood);
  }, []);

  // Apply default mood CSS vars on mount
  useEffect(() => {
    const vars = MOOD_CSS.curious;
    Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v));
  }, []);

  // ── Star field (Hipparcos catalog) ─────────────────────────────────────────
  useEffect(() => {
    const canvas = starCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let raf;
    let stars = [];
    let rawData = null;

    function bvToColor(bv) {
      if (bv === null || bv === undefined || isNaN(bv)) return [240, 245, 255];
      if (bv < 0.0)  return [180, 200, 255];
      if (bv < 0.3)  return [240, 245, 255];
      if (bv < 0.8)  return [255, 240, 200];
      return [255, 210, 150];
    }

    function buildStars(data, w, h) {
      return data.map(s => {
        const sx = (s.ra / 360) * w;
        const sy = ((s.dec + 90) / 180) * h;
        const radius = Math.max(0.4, 2.8 - s.mag * 0.35);
        const baseOpacity = s.mag < 2 ? 0.9 : s.mag < 4 ? 0.65 : s.mag < 5.5 ? 0.42 : 0.22;
        const phase = Math.random() * Math.PI * 2;
        const phase2 = Math.random() * Math.PI * 2;
        // two-frequency twinkle: slow swell + fast scintillation
        const speed  = 0.15 + Math.random() * 0.4;
        const speed2 = 2.0  + Math.random() * 4.0;
        const [r, g, b] = bvToColor(s.bv);
        // depth: 0 = near/foreground, 1 = far/background
        // bright stars (low mag) tend nearer, faint stars farther — with noise
        const depth = Math.min(1, Math.max(0, (s.mag - 0.5) / 6.0 + (Math.random() - 0.5) * 0.3));
        // parallax drift amplitude: near stars wander up to 14px, far ones only ~2px
        const driftAmp = (1 - depth) * 12 + 2;
        const driftSpeedX = 0.04 + Math.random() * 0.06 * (1 - depth * 0.6);
        const driftSpeedY = 0.03 + Math.random() * 0.05 * (1 - depth * 0.6);
        const driftPhaseX = Math.random() * Math.PI * 2;
        const driftPhaseY = Math.random() * Math.PI * 2;
        return { sx, sy, radius, baseOpacity, phase, phase2, speed, speed2, r, g, b,
                 depth, driftAmp, driftSpeedX, driftSpeedY, driftPhaseX, driftPhaseY };
      });
    }

    function resize() {
      canvas.width  = window.innerWidth;
      canvas.height = window.innerHeight;
      if (rawData) stars = buildStars(rawData, canvas.width, canvas.height);
    }

    function draw(ts) {
      const t = ts / 1000;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        // slow swell (0.15–0.55 Hz) blended with fast scintillation (2–6 Hz)
        const slow = Math.sin(t * s.speed  + s.phase);
        const fast = Math.sin(t * s.speed2 + s.phase2);
        const twinkle = 0.25 + 0.45 * slow + 0.30 * fast;
        const opacity = Math.max(0, s.baseOpacity * twinkle);
        // parallax drift — near stars move more, far stars barely drift
        const x = s.sx + s.driftAmp * Math.sin(t * s.driftSpeedX + s.driftPhaseX);
        const y = s.sy + s.driftAmp * Math.cos(t * s.driftSpeedY + s.driftPhaseY);

        // soft glow bloom for bright/near stars only
        if (s.radius > 1.0) {
          const glowR = s.radius * 5;
          const grd = ctx.createRadialGradient(x, y, 0, x, y, glowR);
          grd.addColorStop(0,   `rgba(${s.r},${s.g},${s.b},${(opacity * 0.3).toFixed(3)})`);
          grd.addColorStop(1,   `rgba(${s.r},${s.g},${s.b},0)`);
          ctx.beginPath();
          ctx.arc(x, y, glowR, 0, Math.PI * 2);
          ctx.fillStyle = grd;
          ctx.fill();
        }

        // star core — bright stars pulse in size too
        const r = s.radius > 1.0 ? s.radius * (0.85 + 0.15 * fast) : s.radius;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.3, r), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${s.r},${s.g},${s.b},${opacity.toFixed(3)})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    }

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    fetch('/stars.json')
      .then(r => r.json())
      .then(data => {
        rawData = data;
        stars = buildStars(data, canvas.width, canvas.height);
        raf = requestAnimationFrame(draw);
      });

    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, []);

  // ── Working memory tray ────────────────────────────────────────────────────
  const handleAddToTray = useCallback((node) => {
    setTrayItems(prev => {
      if (prev.some(n => n.id === node.id) || prev.length >= 7) return prev;
      const next = [...prev, node];
      if (next.length === 7) {
        // Cognitive overload glitch — clear tray after shock
        document.querySelector('.container')?.classList.add('overloaded');
        setTimeout(() => {
          document.querySelector('.container')?.classList.remove('overloaded');
          setTrayItems([]);
        }, 3500);
      }
      return next;
    });
  }, []);

  const handleRemoveFromTray = useCallback((idx) => {
    setTrayItems(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const handleNodeDrag = useCallback((node) => {
    if (node.id === 'mind') return;
    if (dragNodeRef.current?.id !== node.id) {
      dragNodeRef.current = node;
      setIsDraggingToTray(true);
    }
  }, []);

  const handleNodeDragEnd = useCallback((node) => {
    if (!dragNodeRef.current) return;
    const tray = document.querySelector('.wm-tray');
    if (tray) {
      const rect = tray.getBoundingClientRect();
      const cx = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cursor-x'));
      const cy = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--cursor-y'));
      if (cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom) {
        handleAddToTray(node);
      }
    }
    dragNodeRef.current = null;
    setIsDraggingToTray(false);
  }, [handleAddToTray]);

  const handleBack = useCallback(() => {
    if (!graphRef.current) return;
    graphRef.current.cameraPosition({ x: 0, y: 0, z: 430 }, { x: 0, y: 0, z: 0 }, 1200);
    targetZ.current = 430;
    setSelectedNode(null);
    selectedNodeRef.current = null;
    setTimeout(() => { nodeFocused.current = false; }, 1300);
  }, []);

  // ── Audio mute ────────────────────────────────────────────────────────────
  const handleToggleMute = useCallback(() => {
    // Ensure audio context exists — first click on mute button may predate any canvas interaction
    initAudio();
    resumeAudio();
    setIsMuted(prev => {
      setMuted(!prev);
      return !prev;
    });
  }, []);

  // ── Lobe click (defined before useEffects — avoids TDZ) ──────────────────
  const handleLobeClick = useCallback((lobeKey) => {
    if (!graphRef.current || !lobeKey) return;
    const cam = LOBE_CAMERA[lobeKey];
    setSelectedLobe(lobeKey);
    setSelectedNode(null);
    selectedNodeRef.current = null;
    nodeFocused.current = true;
    graphRef.current.cameraPosition(cam.pos, cam.lookAt, 1400);
    initAudio(); resumeAudio();
    setRegion(lobeKey, moodRef.current);
  }, []);

  // ── 1. Camera Fly-through ──────────────────────────────────────────────────
  useEffect(() => {
    const onWheel = (e) => {
      if (nodeFocused.current) return;
      e.preventDefault();
      targetZ.current = Math.max(-200, Math.min(800, targetZ.current + e.deltaY * 0.38));
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    let raf;
    const tick = () => {
      if (!nodeFocused.current) {
        currentZ.current += (targetZ.current - currentZ.current) * 0.038;
        if (graphRef.current) graphRef.current.cameraPosition({ z: currentZ.current });
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { window.removeEventListener('wheel', onWheel); cancelAnimationFrame(raf); };
  }, []);

  // ── 2. Unified Animation Tick ─────────────────────────────────────────────
  useEffect(() => {
    const onMouseMove = (e) => {
      const rect = canvasContainerRef.current?.getBoundingClientRect();
      if (rect) {
        mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 - 1;
      }
      document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', onMouseMove);

    const onCanvasClick = (e) => {
      initAudio(); resumeAudio();
      if (nodeClickedRef.current) return;
      // Ignore clicks outside the canvas area (e.g. on panels, buttons)
      if (canvasContainerRef.current && !canvasContainerRef.current.contains(e.target)) return;
      if (selectedNodeRef.current) {
        handleBack();
        return;
      }
      if (hoveredLobeRef.current && !nodeFocused.current) {
        handleLobeClick(hoveredLobeRef.current);
      }
    };
    window.addEventListener('click', onCanvasClick);

    let raf;
    const tick = () => {
      const time = performance.now() / 1000;
      const brain = brainMeshRef.current;
      const camera = graphRef.current?.camera();

      // Brain Animation
      if (brain && camera) {
        const breathing = 1.0 + Math.sin(time * 0.5) * 0.03;
        const mouseDist = Math.sqrt(mouseRef.current.x**2 + mouseRef.current.y**2);
        const excitement = (1.0 - mouseDist) * 0.12;
        brain.scale.setScalar(220 * (breathing + excitement));
        const targetX = -mouseRef.current.y * 0.3;
        const targetY = mouseRef.current.x * 0.3;
        brain.rotation.x += (targetX - brain.rotation.x) * 0.05;
        brain.rotation.y += (targetY - brain.rotation.y) * 0.05;
        brain.traverse(c => {
          if (c.isMesh && c.material) {
            c.material.emissiveIntensity = 0.4 + (excitement * 3) + Math.sin(time * 2) * 0.15;
          }
        });
      }

      // Lobe detection — raycast against brain mesh surface
      if (camera && brainMeshChildrenRef.current.length > 0 && !nodeFocused.current) {
        const rc = raycasterRef.current;
        rc.setFromCamera(new THREE.Vector2(mouseRef.current.x, mouseRef.current.y), camera);
        const hits = rc.intersectObjects(brainMeshChildrenRef.current, false);

        let hitKey = null;
        if (hits.length > 0 && brainMeshRef.current) {
          hitKey = classifyLobeFromPoint(hits[0].point, brainMeshRef.current);
          if (hitKey && brainHighlightRef.current) {
            brainHighlightRef.current.position.copy(hits[0].point);
            brainHighlightRef.current.material.color.copy(LOBE_CONFIG[hitKey].color);
            brainHighlightRef.current.visible = true;
          }
        }

        if (hitKey !== hoveredLobeRef.current) {
          hoveredLobeRef.current = hitKey;
          setHoveredLobe(hitKey);
          if (hitKey) setRegion(hitKey, moodRef.current);
        }

        if (brainHighlightRef.current) {
          const target = hitKey ? 0.7 : 0;
          brainHighlightRef.current.material.opacity +=
            (target - brainHighlightRef.current.material.opacity) * 0.12;
          if (!hitKey && brainHighlightRef.current.material.opacity < 0.01) {
            brainHighlightRef.current.visible = false;
          }
        }

        document.body.style.cursor = hitKey ? 'pointer' : 'auto';
      }

      // Node Pulse & Attention
      for (const group of nodeGroupsRef.current.values()) {
        const isHovered = hoveredNode && group.userData.nodeId === hoveredNode.id;
        const basePulse = 1.0 + 0.05 * Math.sin(time * 1.2 + group.userData.pulsePhase);
        const targetScale = isHovered ? 2.2 : basePulse;
        group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
        group.traverse(c => {
          if (c.isMesh && c.material) {
            const targetE = isHovered ? 5.0 : 0.6;
            c.material.emissiveIntensity += (targetE - c.material.emissiveIntensity) * 0.1;
          }
        });
      }

      // Neural Firing Pulses
      const pulseScene = graphRef.current?.scene();
      if (pulseScene) {
        if (!hoveredNode && pulsesRef.current.length > 0) {
          pulsesRef.current.forEach(p => {
            pulseScene.remove(p.mesh);
            p.mesh.geometry.dispose(); p.mesh.material.dispose();
          });
          pulsesRef.current = [];
        }
        if (hoveredNode && time - lastFireRef.current > 0.5) {
          lastFireRef.current = time;
          const neighbors = graphData.links
            .filter(l => {
              const sid = typeof l.source === 'object' ? l.source.id : l.source;
              const tid = typeof l.target === 'object' ? l.target.id : l.target;
              return sid === hoveredNode.id || tid === hoveredNode.id;
            })
            .map(l => {
              const sid = typeof l.source === 'object' ? l.source.id : l.source;
              return sid === hoveredNode.id ? l.target : l.source;
            })
            .filter(n => typeof n === 'object' && n.x !== undefined);

          neighbors.forEach(neighbor => {
            const geo = new THREE.SphereGeometry(2.5, 8, 6);
            const mat = new THREE.MeshBasicMaterial({
              color: new THREE.Color('#FFF0C0'),
              transparent: true, opacity: 1.0,
              blending: THREE.AdditiveBlending, depthWrite: false,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(hoveredNode.x, hoveredNode.y, hoveredNode.z);
            pulseScene.add(mesh);
            pulsesRef.current.push({
              mesh,
              startPos: new THREE.Vector3(hoveredNode.x, hoveredNode.y, hoveredNode.z),
              endPos: new THREE.Vector3(neighbor.x, neighbor.y, neighbor.z),
              t: 0, speed: 0.013,
            });
          });
        }
        for (let i = pulsesRef.current.length - 1; i >= 0; i--) {
          const p = pulsesRef.current[i];
          p.t += p.speed;
          p.mesh.position.lerpVectors(p.startPos, p.endPos, Math.min(p.t, 1));
          const fade = p.t < 0.6 ? 1.0 : 1.0 - (p.t - 0.6) / 0.4;
          p.mesh.material.opacity = Math.max(0, fade);
          if (p.t >= 1.0) {
            pulseScene.remove(p.mesh);
            p.mesh.geometry.dispose(); p.mesh.material.dispose();
            pulsesRef.current.splice(i, 1);
          }
        }
      }

      // Biological Drift (mood-scaled momentum)
      const MAX_DIST = 400;
      const drift = moodDriftRef.current;
      graphData.nodes.forEach(node => {
        if (node.id === 'mind') return;
        const s = node.id.length;
        node.vx += Math.sin(time + s) * 0.03 * drift;
        node.vy += Math.cos(time * 0.8 + s) * 0.03 * drift;
        node.vz += Math.sin(time * 1.2 + s) * 0.025 * drift;
        const dist = Math.sqrt((node.x || 0)**2 + (node.y || 0)**2 + (node.z || 0)**2);
        if (dist > MAX_DIST) {
          node.vx -= (node.x / dist) * 0.5;
          node.vy -= (node.y / dist) * 0.5;
          node.vz -= (node.z / dist) * 0.5;
        }
      });

      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onCanvasClick);
      const cleanScene = graphRef.current?.scene();
      pulsesRef.current.forEach(p => {
        cleanScene?.remove(p.mesh);
        p.mesh.geometry.dispose(); p.mesh.material.dispose();
      });
      pulsesRef.current = [];
      cancelAnimationFrame(raf);
    };
  }, [hoveredNode, handleLobeClick, handleBack]);

  // ── 3. EEG Waveform ───────────────────────────────────────────────────────
  useEffect(() => {
    activeLobeMirrorRef.current = selectedLobe ?? hoveredLobe;
    const WAVE_TARGETS = {
      temporal: { freq: 1.5, amp: 22, speed: 0.6,  jag: 0.0  },
      frontal:  { freq: 6.0, amp: 8,  speed: 2.2,  jag: 0.38 },
      _default: { freq: 3.2, amp: 14, speed: 1.2,  jag: 0.0  },
    };
    let raf, phase = 0;
    const animateEEG = () => {
      const lobe = activeLobeMirrorRef.current;
      const target = WAVE_TARGETS[lobe] ?? WAVE_TARGETS._default;
      const wp = waveParamsRef.current;
      const L = 0.04;
      wp.freq  += (target.freq  - wp.freq)  * L;
      wp.amp   += (target.amp   - wp.amp)   * L;
      wp.speed += (target.speed - wp.speed) * L;
      wp.jag   += (target.jag   - wp.jag)   * L;
      phase += wp.speed * 0.016;
      const W = 1920, MID = 30, STEPS = 120;
      let d = `M 0 ${MID}`;
      for (let i = 1; i <= STEPS; i++) {
        const x = (i / STEPS) * W;
        const t = (i / STEPS) * Math.PI * 2 * wp.freq;
        const y = MID + (Math.sin(t + phase) + wp.jag * Math.sin(t * 3.1 + phase * 1.7)) * wp.amp;
        d += ` L ${x.toFixed(1)} ${y.toFixed(2)}`;
      }
      if (eegPathRef.current) eegPathRef.current.setAttribute('d', d);
      raf = requestAnimationFrame(animateEEG);
    };
    animateEEG();
    return () => cancelAnimationFrame(raf);
  }, [selectedLobe, hoveredLobe]);

  // ── 4. Scene Setup & Model Loading ────────────────────────────────────────
  const onEngineStop = useCallback(() => {
    if (!graphRef.current) return;
    const scene = graphRef.current.scene();

    if (!scene.getObjectByName('custom-light')) {
      const l1 = new THREE.DirectionalLight(0xffffff, 4); l1.position.set(-150, 150, 400); l1.name = 'custom-light'; scene.add(l1);
      const l2 = new THREE.PointLight(0x2244aa, 3.5, 600); l2.position.set(200, -100, 200); l2.name = 'custom-light'; scene.add(l2);
      const l3 = new THREE.PointLight(0xe8b86d, 15, 450); l3.name = 'core-light'; scene.add(l3);

      const sprite = createGlowSprite();
      sprite.name = 'lobe-highlight';
      sprite.visible = false;
      scene.add(sprite);
      brainHighlightRef.current = sprite;
    }

    if (!brainMeshRef.current) {
      graphRef.current.d3ReheatSimulation();
      if (!brainLoadingRef.current) {
        brainLoadingRef.current = true;
        new GLTFLoader().load('brain.glb', (gltf) => {
          const brain = gltf.scene;
          brain.traverse(c => {
            if (c.isMesh) {
              c.geometry.center();
              c.geometry.computeVertexNormals();
              c.rotation.y = Math.PI;
              c.material = buildBrainMaterial();
            }
          });
          brain.scale.setScalar(250);
          scene.add(brain);
          brainMeshRef.current = brain;
          const children = [];
          brain.traverse(c => { if (c.isMesh) children.push(c); });
          brainMeshChildrenRef.current = children;
        });
      }
      return;
    }
    graphRef.current.d3ReheatSimulation();
  }, []);

  // ── Node click ────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((node) => {
    nodeClickedRef.current = true;
    setTimeout(() => { nodeClickedRef.current = false; }, 0);
    setSelectedNode(node);
    selectedNodeRef.current = node;
    initAudio(); resumeAudio();
    if (!graphRef.current) return;
    const scene = graphRef.current.scene();
    if (brainMeshRef.current) {
      brainMeshRef.current.scale.setScalar(300);
      const core = scene.getObjectByName('core-light');
      if (core) core.intensity = 40;
      setTimeout(() => {
        if (brainMeshRef.current) brainMeshRef.current.scale.setScalar(250);
        if (core) core.intensity = 15;
      }, 150);
    }
    nodeFocused.current = true;
    const dist = Math.sqrt(node.x**2 + node.y**2 + node.z**2) || 1;
    graphRef.current.cameraPosition(
      { x: node.x + (node.x/dist)*25, y: node.y + (node.y/dist)*25, z: node.z + (node.z/dist)*25 },
      node, 1400
    );
  }, []);

  const handleLobeBack = useCallback(() => {
    if (!graphRef.current) return;
    graphRef.current.cameraPosition({ x: 0, y: 0, z: 430 }, { x: 0, y: 0, z: 0 }, 1200);
    targetZ.current = 430;
    setSelectedLobe(null);
    setTimeout(() => { nodeFocused.current = false; }, 1300);
  }, []);

  // ── ResizeObserver: sync canvas dims with flex container ─────────────────
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setCanvasDims({ width, height });
        const renderer = graphRef.current?.renderer();
        if (renderer) renderer.setSize(width, height);
        const camera = graphRef.current?.camera();
        if (camera) {
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // ── Escape key: close active panel ────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (selectedNodeRef.current) { handleBack(); return; }
      if (selectedLobe) handleLobeBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedLobe, handleBack, handleLobeBack]);

  const getLobeLabelPos = useCallback((lobeKey) => {
    if (!graphRef.current || !lobeKey) return null;
    const camera = graphRef.current.camera();
    if (!camera) return null;
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const vec = LOBE_CONFIG[lobeKey].position.clone().project(camera);
    return {
      x: rect.left + (vec.x * 0.5 + 0.5) * rect.width,
      y: rect.top  + (-vec.y * 0.5 + 0.5) * rect.height,
    };
  }, []);

  // Complexity badge: get 2D screen position of hovered node
  const getNodeScreenPos = useCallback((node) => {
    if (!graphRef.current || !node || node.x === undefined) return null;
    const camera = graphRef.current.camera();
    if (!camera) return null;
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const vec = new THREE.Vector3(node.x, node.y, node.z).project(camera);
    return {
      x: rect.left + (vec.x * 0.5 + 0.5) * rect.width,
      y: rect.top  + (-vec.y * 0.5 + 0.5) * rect.height,
    };
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="container" data-mood={mood}>
      <canvas
        ref={starCanvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', zIndex: 0, pointerEvents: 'none' }}
      />
      <div className="vignette" />

      {/* Left panel slot — lobe panel */}
      <div className={`panel-slot--left${selectedLobe && !selectedNode ? ' open' : ''}`}>
        {selectedLobe && !selectedNode && (
          <LobePanel lobeKey={selectedLobe} onNodeSelect={handleNodeClick} />
        )}
      </div>

      {/* Canvas area — fills remaining flex space */}
      <div className="canvas-area" ref={canvasContainerRef}>
        <ForceGraph3D
          ref={graphRef}
          graphData={graphData}
          backgroundColor="rgba(0,0,0,0)"
          showNavInfo={false}
          width={canvasDims.width}
          height={canvasDims.height}
          nodeThreeObject={(node) => {
            const m = buildCellMesh(node);
            if (!nodeGroupsRef.current.has(node.id)) nodeGroupsRef.current.set(node.id, m);
            return m;
          }}
          nodeThreeObjectExtend={false}
          nodeLabel={n => n.name}
          linkThreeMaterial={makeLinkMaterial}
          linkDirectionalParticles={2}
          linkDirectionalParticleSpeed={0.006}
          linkDirectionalParticleWidth={2.5}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.5}
          d3AlphaTarget={0.05}
          d3Force={(name, force) => {
            if (name === 'charge') force.strength(-300);
            if (name === 'collide') force.radius(35);
            if (name === 'link') force.distance(l => (l.source.id==='mind'||l.target.id==='mind') ? 300 : 80).strength(0.3);
            if (name === 'x') force.x(n => {
              if (n.lobe !== 'temporal') return 0;
              return n.side === 'left' ? -260 : 260;
            }).strength(0.2);
            if (name === 'y') force.y(n => {
              if (n.lobe === 'frontal')   return 90;
              if (n.lobe === 'parietal')  return 60;
              if (n.lobe === 'occipital') return -40;
              return 0;
            }).strength(0.2);
            if (name === 'z') force.z(n => {
              if (n.lobe === 'frontal')   return 340;
              if (n.lobe === 'parietal')  return 80;
              if (n.lobe === 'occipital') return -260;
              return 30;
            }).strength(0.2);
          }}
          onNodeClick={handleNodeClick}
          onNodeHover={(node) => setHoveredNode(node?.id === 'mind' ? null : node)}
          onNodeDrag={handleNodeDrag}
          onNodeDragEnd={handleNodeDragEnd}
          onEngineStop={onEngineStop}
        />
      </div>

      {/* Right panel slot — node detail panel */}
      <div className={`panel-slot--right${selectedNode ? ' open' : ''}`}>
        {selectedNode && (
          <NodePanel
            node={selectedNode}
            onAddToTray={handleAddToTray}
            onNodeSelect={handleNodeClick}
            onClose={handleBack}
          />
        )}
      </div>

      {/* HUD */}
      <div className="interface-hud">
        <div className="title-overlay">
          <span className="title-main">Faith Tan</span>
          <span className="title-sub">a cartography of thought</span>
        </div>
      </div>

      {/* Working Memory Tray */}
      <WorkingMemoryTray
        items={trayItems}
        onRemove={handleRemoveFromTray}
        onSelect={handleNodeClick}
        overloaded={trayItems.length >= 7}
        isDragTarget={isDraggingToTray}
      />

      {!selectedNode && <div className="scroll-hint">scroll to descend</div>}

      {/* Lobe tooltip */}
      {hoveredLobe && !selectedLobe && !selectedNode && (() => {
        const pos = getLobeLabelPos(hoveredLobe);
        if (!pos) return null;
        const cfg = LOBE_CONFIG[hoveredLobe];
        return (
          <div className="lobe-tooltip" style={{ left: `${pos.x}px`, top: `${pos.y}px` }}>
            <span className="lobe-tooltip__label">{cfg.label}</span>
            <span className="lobe-tooltip__sublabel">{cfg.sublabel}</span>
          </div>
        );
      })()}

      {/* Back button for lobe panel */}
      {selectedLobe && !selectedNode && (
        <button className="back-btn" onClick={handleLobeBack}>← Back</button>
      )}

      {/* Complexity badge on hover */}
      {hoveredNode && !selectedNode && hoveredNode.complexity && (() => {
        const pos = getNodeScreenPos(hoveredNode);
        if (!pos) return null;
        return (
          <div
            className="complexity-badge"
            style={{ left: `${pos.x + 18}px`, top: `${pos.y - 22}px` }}
          >
            {hoveredNode.complexity}
          </div>
        );
      })()}

      {/* Mood selector */}
      <MoodSelector mood={mood} onChange={handleMoodChange} />

      {/* Journal overlay */}
      {showJournal && <Journal onClose={() => setShowJournal(false)} />}

      {/* Homunculus easter egg */}
      {showHomunculus && (
        <Homunculus
          onClose={() => setShowHomunculus(false)}
          onNodeSelect={handleNodeClick}
        />
      )}

      {/* Persistent UI buttons */}
      <button
        className="journal-btn"
        onClick={() => setShowJournal(s => !s)}
        title="stream of consciousness"
      >∿</button>

      <button
        className="homunculus-trigger"
        onClick={() => setShowHomunculus(true)}
        title="homunculus"
      >◎</button>

      <button
        className="audio-mute-btn"
        onClick={handleToggleMute}
        title={isMuted ? 'unmute' : 'mute audio'}
      >{isMuted ? '♪' : '♫'}</button>

      {isDraggingToTray && dragNodeRef.current && (
        <div
          className="drag-ghost"
          style={{
            left: 'var(--cursor-x, -200px)',
            top:  'var(--cursor-y, -200px)',
          }}
        >
          <span
            className="drag-ghost__dot"
            style={{ background: ['#E8B86D','#B04040','#2E7BA8','#5C8C6A'][dragNodeRef.current.group ?? 0] }}
          />
          <span className="drag-ghost__label">
            {dragNodeRef.current.name.length > 14
              ? dragNodeRef.current.name.slice(0, 14) + '…'
              : dragNodeRef.current.name}
          </span>
        </div>
      )}
      <div className="cursor-dot" />
      <svg className="eeg-bar" viewBox="0 0 1920 60" preserveAspectRatio="none" aria-hidden="true">
        <path ref={eegPathRef} className="eeg-bar__wave" />
      </svg>
    </div>
  );
}
