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
  3: { base: '#5C8C6A', emissive: '#1A3320', membrane: '#7AAF88' }, // sage green — nature/play/craft
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
  const memMesh = new THREE.Mesh(memGeo, memMat);
  memMesh.raycast = () => {}; // exclude from hit detection — membrane is visual only
  group.add(memMesh);

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
  group.userData.nodeId = node.id;

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

export default function App() {
  const graphRef = useRef(null);
  const targetZ = useRef(430);
  const currentZ = useRef(430);
  const nodeFocused = useRef(false);

  const brainMeshRef = useRef(null);
  const brainLoadingRef = useRef(false);
  const mindNodeRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const nodeGroupsRef = useRef(new Map());

  const [selectedNode, setSelectedNode] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);

  // --- 1. Camera Fly-through Logic ---

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

  // --- 2. Unified Animation Tick (Brain + Nodes) ---
  useEffect(() => {
    const onMouseMove = (e) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
      document.documentElement.style.setProperty('--cursor-x', `${e.clientX}px`);
      document.documentElement.style.setProperty('--cursor-y', `${e.clientY}px`);
    };
    window.addEventListener('mousemove', onMouseMove);

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

      // Biological Drift (Injecting Momentum)
      const MAX_DIST = 400;
      graphData.nodes.forEach(node => {
        if (node.id === 'mind') return;
        const s = node.id.length;
        node.vx += Math.sin(time + s) * 0.12;
        node.vy += Math.cos(time * 0.8 + s) * 0.12;
        node.vz += Math.sin(time * 1.2 + s) * 0.1;

        // Soft restoring force when node drifts beyond MAX_DIST from origin
        const dist = Math.sqrt((node.x || 0) ** 2 + (node.y || 0) ** 2 + (node.z || 0) ** 2);
        if (dist > MAX_DIST) {
          node.vx -= (node.x / dist) * 0.5;
          node.vy -= (node.y / dist) * 0.5;
          node.vz -= (node.z / dist) * 0.5;
        }
      });

      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => { window.removeEventListener('mousemove', onMouseMove); cancelAnimationFrame(raf); };
  }, [hoveredNode]);

  // --- 3. Scene Setup & Model Loading ---
  const onEngineStop = useCallback(() => {
    if (!graphRef.current) return;
    const scene = graphRef.current.scene();

    // Add lights only once (idempotent, does not cause early return)
    if (!scene.getObjectByName('custom-light')) {
      const l1 = new THREE.DirectionalLight(0xffffff, 4); l1.position.set(-150, 150, 400); l1.name = 'custom-light'; scene.add(l1);
      const l2 = new THREE.PointLight(0x2244aa, 3.5, 600); l2.position.set(200, -100, 200); l2.name = 'custom-light'; scene.add(l2);
      const l3 = new THREE.PointLight(0xe8b86d, 15, 450); l3.name = 'core-light'; scene.add(l3);
    }

    // Load brain only once (returns while async load is in-flight)
    if (!brainMeshRef.current) {
      // Keep simulation alive while brain loads
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
        });
      }
      return;
    }

    // Brain already loaded — keep simulation alive on every subsequent stop
    graphRef.current.d3ReheatSimulation();
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    if (!graphRef.current) return;
    
    // Fixed reference to scene
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
    graphRef.current.cameraPosition({
      x: node.x + (node.x/dist)*25,
      y: node.y + (node.y/dist)*25,
      z: node.z + (node.z/dist)*25
    }, node, 1400);
  }, []);

  const handleBack = useCallback(() => {
    if (!graphRef.current) return;
    graphRef.current.cameraPosition({ x: 0, y: 0, z: 430 }, { x: 0, y: 0, z: 0 }, 1200);
    targetZ.current = 430;
    setSelectedNode(null);
    setTimeout(() => { nodeFocused.current = false; }, 1300);
  }, []);

  return (
    <div className="container">
      <div className="vignette" />
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        backgroundColor="#05050f"
        showNavInfo={false}
        nodeThreeObject={(node) => {
          const m = buildCellMesh(node);
          if (!nodeGroupsRef.current.has(node.id)) {
            nodeGroupsRef.current.set(node.id, m);
          }
          return m;
        }}
        nodeThreeObjectExtend={false}
        nodeLabel={n => n.name}
        linkThreeMaterial={makeLinkMaterial}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.006}
        linkDirectionalParticleWidth={2.5}
        
        // --- CLEANED PHYSICS (NO DUPLICATES) ---
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.2}
        d3AlphaTarget={0.05} 
        
        d3Force={(name, force) => {
          if (name === 'charge') force.strength(-300);
          if (name === 'collide') force.radius(35);
          if (name === 'link') force.distance(l => (l.source.id==='mind'||l.target.id==='mind') ? 300 : 80).strength(0.3);
          
          // Anatomical Gravity (Mapped to Lobes)
          if (name === 'x') force.x(n => {
            if (n.lobe !== 'temporal') return 0;
            return n.side === 'left' ? -260 : 260;
          }).strength(0.2);
          if (name === 'y') force.y(n => {
            if (n.lobe === 'frontal')  return 90;
            if (n.lobe === 'parietal') return 60;
            if (n.lobe === 'occipital') return -40;
            return 0;
          }).strength(0.2);
          if (name === 'z') force.z(n => {
            if (n.lobe === 'frontal')  return 340;
            if (n.lobe === 'parietal') return 80;
            if (n.lobe === 'occipital') return -260;
            return 30;
          }).strength(0.2);
        }}
        
        onNodeClick={handleNodeClick}
        onNodeHover={(node) => setHoveredNode(node?.id === 'mind' ? null : node)}
        onEngineStop={onEngineStop}
      />
      
      {/* HUD & Interface */}
      <div className="interface-hud">
        <div className="title-overlay">
          <span className="title-main">Anesidora Pithos</span>
          <span className="title-sub">a cartography of thought</span>
        </div>
      </div>

      {!selectedNode && <div className="scroll-hint">scroll to descend</div>}

      {selectedNode && (
        <>
          <NodePanel node={selectedNode} />
          <button className="back-btn" onClick={handleBack}>← Back</button>
        </>
      )}

      <div className="cursor-dot" />
    </div>
  );
}