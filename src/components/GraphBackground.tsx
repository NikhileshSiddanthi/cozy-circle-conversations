import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface GraphBackgroundProps {
  seed?: number;
  density?: 'low' | 'medium' | 'high' | 'auto';
  glow?: number;
  labelChance?: number;
  showMap?: boolean;
}

interface GraphNode {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  connections: number[];
  size: number;
  label?: string;
  color: THREE.Color;
  topic: string;
}

const TOPICS = {
  AI: { color: 0x6EE7FF, keywords: ['LLMs', 'neural', 'GPT', 'training'] },
  Finance: { color: 0x14FF72, keywords: ['markets', 'crypto', 'DeFi', 'funding'] },
  Health: { color: 0xFFB86B, keywords: ['vaccines', 'treatment', 'research'] },
  Sports: { color: 0x6DFFB3, keywords: ['transfers', 'league', 'playoffs'] },
  Entertainment: { color: 0xC084FC, keywords: ['streaming', 'awards', 'premiere'] },
  Climate: { color: 0x4ADE80, keywords: ['carbon', 'renewable', 'solar'] },
  Politics: { color: 0xF472B6, keywords: ['policy', 'election', 'reform'] },
  Education: { color: 0x60A5FA, keywords: ['learning', 'research', 'EdTech'] },
  Travel: { color: 0x22D3EE, keywords: ['tourism', 'destination', 'culture'] }
};

const REGIONS = {
  Americas: new THREE.Vector3(-3, 0, 0),
  Europe: new THREE.Vector3(0, 1, 2),
  Africa: new THREE.Vector3(1, -1, 1),
  Asia: new THREE.Vector3(3, 0.5, 0),
  Oceania: new THREE.Vector3(2, -2, -2)
};

export const GraphBackground: React.FC<GraphBackgroundProps> = ({
  seed = 1,
  density = 'auto',
  glow = 0.65,
  labelChance = 0.2,
  showMap = true
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const frameIdRef = useRef<number>();
  const [webGLAvailable, setWebGLAvailable] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const seededRandom = (s: number) => {
    let seed = s;
    return () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handleChange = () => setPrefersReducedMotion(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const generateGraph = (nodeCount: number, random: () => number): GraphNode[] => {
    const nodes: GraphNode[] = [];
    const topicNames = Object.keys(TOPICS);
    const regionNames = Object.keys(REGIONS);
    
    for (let i = 0; i < Math.min(5, nodeCount); i++) {
      const topic = topicNames[Math.floor(random() * topicNames.length)];
      const region = regionNames[Math.floor(random() * regionNames.length)];
      const regionOffset = REGIONS[region as keyof typeof REGIONS];
      
      const node: GraphNode = {
        position: new THREE.Vector3(
          (random() - 0.5) * 2 + regionOffset.x,
          (random() - 0.5) * 2 + regionOffset.y,
          (random() - 0.5) * 2 + regionOffset.z
        ),
        velocity: new THREE.Vector3((random() - 0.5) * 0.02, (random() - 0.5) * 0.02, (random() - 0.5) * 0.02),
        connections: [],
        size: 0.9 + random() * 0.5,
        color: new THREE.Color(TOPICS[topic as keyof typeof TOPICS].color),
        topic
      };
      
      if (random() < labelChance) {
        const keywords = TOPICS[topic as keyof typeof TOPICS].keywords;
        node.label = keywords[Math.floor(random() * keywords.length)];
      }
      
      nodes.push(node);
    }
    
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        nodes[i].connections.push(j);
        nodes[j].connections.push(i);
      }
    }
    
    for (let i = nodes.length; i < nodeCount; i++) {
      const topic = topicNames[Math.floor(random() * topicNames.length)];
      const region = regionNames[Math.floor(random() * regionNames.length)];
      const regionOffset = REGIONS[region as keyof typeof REGIONS];
      
      const node: GraphNode = {
        position: new THREE.Vector3(
          (random() - 0.5) * 4 + regionOffset.x,
          (random() - 0.5) * 4 + regionOffset.y,
          (random() - 0.5) * 4 + regionOffset.z
        ),
        velocity: new THREE.Vector3((random() - 0.5) * 0.02, (random() - 0.5) * 0.02, (random() - 0.5) * 0.02),
        connections: [],
        size: 0.9 + random() * 0.5,
        color: new THREE.Color(TOPICS[topic as keyof typeof TOPICS].color),
        topic
      };
      
      if (random() < labelChance) {
        const keywords = TOPICS[topic as keyof typeof TOPICS].keywords;
        node.label = keywords[Math.floor(random() * keywords.length)];
      }
      
      let totalDegree = 0;
      for (const existingNode of nodes) {
        totalDegree += existingNode.connections.length;
      }
      
      const m = 2 + Math.floor(random() * 3);
      const connected = new Set<number>();
      
      while (connected.size < Math.min(m, nodes.length)) {
        let randomValue = random() * totalDegree;
        let sum = 0;
        
        for (let j = 0; j < nodes.length; j++) {
          if (connected.has(j)) continue;
          sum += nodes[j].connections.length;
          if (randomValue <= sum) {
            connected.add(j);
            node.connections.push(j);
            nodes[j].connections.push(i);
            break;
          }
        }
      }
      
      nodes.push(node);
    }
    
    return nodes;
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setWebGLAvailable(false);
        return;
      }
    } catch (e) {
      setWebGLAvailable(false);
      return;
    }

    let nodeCount = 600;
    if (density === 'low') nodeCount = 350;
    else if (density === 'high') nodeCount = 900;
    else if (density === 'auto') {
      const isMobile = window.innerWidth < 768;
      const dpr = window.devicePixelRatio || 1;
      if (isMobile) nodeCount = 350;
      else if (dpr > 1.5) nodeCount = 600;
      else nodeCount = 900;
    }

    const random = seededRandom(seed);
    const nodes = generateGraph(nodeCount, random);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 15);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    const nodeGeometry = new THREE.SphereGeometry(1, 16, 16);
    const nodeMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9 });
    const nodeMesh = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, nodes.length);
    
    const nodeMatrix = new THREE.Matrix4();
    const nodeColors = new Float32Array(nodes.length * 3);
    
    nodes.forEach((node, i) => {
      nodeMatrix.setPosition(node.position);
      nodeMatrix.scale(new THREE.Vector3(node.size * 0.15, node.size * 0.15, node.size * 0.15));
      nodeMesh.setMatrixAt(i, nodeMatrix);
      nodeColors[i * 3] = node.color.r;
      nodeColors[i * 3 + 1] = node.color.g;
      nodeColors[i * 3 + 2] = node.color.b;
    });
    
    nodeMesh.geometry.setAttribute('color', new THREE.InstancedBufferAttribute(nodeColors, 3));
    scene.add(nodeMesh);

    const edgePositions: number[] = [];
    const edgeColors: number[] = [];
    
    nodes.forEach((node, i) => {
      node.connections.forEach(targetIdx => {
        if (targetIdx > i) {
          const target = nodes[targetIdx];
          edgePositions.push(node.position.x, node.position.y, node.position.z);
          edgePositions.push(target.position.x, target.position.y, target.position.z);
          const mixColor = new THREE.Color().lerpColors(node.color, target.color, 0.5);
          edgeColors.push(mixColor.r, mixColor.g, mixColor.b);
          edgeColors.push(mixColor.r, mixColor.g, mixColor.b);
        }
      });
    });
    
    const edgeGeometry = new THREE.BufferGeometry();
    edgeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(edgePositions, 3));
    edgeGeometry.setAttribute('color', new THREE.Float32BufferAttribute(edgeColors, 3));
    const edgeMaterial = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.15 + glow * 0.15 });
    const edgeMesh = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    scene.add(edgeMesh);

    const ambientLight = new THREE.AmbientLight(0x404040, glow);
    scene.add(ambientLight);

    const pointLights = [
      new THREE.PointLight(0x00E5C7, glow * 2, 50),
      new THREE.PointLight(0x14FF72, glow * 1.5, 50),
      new THREE.PointLight(0x6EE7FF, glow * 1.5, 50)
    ];
    pointLights[0].position.set(10, 10, 10);
    pointLights[1].position.set(-10, -10, 10);
    pointLights[2].position.set(0, 0, -10);
    pointLights.forEach(light => scene.add(light));

    let mouseX = 0, mouseY = 0;
    const handleMouse = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1;
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1;
    };
    window.addEventListener('mousemove', handleMouse);

    let time = 0;
    const animate = () => {
      if (!prefersReducedMotion && !document.hidden) {
        time += 0.005;
        if (cameraRef.current) {
          cameraRef.current.position.x = Math.sin(time * 0.1) * 0.5 + mouseX * 2;
          cameraRef.current.position.y = Math.cos(time * 0.15) * 0.5 + mouseY * 2;
          cameraRef.current.lookAt(0, 0, 0);
        }

        nodes.forEach((node, i) => {
          const noise = Math.sin(time + i * 0.1) * 0.01;
          node.position.x += noise + node.velocity.x * 0.1;
          node.position.y += noise + node.velocity.y * 0.1;
          node.position.z += noise + node.velocity.z * 0.1;
          nodeMatrix.setPosition(node.position);
          nodeMatrix.scale(new THREE.Vector3(node.size * 0.15, node.size * 0.15, node.size * 0.15));
          nodeMesh.setMatrixAt(i, nodeMatrix);
        });
        nodeMesh.instanceMatrix.needsUpdate = true;

        let edgeIdx = 0;
        nodes.forEach((node, i) => {
          node.connections.forEach(targetIdx => {
            if (targetIdx > i) {
              const target = nodes[targetIdx];
              edgeGeometry.attributes.position.setXYZ(edgeIdx, node.position.x, node.position.y, node.position.z);
              edgeGeometry.attributes.position.setXYZ(edgeIdx + 1, target.position.x, target.position.y, target.position.z);
              edgeIdx += 2;
            }
          });
        });
        edgeGeometry.attributes.position.needsUpdate = true;
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      frameIdRef.current = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.innerWidth / window.innerHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.innerWidth, window.innerHeight);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouse);
      window.removeEventListener('resize', handleResize);
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
      if (rendererRef.current) rendererRef.current.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      edgeGeometry.dispose();
      edgeMaterial.dispose();
    };
  }, [seed, density, glow, labelChance, showMap, prefersReducedMotion]);

  if (!webGLAvailable) {
    return <div className="fixed inset-0 -z-10" style={{ background: 'linear-gradient(180deg, #05080a 0%, #0a1214 100%)' }} />;
  }

  return (
    <div className="fixed inset-0 z-0">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" style={{ background: '#05080a' }} />
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at center, transparent 0%, rgba(5, 8, 10, 0.8) 100%)' }} />
    </div>
  );
};
