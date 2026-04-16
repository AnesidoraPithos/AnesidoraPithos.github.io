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

// // ─── App ──────────────────────────────────────────────────────────────────────
// export default function App() {
//   const graphRef = useRef(null);
//   const lightsInitialized = useRef(false);
//   const targetZ = useRef(430);
//   const currentZ = useRef(430);
//   const nodeFocused = useRef(false); // pauses scroll loop while zoomed into a node

//   // Brain animation refs
//   const brainMeshRef = useRef(null);
//   const mindNodeRef = useRef(null);
//   const mouseRef = useRef({ x: 0, y: 0 });
//   const brainTiltRef = useRef({ x: 0, y: 0 });
//   const nodeGroupsRef = useRef([]); // collected node groups for heartbeat pulse

//   const [selectedNode, setSelectedNode] = useState(null);
//   const [hoveredNode, setHoveredNode] = useState(null);

//   // Scroll wheel → camera Z fly-through (paused while a node is focused)
//   useEffect(() => {
//     const onWheel = (e) => {
//       if (nodeFocused.current) return; // ignore scroll while zoomed in
//       e.preventDefault();
//       targetZ.current += e.deltaY * 0.38;
//       targetZ.current = Math.max(-200, Math.min(800, targetZ.current));
//     };
//     window.addEventListener('wheel', onWheel, { passive: false });

//     let raf;
//     const tick = () => {
//       if (!nodeFocused.current) {
//         // Very low lerp factor (0.038) → slow, viscous, cinematic weight
//         currentZ.current += (targetZ.current - currentZ.current) * 0.038;
//         if (graphRef.current) {
//           graphRef.current.cameraPosition({ z: currentZ.current });
//         }
//       }
//       raf = requestAnimationFrame(tick);
//     };
//     tick();

//     return () => {
//       window.removeEventListener('wheel', onWheel);
//       cancelAnimationFrame(raf);
//     };
//   }, []);

//   // Brain animation: position tracking, mouse tilt, emissive pulse, node heartbeat
//   useEffect(() => {
//     const onMouseMove = (e) => {
//       mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1;
//       mouseRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
//     };
//     window.addEventListener('mousemove', onMouseMove);

//     let raf;
//     const tick = () => {
//       const time = performance.now() / 1000;
//       const brain = brainMeshRef.current;
//       const camera = graphRef.current?.camera(); // Access the "user's eyes"

//       if (brain && camera) {
//         const time = performance.now() / 1000;

//         // 1. Biological Breathing (Scale)
//         // A slow, deep rhythm that mimics a resting heart rate
//         const breathingFactor = 1.0 + Math.sin(time * 0.5) * 0.03;
        
//         // 2. Mouse Proximity "Excitement"
//         // Calculate distance between mouse and center to make the brain "expand" when you hover
//         const mouseDist = Math.sqrt(mouseRef.current.x ** 2 + mouseRef.current.y ** 2);
//         const excitement = (1.0 - mouseDist) * 0.15; 
        
//         brain.scale.setScalar(220 * (breathingFactor + excitement));

//         // 3. Sentient Eye-Contact (Gaze)
//         // We make the brain tilt toward the mouse, but we add a 'delay' (Lerp)
//         // so it feels heavy, like a biological organ turning in fluid.
//         const targetX = -mouseRef.current.y * 0.4;
//         const targetY = mouseRef.current.x * 0.4;
        
//         brain.rotation.x += (targetX - brain.rotation.x) * 0.05;
//         brain.rotation.y += (targetY - brain.rotation.y) * 0.05;

//         // 4. "Thinking" Pulse (Light)
//         brain.traverse((child) => {
//           if (child.isMesh && child.material) {
//             // As you move the mouse faster, the brain glows brighter
//             child.material.emissiveIntensity = 0.5 + (excitement * 4) + Math.sin(time * 2) * 0.2;
//           }
//         });
//       }

//       // 4. Heartbeat scale pulse (Keep your existing logic)
//       const t = performance.now() / 1000;
//       for (const group of nodeGroupsRef.current) {
//         const isHovered = hoveredNode && group.userData.nodeId === hoveredNode.id;
        
//         // Normal breathing heartbeat
//         const basePulse = 1.0 + 0.05 * Math.sin(time * 1.2 + group.userData.pulsePhase);
//         // Attention surge: If hovered, scale up significantly
//         const targetScale = isHovered ? 2.2 : basePulse; 
        
//         // Use a smaller lerp factor (0.1) for a "heavy" fleshy expansion feel
//         group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

//         group.traverse((child) => {
//           if (child.isMesh && child.material) {
//             const targetEmissive = isHovered ? 5.0 : 0.6;
//             child.material.emissiveIntensity += (targetEmissive - child.material.emissiveIntensity) * 0.1;
//           }
//         });
//       }

//       // --- 5. Biological Drift
//       graphData.nodes.forEach((node) => {
//         const seed = node.id.length;
//         // We apply the math to vx/vy/vz (velocity) instead of x/y/z (position)
//         // This creates the 'fluid' movement you're looking for
//         node.vx += Math.sin(time + seed) * 0.15;
//         node.vy += Math.cos(time * 0.8 + seed) * 0.15;
//         node.vz += Math.sin(time * 1.2 + seed) * 0.1;
//       });

//       raf = requestAnimationFrame(tick);
//     };
//     tick();

//     return () => {
//       window.removeEventListener('mousemove', onMouseMove);
//       cancelAnimationFrame(raf);
//     };
//   }, []);

//   const onEngineStop = useCallback(() => {
//     if (!graphRef.current) return;
//     const scene = graphRef.current.scene();

//     // 1. Clean up old lights but keep our new ones
//     const toRemove = [];
//     scene.traverse((obj) => { 
//       if (obj.isLight && obj.name !== 'custom-light') toRemove.push(obj); 
//     });
//     toRemove.forEach((l) => scene.remove(l));

//     if (scene.getObjectByName('custom-light')) return;

//     // 2. KEY LIGHT: Front-left illumination
//     const keyLight = new THREE.DirectionalLight(0xffffff, 4.0);
//     keyLight.position.set(-150, 150, 400);
//     keyLight.name = 'custom-light';
//     scene.add(keyLight);

//     // 3. FILL LIGHT: Soft blue for the right side
//     const fillLight = new THREE.PointLight(0x2244aa, 3.5, 600);
//     fillLight.position.set(200, -100, 200);
//     fillLight.name = 'custom-light';
//     scene.add(fillLight);

//     // 4. BACK LIGHT: Illuminates the rear silhouette
//     const backLight = new THREE.DirectionalLight(0xffffff, 2.5);
//     backLight.position.set(0, 100, -500);
//     backLight.name = 'custom-light';
//     scene.add(backLight);

//     // 5. INTERNAL GLOW: Core amber light
//     const coreLight = new THREE.PointLight(0xe8b86d, 15.0, 450);
//     coreLight.name = 'custom-light';
//     scene.add(coreLight);

//     // 3. Load Model with Fixed Scaling and Centering
//     if (brainMeshRef.current || scene.getObjectByName('brain-root')) return;

//     const loader = new GLTFLoader();
//     // Use a relative path 'brain.glb' instead of '/brain.glb'
//     loader.load('brain.glb', (gltf) => {
//       const brain = gltf.scene;
//       brain.name = 'brain-root';

//       // FORCE geometry to center and compute normals so it's light-reactive
//       brain.traverse((child) => {
//         if (child.isMesh) {
//           child.geometry.center(); // <--- This finds the brain if it's off-center
//           child.geometry.computeVertexNormals();
//           child.material = buildBrainMaterial();

//           child.rotation.y = Math.PI; 
//           child.material = buildBrainMaterial();
//         }
//       });

//       // Manual scale override (ignores the 'e' error in your logs)
//       brain.scale.setScalar(250); // Adjust this number if it's too big/small
      
//       scene.add(brain);
//       brainMeshRef.current = brain;
      
//       // WAKE THE NODES UP
//         if (graphRef.current) {
//           // 1. Manually set the energy target
//           graphRef.current.d3AlphaTarget(0.05); 
//           // 2. Restart the simulation 'engine'
//           graphRef.current.d3Reheat(); 
//         }

//       // Track the central node for positioning
//       mindNodeRef.current = graphData.nodes.find(n => 
//         n.id === 'mind' || n.id === 'Core' || n.id === 'My Mind'
//       ) ?? null;
//     });
//   }, []);

//   // Click a node → fly camera into it and open side panel
//   const handleNodeClick = useCallback((node) => {
//     setSelectedNode(node);
  
//     if (brainMeshRef.current) {
//       // 1. Visual 'Spike': Temporary scale jump
//       brainMeshRef.current.scale.setScalar(300); // Briefly make it larger
      
//       // 2. Light 'Burst': Flash the internal core
//       const core = scene.getObjectByName('custom-light');
//       if (core) core.intensity = 50; 

//       // 3. Reset after a few milliseconds
//       setTimeout(() => {
//         if (brainMeshRef.current) brainMeshRef.current.scale.setScalar(250);
//         if (core) core.intensity = 15;
//       }, 150);
//     }

//     if (!graphRef.current) return;
//     nodeFocused.current = true;

//     const dist = Math.sqrt((node.x ?? 0) ** 2 + (node.y ?? 0) ** 2 + (node.z ?? 0) ** 2) || 1;
//     const nx = (node.x ?? 0) / dist;
//     const ny = (node.y ?? 0) / dist;
//     const nz = (node.z ?? 0) / dist;
//     const ZOOM_DIST = 20;

//     const camPos = {
//       x: (node.x ?? 0) + nx * ZOOM_DIST,
//       y: (node.y ?? 0) + ny * ZOOM_DIST,
//       z: (node.z ?? 0) + nz * ZOOM_DIST,
//     };
//     const lookAt = { x: node.x ?? 0, y: node.y ?? 0, z: node.z ?? 0 };

//     graphRef.current.cameraPosition(camPos, lookAt, 1400);
//     setSelectedNode(node);
//   }, []);

//   // Back button → animate camera to macro view and close panel
//   const handleBack = useCallback(() => {
//     if (!graphRef.current) return;
//     graphRef.current.cameraPosition({ x: 0, y: 0, z: 430 }, { x: 0, y: 0, z: 0 }, 1200);
//     targetZ.current = 430;
//     currentZ.current = 430;
//     setSelectedNode(null);
//     // Re-enable scroll after camera animation completes
//     setTimeout(() => { nodeFocused.current = false; }, 1300);
//   }, []);

//   return (
//     <div className="container">
//       <ForceGraph3D
//         ref={graphRef}
//         graphData={graphData}
//         backgroundColor="#05050f"
//         enableNavigationControls={false}
//         showNavInfo={false}
//         nodeThreeObject={buildCellMesh}
//         nodeThreeObjectExtend={false}
//         nodeLabel={(node) => node.name}
//         nodeColor={(node) => COLORS[node.group]?.base ?? '#ffffff'}
//         linkThreeMaterial={makeLinkMaterial}
//         linkWidth={0.4}                // Updated for hierarchy
//         linkCurvature={0.18}
//         linkOpacity={0.2}             // Updated for hierarchy
//         d3AlphaDecay={0.018}
//         d3VelocityDecay={0.4}
//         warmupTicks={140}
//         cooldownTicks={200}
//         onEngineStop={onEngineStop}
//         onNodeClick={handleNodeClick}
//         width={window.innerWidth}
//         height={window.innerHeight}
//         // Create 'thought' particles that travel along the links
//         linkDirectionalParticles={2}              // 2 particles per link
//         linkDirectionalParticleSpeed={0.005}      // Slow, viscous speed
//         linkDirectionalParticleWidth={2}          // Size of the 'signal'
//         linkDirectionalParticleColor={() => '#4facfe'} // Match your neural glow
//         linkDirectionalParticleThreeObject={(link) => {
//           const sg = typeof link.source === 'object' ? link.source?.group : 0;
//           const col = sg === 1 ? '#C06050' : sg === 2 ? '#3A9ABB' : '#E8C07A';
//           const geo = new THREE.SphereGeometry(0.5, 8, 8); 
//           const mat = new THREE.MeshPhongMaterial({
//             color: new THREE.Color(col),
//             emissive: new THREE.Color(col),
//             emissiveIntensity: 3.0,
//             transparent: true,
//             opacity: 0.8,
//           });
//           return new THREE.Mesh(geo, mat);
//         }}
//         onNodeHover={(node) => {
//           // Set the hovered node state so the animation loop knows who to light up
//           setHoveredNode(node); 

//           if (node && brainMeshRef.current) {
//             document.body.style.cursor = 'pointer';
            
//             // Your existing brain reaction
//             brainMeshRef.current.position.x += (Math.random() - 0.5) * 5;
//             brainMeshRef.current.traverse(child => {
//               if (child.isMesh) child.material.emissiveIntensity = 3.0;
//             });
//           } else {
//             document.body.style.cursor = 'auto';
//           }
//         }}
//         d3AlphaDecay={0.01}             // Makes the simulation "push" for longer
//         d3VelocityDecay={0.15}           // Makes movement "slippery" so nodes don't get stuck
//         d3AlphaTarget={0.05}
//         d3Force={(forceName, force) => {
//           // 1. General Repulsion
//           if (forceName === 'charge') {
//             force.strength(-500); 
//           }

//           // 2. THE ANATOMICAL GRAVITY: Fix: Use 'forceName'
//           if (forceName === 'x') {
//             force.x(node => {
//               if (node.lobe === 'temporal') return node.id.length % 2 === 0 ? 320 : -320;
//               return 0;
//             }).strength(0.15); // Lower strength = more fluid "swimming"
//           }

//           if (forceName === 'y') {
//             force.y(node => {
//               if (node.lobe === 'frontal') return 80;
//               if (node.lobe === 'occipital') return -40;
//               return 0;
//             }).strength(0.15);
//           }

//           if (forceName === 'z') {
//             force.z(node => {
//               if (node.lobe === 'frontal') return 320;
//               if (node.lobe === 'occipital') return -320;
//               if (node.lobe === 'temporal') return 40;
//               return 0;
//             }).strength(0.15);
//           }

//           // 3. Link Distance (The "Void" around the mind)
//           if (forceName === 'link') {
//             force.distance(link => (link.source.id === 'mind' || link.target.id === 'mind' ? 420 : 100));
//             force.strength(0.2);
//           }

//           // 4. Collision Force (Prevents nodes from overlapping)
//           if (forceName === 'collide') {
//             force.radius(45).iterations(2);
//           }
//         }}
//       />

//       {/* The HUD Layer */}
//       <div className="interface-hud">
//         <div className="hud-top">
//           <div className="status-indicator">
//             <span className="pulse-dot"></span>
//             SYSTEM STATUS: OPTIMIZED
//           </div>
//         </div>
        
//         <div className="title-overlay">
//           <span className="title-main">My Mind</span>
//           <span className="title-sub">a cartography of thought</span>
//         </div>

//         <div className="hud-bottom">
//           <div className="nav-hints">
//             CLICK LOBES TO DECODE • SCROLL TO DESCEND
//           </div>
//         </div>
//       </div>

//       <div className="vignette" />

//       {selectedNode && (
//         <>
//           <NodePanel node={selectedNode} />
//           <button className="back-btn" onClick={handleBack}>
//             ← Back to Macro View
//           </button>
//         </>
//       )}
//     </div>
//   );
// }
export default function App() {
  const graphRef = useRef(null);
  const targetZ = useRef(430);
  const currentZ = useRef(430);
  const nodeFocused = useRef(false);

  const brainMeshRef = useRef(null);
  const mindNodeRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const nodeGroupsRef = useRef([]);

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
      for (const group of nodeGroupsRef.current) {
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
      graphData.nodes.forEach(node => {
        if (node.id === 'mind') return;
        const s = node.id.length;
        node.vx += Math.sin(time + s) * 0.12;
        node.vy += Math.cos(time * 0.8 + s) * 0.12;
        node.vz += Math.sin(time * 1.2 + s) * 0.1;
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

    if (scene.getObjectByName('custom-light')) return;

    // Add Lights
    const l1 = new THREE.DirectionalLight(0xffffff, 4); l1.position.set(-150, 150, 400); l1.name = 'custom-light'; scene.add(l1);
    const l2 = new THREE.PointLight(0x2244aa, 3.5, 600); l2.position.set(200, -100, 200); l2.name = 'custom-light'; scene.add(l2);
    const l3 = new THREE.PointLight(0xe8b86d, 15, 450); l3.name = 'custom-light'; scene.add(l3);

    if (brainMeshRef.current) return;

    new GLTFLoader().load('brain.glb', (gltf) => {
      const brain = gltf.scene;
      brain.traverse(c => {
        if (c.isMesh) {
          c.geometry.center();
          c.geometry.computeVertexNormals();
          c.rotation.y = Math.PI; // Correct face orientation
          c.material = buildBrainMaterial();
        }
      });
      brain.scale.setScalar(250);
      scene.add(brain);
      brainMeshRef.current = brain;

      if (graphRef.current) {
        graphRef.current.d3AlphaTarget(0.05); 
        graphRef.current.d3Reheat();
      }
    });
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(node);
    if (!graphRef.current) return;
    
    // Fixed reference to scene
    const scene = graphRef.current.scene();
    if (brainMeshRef.current) {
      brainMeshRef.current.scale.setScalar(300);
      const core = scene.getObjectByName('custom-light');
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
      <ForceGraph3D
        ref={graphRef}
        graphData={graphData}
        backgroundColor="#05050f"
        showNavInfo={false}
        nodeThreeObject={(node) => {
          const m = buildCellMesh(node);
          if (!nodeGroupsRef.current.find(g => g.userData.nodeId === node.id)) {
            nodeGroupsRef.current.push(m);
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
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.1}
        d3AlphaTarget={0.05} 
        
        d3Force={(name, force) => {
          if (name === 'charge') force.strength(-600);
          if (name === 'collide') force.radius(45);
          if (name === 'link') force.distance(l => (l.source.id==='mind'||l.target.id==='mind') ? 420 : 100).strength(0.3);
          
          // Anatomical Gravity (Mapped to Lobes)
          if (name === 'x') force.x(n => n.lobe==='temporal' ? (n.id.length%2===0 ? 340 : -340) : 0).strength(0.2);
          if (name === 'y') force.y(n => n.lobe==='frontal' ? 90 : (n.lobe==='occipital' ? -50 : 0)).strength(0.2);
          if (name === 'z') force.z(n => n.lobe==='frontal' ? 340 : (n.lobe==='occipital' ? -340 : 40)).strength(0.2);
        }}
        
        onNodeClick={handleNodeClick}
        onNodeHover={setHoveredNode}
        onEngineStop={onEngineStop}
      />
      
      {/* HUD & Interface */}
      <div className="interface-hud">
        <div className="title-overlay">
          <span className="title-main">Anesidora Pithos</span>
          <span className="title-sub">a cartography of thought</span>
        </div>
      </div>

      {selectedNode && (
        <>
          <NodePanel node={selectedNode} />
          <button className="back-btn" onClick={handleBack}>← Back</button>
        </>
      )}
    </div>
  );
}