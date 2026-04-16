import { useRef, useEffect, useCallback, useState } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { graphData } from './graphData';
import NodePanel from './NodePanel';
import './App.css';

// ─── Palette ─────────────────────────────────────────────────────────────────
const COLORS = {
  0: { base: '#E8B86D', emissive: '#9A5A00', membrane: '#E8C07A' }, // bioluminescent amber
  1: { base: '#B04040', emissive: '#5A1010', membrane: '#C06050' }, // visceral flesh/blood
  2: { base: '#2E7BA8', emissive: '#0A2A5A', membrane: '#3A9ABB' }, // deep ocean cold
};

// ─── Seeded PRNG (Mulberry32) ─────────────────────────────────────────────────
function seededRng(seed) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function strHash(str) {
  let h = 0xdeadbeef;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 2654435761);
  }
  return (h ^ (h >>> 16)) >>> 0;
}

// ─── Brain material ───────────────────────────────────────────────────────────
function buildBrainMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#C07068'),    // warm cortex flesh
    emissive: new THREE.Color('#4A0A05'), // deep blood-red ember
    emissiveIntensity: 0.5,
    roughness: 0.1,         // Makes the surface very smooth/glossy
    metalness: 0.0,
    transmission: 0.5,      // Allows light to pass through the tissue
    thickness: 5.0,         // Simulates the depth of the "flesh"
    ior: 1.45,              // Index of refraction for organic matter
    clearcoat: 1.0,         // Adds a "wet" outer layer
    clearcoatRoughness: 0.1,
    transparent: true,
    opacity: 0.95,
  });
}

// ─── Build organic cell mesh ──────────────────────────────────────────────────
function buildCellMesh(node) {
  // The mind/brain node is replaced by a GLTF mesh added directly to the scene.
  // Return an invisible anchor group so the force simulation still has the node.
  if (node.id === 'mind' || node.id === 'Core' || node.id === 'My Mind') {
    const anchor = new THREE.Group();
    anchor.userData.isMindAnchor = true;
    return anchor;
  }

  const group = new THREE.Group();
  const rng = seededRng(strHash(node.id));
  const radius = (node.size || 6) * 0.95;
  const palette = COLORS[node.group] ?? COLORS[0];

  // Lumpy inner cell body: displace each vertex outward by a random amount
  const geo = new THREE.IcosahedronGeometry(radius, 4); 
  const posAttr = geo.attributes.position;

  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
  
    // Use a smooth sine-based "lump" instead of random spikes
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

  // Ghostly outer membrane
  const memGeo = new THREE.SphereGeometry(radius * 1.35, 14, 10);
  const memMat = new THREE.MeshPhongMaterial({
    color: new THREE.Color(palette.membrane),
    transparent: true,
    opacity: 0.055,
    side: THREE.BackSide,
    depthWrite: false,
  });
  group.add(new THREE.Mesh(memGeo, memMat));

  // Bright nucleus for hub/core nodes
  if ((node.size ?? 0) >= 10) {
    const nucGeo = new THREE.IcosahedronGeometry(radius * 0.32, 1);
    const nucMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(palette.base),
      emissive: new THREE.Color(palette.base),
      emissiveIntensity: 1.2,
      transparent: true,
      opacity: 0.75,
    });
    group.add(new THREE.Mesh(nucGeo, nucMat));
  }

  // Store phase offset for heartbeat animation (after all rng() calls above)
  group.userData.pulsePhase = rng() * Math.PI * 2;

  return group;
}

// ─── Link material ────────────────────────────────────────────────────────────
function makeLinkMaterial(link) {
  const sg = typeof link.source === 'object' ? link.source?.group : undefined;
  const tg = typeof link.target === 'object' ? link.target?.group : undefined;

  let hexColor = '#1A0D08'; // default dark tissue
  if (sg === 1 || tg === 1) hexColor = '#3D1515';
  if (sg === 2 || tg === 2) hexColor = '#0D1F38';
  if ((sg === 1 && tg === 2) || (sg === 2 && tg === 1)) hexColor = '#1F1A30';

  return new THREE.MeshPhongMaterial({
    color: new THREE.Color(hexColor),
    transparent: true,
    opacity: 0.62,
    shininess: 3,
  });
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const graphRef = useRef(null);
  const lightsInitialized = useRef(false);
  const targetZ = useRef(430);
  const currentZ = useRef(430);
  const nodeFocused = useRef(false); // pauses scroll loop while zoomed into a node

  // Brain animation refs
  const brainMeshRef = useRef(null);
  const mindNodeRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const brainTiltRef = useRef({ x: 0, y: 0 });
  const nodeGroupsRef = useRef([]); // collected node groups for heartbeat pulse

  const [selectedNode, setSelectedNode] = useState(null);

  // Scroll wheel → camera Z fly-through (paused while a node is focused)
  useEffect(() => {
    const onWheel = (e) => {
      if (nodeFocused.current) return; // ignore scroll while zoomed in
      e.preventDefault();
      targetZ.current += e.deltaY * 0.38;
      targetZ.current = Math.max(-200, Math.min(800, targetZ.current));
    };
    window.addEventListener('wheel', onWheel, { passive: false });

    let raf;
    const tick = () => {
      if (!nodeFocused.current) {
        // Very low lerp factor (0.038) → slow, viscous, cinematic weight
        currentZ.current += (targetZ.current - currentZ.current) * 0.038;
        if (graphRef.current) {
          graphRef.current.cameraPosition({ z: currentZ.current });
        }
      }
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      window.removeEventListener('wheel', onWheel);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Brain animation: position tracking, mouse tilt, emissive pulse, node heartbeat
  useEffect(() => {
    const onMouseMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', onMouseMove);

    let raf;
    const tick = () => {
      const brain = brainMeshRef.current;
      const mind = mindNodeRef.current;

      if (brain) {
        // Track mind node's simulated world position — only when resolved
        if (mind) {
          brain.position.set(mind.x ?? 0, mind.y ?? 0, mind.z ?? 0);
        }

        // Mouse-reactive tilt — freeze while zoomed into a node
        if (!nodeFocused.current) {
          const tx = -mouseRef.current.y * 0.18; // pitch
          const ty =  mouseRef.current.x * 0.18; // yaw
          brainTiltRef.current.x += (tx - brainTiltRef.current.x) * 0.04;
          brainTiltRef.current.y += (ty - brainTiltRef.current.y) * 0.04;
          brain.rotation.x = brainTiltRef.current.x;
          brain.rotation.y = brainTiltRef.current.y;
        }

        // Emissive breathing glow (not scale — brain should not throb in size)
        const tBrain = performance.now() / 1000;
        brain.traverse((child) => {
          if (child.isMesh && child.material) {
            child.material.emissiveIntensity = 0.45 + 0.22 * Math.sin(tBrain * 0.8);
          }
        });
      }

      // Heartbeat scale pulse on blob nodes — staggered via per-node pulsePhase
      const t = performance.now() / 1000;
      for (const group of nodeGroupsRef.current) {
        const s = 1.0 + 0.045 * Math.sin(t * 1.1 + group.userData.pulsePhase);
        group.scale.setScalar(s);
      }

      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  const onEngineStop = useCallback(() => {
    if (!graphRef.current) return;
    const scene = graphRef.current.scene();

    // 1. Surgical light removal (prevents blackout)
    const toRemove = [];
    scene.traverse((obj) => { 
      if (obj.isLight && obj.name !== 'custom-light') toRemove.push(obj); 
    });
    toRemove.forEach((l) => scene.remove(l));

    if (scene.getObjectByName('custom-light')) return;

    // 2. Add High-Intensity Lights for MeshPhysicalMaterial
    const ambient = new THREE.AmbientLight(0x1a1a2e, 2.0);
    ambient.name = 'custom-light';
    scene.add(ambient);

    const rim = new THREE.DirectionalLight(0xffffff, 5.0);
    rim.position.set(50, 200, -300);
    rim.name = 'custom-light';
    scene.add(rim);

    // 3. Load Model with Fixed Scaling and Centering
    if (brainMeshRef.current || scene.getObjectByName('brain-root')) return;

    const loader = new GLTFLoader();
    // Use a relative path 'brain.glb' instead of '/brain.glb'
    loader.load('brain.glb', (gltf) => {
      const brain = gltf.scene;
      brain.name = 'brain-root';

      // FORCE geometry to center and compute normals so it's light-reactive
      brain.traverse((child) => {
        if (child.isMesh) {
          child.geometry.center(); // <--- This finds the brain if it's off-center
          child.geometry.computeVertexNormals();
          child.material = buildBrainMaterial();
        }
      });

      // Manual scale override (ignores the 'e' error in your logs)
      brain.scale.setScalar(45); // Adjust this number if it's too big/small
      
      brainMeshRef.current = brain;
      scene.add(brain);

      // Track the central node for positioning
      mindNodeRef.current = graphData.nodes.find(n => 
        n.id === 'mind' || n.id === 'Core' || n.id === 'My Mind'
      ) ?? null;
    });
  }, []);

  // Click a node → fly camera into it and open side panel
  const handleNodeClick = useCallback((node) => {
    if (!graphRef.current) return;
    nodeFocused.current = true;

    const dist = Math.sqrt((node.x ?? 0) ** 2 + (node.y ?? 0) ** 2 + (node.z ?? 0) ** 2) || 1;
    const nx = (node.x ?? 0) / dist;
    const ny = (node.y ?? 0) / dist;
    const nz = (node.z ?? 0) / dist;
    const ZOOM_DIST = 35;

    const camPos = {
      x: (node.x ?? 0) + nx * ZOOM_DIST,
      y: (node.y ?? 0) + ny * ZOOM_DIST,
      z: (node.z ?? 0) + nz * ZOOM_DIST,
    };
    const lookAt = { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 };

    graphRef.current.cameraPosition(camPos, lookAt, 1400);
    setSelectedNode(node);
  }, []);

  // Back button → animate camera to macro view and close panel
  const handleBack = useCallback(() => {
    if (!graphRef.current) return;
    graphRef.current.cameraPosition({ x: 0, y: 0, z: 430 }, { x: 0, y: 0, z: 0 }, 1200);
    targetZ.current = 430;
    currentZ.current = 430;
    setSelectedNode(null);
    // Re-enable scroll after camera animation completes
    setTimeout(() => { nodeFocused.current = false; }, 1300);
  }, []);

  return (
    <div className="container">
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        backgroundColor="#05050f"
        enableNavigationControls={false}
        showNavInfo={false}
        nodeThreeObject={buildCellMesh}
        nodeThreeObjectExtend={false}
        nodeLabel={(node) => node.name}
        nodeColor={(node) => COLORS[node.group]?.base ?? '#ffffff'}
        linkThreeMaterial={makeLinkMaterial}
        linkWidth={(link) => link.width ?? 2}
        linkCurvature={0.18}
        linkOpacity={0.68}
        d3AlphaDecay={0.018}
        d3VelocityDecay={0.4}
        warmupTicks={140}
        cooldownTicks={200}
        onEngineStop={onEngineStop}
        onNodeClick={handleNodeClick}
        onNodeHover={(node) => {
          // Changes the cursor to a pointer hand only when touching a lobe
          document.body.style.cursor = node ? 'pointer' : 'auto';
        }}
        width={window.innerWidth}
        height={window.innerHeight}
        linkDirectionalParticles={(link) => {
          const src = typeof link.source === 'object' ? link.source?.id : link.source;
          return src === 'mind' ? 5 : 3;
        }}
        linkDirectionalParticleSpeed={(link) => {
          const src = typeof link.source === 'object' ? link.source?.id : link.source;
          return src === 'mind' ? 0.005 : 0.003;
        }}
        linkDirectionalParticleWidth={0.8} // Reduce width for a finer, data-like flow
        linkDirectionalParticleThreeObject={(link) => {
          // Use a very small sphere with high emissive intensity
          const geo = new THREE.SphereGeometry(0.5, 8, 8); 
          const mat = new THREE.MeshPhongMaterial({
            color: new THREE.Color('#E8B86D'),
            emissive: new THREE.Color('#E8B86D'),
            emissiveIntensity: 3.0, // Makes them "glow" without being bulky
            transparent: true,
            opacity: 0.8
          });
          return new THREE.Mesh(geo, mat);
    }}
      />

      <div className="title-overlay">
        <span className="title-main">My Mind</span>
        <span className="title-sub">a cartography of thought</span>
      </div>

      <div className="scroll-hint">↓ scroll to descend</div>

      <div className="vignette" />

      <NodePanel node={selectedNode} />

      {selectedNode && (
        <button className="back-btn" onClick={handleBack}>
          ← Back to Macro View
        </button>
      )}
    </div>
  );
}
