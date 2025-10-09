import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface GraphBackgroundProps {
  seed?: number;
  density?: 'low' | 'medium' | 'high';
  glow?: number;
  labelChance?: number;
}

interface GraphNode {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  connections: number[];
  size: number;
  label?: string;
}

const LABELS = [
  'connected_to', 'influenced', 'related', 'discovered', 'shared',
  'analyzed', 'linked', 'referenced', 'expanded', 'derived'
];

export const GraphBackground = ({
  seed = 1,
  density = 'medium',
  glow = 0.6,
  labelChance = 0.1
}: GraphBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const frameIdRef = useRef<number>(0);
  const [webGLAvailable, setWebGLAvailable] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Seeded random number generator
  const seededRandom = (s: number) => {
    let seed = s;
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  };

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Generate Barabási–Albert scale-free graph
  const generateGraph = (nodeCount: number, random: () => number): GraphNode[] => {
    const nodes: GraphNode[] = [];
    const m0 = 3; // Initial connected nodes
    const m = 2; // Edges to attach from new node

    // Create initial complete graph
    for (let i = 0; i < m0; i++) {
      const theta = random() * Math.PI * 2;
      const phi = random() * Math.PI;
      const radius = 15 + random() * 10;
      
      nodes.push({
        position: new THREE.Vector3(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
        ),
        velocity: new THREE.Vector3(
          (random() - 0.5) * 0.02,
          (random() - 0.5) * 0.02,
          (random() - 0.5) * 0.02
        ),
        connections: [],
        size: 0.9 + random() * 0.5,
        label: random() < labelChance ? LABELS[Math.floor(random() * LABELS.length)] : undefined
      });
    }

    // Connect initial nodes
    for (let i = 0; i < m0; i++) {
      for (let j = i + 1; j < m0; j++) {
        nodes[i].connections.push(j);
        nodes[j].connections.push(i);
      }
    }

    // Add remaining nodes using preferential attachment
    for (let i = m0; i < nodeCount; i++) {
      const theta = random() * Math.PI * 2;
      const phi = random() * Math.PI;
      const radius = 15 + random() * 10;
      
      const newNode: GraphNode = {
        position: new THREE.Vector3(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
        ),
        velocity: new THREE.Vector3(
          (random() - 0.5) * 0.02,
          (random() - 0.5) * 0.02,
          (random() - 0.5) * 0.02
        ),
        connections: [],
        size: 0.9 + random() * 0.5,
        label: random() < labelChance ? LABELS[Math.floor(random() * LABELS.length)] : undefined
      };

      // Calculate degree distribution for preferential attachment
      const degrees = nodes.map(n => n.connections.length);
      const totalDegree = degrees.reduce((sum, d) => sum + d, 0);

      // Attach to m existing nodes based on their degree
      const targets = new Set<number>();
      while (targets.size < Math.min(m, nodes.length)) {
        let rand = random() * totalDegree;
        for (let j = 0; j < nodes.length; j++) {
          rand -= degrees[j];
          if (rand <= 0 && !targets.has(j)) {
            targets.add(j);
            break;
          }
        }
      }

      targets.forEach(target => {
        newNode.connections.push(target);
        nodes[target].connections.push(i);
      });

      nodes.push(newNode);
    }

    return nodes;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check WebGL support
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLAvailable(false);
        return;
      }
    } catch (e) {
      setWebGLAvailable(false);
      return;
    }

    // Determine node count based on density and device
    const getDensity = () => {
      const dpr = window.devicePixelRatio || 1;
      const isMobile = window.innerWidth < 768;
      
      if (density === 'low' || isMobile) return 200;
      if (density === 'high' && dpr > 1.5) return 500;
      return 350;
    };

    const nodeCount = getDensity();
    const random = seededRandom(seed);
    const nodes = generateGraph(nodeCount, random);

    // Setup Three.js scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05080a, 0.015);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 40;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x05080a, 1);
    rendererRef.current = renderer;

    // Create node geometry (instanced)
    const nodeGeometry = new THREE.SphereGeometry(0.5, 8, 8);
    const nodeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00E5C7,
      transparent: true,
      opacity: glow * 0.8
    });

    const nodeInstancedMesh = new THREE.InstancedMesh(
      nodeGeometry,
      nodeMaterial,
      nodes.length
    );
    
    const matrix = new THREE.Matrix4();
    nodes.forEach((node, i) => {
      matrix.makeScale(node.size, node.size, node.size);
      matrix.setPosition(node.position);
      nodeInstancedMesh.setMatrixAt(i, matrix);
    });
    nodeInstancedMesh.instanceMatrix.needsUpdate = true;
    scene.add(nodeInstancedMesh);

    // Create edge geometry (line segments)
    const edgePositions: number[] = [];
    nodes.forEach((node, i) => {
      node.connections.forEach(targetIdx => {
        if (targetIdx > i) { // Avoid duplicate edges
          edgePositions.push(
            node.position.x, node.position.y, node.position.z,
            nodes[targetIdx].position.x, nodes[targetIdx].position.y, nodes[targetIdx].position.z
          );
        }
      });
    });

    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(edgePositions, 3)
    );

    const edgeMaterial = new THREE.LineBasicMaterial({
      color: 0x00E5C7,
      transparent: true,
      opacity: glow * 0.15,
      blending: THREE.AdditiveBlending
    });

    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    scene.add(edges);

    // Add point lights for glow effect
    const light1 = new THREE.PointLight(0x00E5C7, 0.5, 50);
    light1.position.set(10, 10, 10);
    scene.add(light1);

    const light2 = new THREE.PointLight(0x14FF72, 0.3, 50);
    light2.position.set(-10, -10, -10);
    scene.add(light2);

    // Mouse/touch tracking for parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      mouseX = (x / window.innerWidth) * 2 - 1;
      mouseY = -(y / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleMouseMove);

    // Animation loop
    let time = 0;
    const animate = () => {
      if (document.hidden) {
        frameIdRef.current = requestAnimationFrame(animate);
        return;
      }

      time += prefersReducedMotion ? 0.001 : 0.005;

      // Gentle camera drift
      if (!prefersReducedMotion) {
        targetRotationX = Math.sin(time * 0.3) * 0.1 + mouseY * 0.05;
        targetRotationY = Math.cos(time * 0.2) * 0.1 + mouseX * 0.05;
      }

      camera.rotation.x += (targetRotationX - camera.rotation.x) * 0.05;
      camera.rotation.y += (targetRotationY - camera.rotation.y) * 0.05;

      // Update node positions with gentle motion
      if (!prefersReducedMotion) {
        nodes.forEach((node, i) => {
          // Gentle breathing motion
          const breathe = Math.sin(time + i * 0.1) * 0.02;
          node.position.add(node.velocity);
          node.position.multiplyScalar(1 + breathe * 0.01);

          // Keep nodes within bounds
          const distance = node.position.length();
          if (distance > 30 || distance < 10) {
            node.velocity.multiplyScalar(-0.5);
          }

          matrix.makeScale(node.size, node.size, node.size);
          matrix.setPosition(node.position);
          nodeInstancedMesh.setMatrixAt(i, matrix);
        });
        nodeInstancedMesh.instanceMatrix.needsUpdate = true;

        // Update edge positions
        let idx = 0;
        nodes.forEach((node, i) => {
          node.connections.forEach(targetIdx => {
            if (targetIdx > i) {
              edgePositions[idx++] = node.position.x;
              edgePositions[idx++] = node.position.y;
              edgePositions[idx++] = node.position.z;
              edgePositions[idx++] = nodes[targetIdx].position.x;
              edgePositions[idx++] = nodes[targetIdx].position.y;
              edgePositions[idx++] = nodes[targetIdx].position.z;
            }
          });
        });
        edgeGeometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
      frameIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
      cancelAnimationFrame(frameIdRef.current);
      
      renderer.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      edgeGeometry.dispose();
      edgeMaterial.dispose();
    };
  }, [seed, density, glow, labelChance, prefersReducedMotion]);

  // Capture frame method
  const captureFrame = () => {
    if (!rendererRef.current || !canvasRef.current) return null;
    return canvasRef.current.toDataURL('image/png');
  };

  // Expose captureFrame via ref if needed
  useEffect(() => {
    if (canvasRef.current) {
      (canvasRef.current as any).captureFrame = captureFrame;
    }
  }, []);

  if (!webGLAvailable) {
    // Fallback to Matrix rain
    return <div className="fixed inset-0 z-0 bg-[#05080a]" />;
  }

  return (
    <>
      <canvas ref={canvasRef} className="fixed inset-0 z-0" />
      <div className="fixed inset-0 z-[1] pointer-events-none bg-gradient-radial from-transparent via-transparent to-[#05080a]/60" />
    </>
  );
};
