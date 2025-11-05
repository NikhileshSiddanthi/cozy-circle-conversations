import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const CosmosBackground = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const targetRotationRef = useRef({ x: 0, y: 0 });
  const cometsRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 500;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x05080a, 1); // Deep dark background from theme
    mountRef.current.appendChild(renderer.domElement);

    // Create stars with twinkling effect - using theme colors
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 3500; // Reduced for better performance
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const twinkleSpeed = new Float32Array(starCount);

    // Theme-matched star colors: teal, green, and light variations
    const starColors = [
      new THREE.Color(0x00E5C7), // Primary teal
      new THREE.Color(0x14FF72), // Primary green
      new THREE.Color(0x7FFFD4), // Light teal
      new THREE.Color(0xE8FFFB), // Text color (light)
      new THREE.Color(0x00FFA3), // Mid teal-green
    ];

    for (let i = 0; i < starCount; i++) {
      const radius = Math.random() * 800 + 200;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const color = starColors[Math.floor(Math.random() * starColors.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = Math.random() * 4 + 1;
      twinkleSpeed[i] = Math.random() * 0.02 + 0.01;
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const starMaterial = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Create comets with theme colors
    const createComet = () => {
      const cometGroup = new THREE.Group();
      
      // Randomly choose teal or green for this comet
      const cometColor = Math.random() > 0.5 ? 0x00E5C7 : 0x14FF72;
      
      // Comet head
      const headGeometry = new THREE.SphereGeometry(2.5, 12, 12);
      const headMaterial = new THREE.MeshBasicMaterial({
        color: cometColor,
        transparent: true,
        opacity: 0.95,
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      cometGroup.add(head);

      // Comet tail
      const tailGeometry = new THREE.BufferGeometry();
      const tailCount = 25; // Reduced for performance
      const tailPositions = new Float32Array(tailCount * 3);
      const tailSizes = new Float32Array(tailCount);

      for (let i = 0; i < tailCount; i++) {
        tailPositions[i * 3] = -i * 4;
        tailPositions[i * 3 + 1] = Math.random() * 1.5 - 0.75;
        tailPositions[i * 3 + 2] = Math.random() * 1.5 - 0.75;
        tailSizes[i] = 2.5 - (i / tailCount) * 2;
      }

      tailGeometry.setAttribute('position', new THREE.BufferAttribute(tailPositions, 3));
      tailGeometry.setAttribute('size', new THREE.BufferAttribute(tailSizes, 1));

      const tailMaterial = new THREE.PointsMaterial({
        color: cometColor,
        size: 2.5,
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });

      const tail = new THREE.Points(tailGeometry, tailMaterial);
      cometGroup.add(tail);

      // Random starting position
      const startX = (Math.random() - 0.5) * 2000;
      const startY = (Math.random() - 0.5) * 1000;
      const startZ = -500 + Math.random() * 200;
      
      cometGroup.position.set(startX, startY, startZ);

      // Random velocity
      const velocity = {
        x: (Math.random() - 0.5) * 6,
        y: (Math.random() - 0.5) * 6,
        z: Math.random() * 2.5 + 1.5,
      };

      scene.add(cometGroup);

      return {
        group: cometGroup,
        velocity: velocity,
        life: 0,
        maxLife: 200 + Math.random() * 100,
        headMaterial,
        tailMaterial,
      };
    };

    // Initialize comets
    for (let i = 0; i < 4; i++) {
      cometsRef.current.push(createComet());
    }

    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouseRef.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      targetRotationRef.current.y = mouseRef.current.x * 0.2;
      targetRotationRef.current.x = mouseRef.current.y * 0.2;
    };

    let time = 0;
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      time += 0.01;

      // Animate stars with twinkling
      const sizesAttr = starGeometry.attributes.size;
      for (let i = 0; i < starCount; i++) {
        const twinkle = Math.sin(time * twinkleSpeed[i] * 100 + i) * 0.5 + 0.5;
        sizesAttr.array[i] = sizes[i] * (0.5 + twinkle * 0.5);
      }
      sizesAttr.needsUpdate = true;

      // Smooth parallax rotation
      stars.rotation.y += (targetRotationRef.current.y - stars.rotation.y) * 0.03;
      stars.rotation.x += (targetRotationRef.current.x - stars.rotation.x) * 0.03;
      stars.rotation.y += 0.0001;

      // Animate comets
      cometsRef.current.forEach((comet, index) => {
        comet.life++;
        
        // Update position
        comet.group.position.x += comet.velocity.x;
        comet.group.position.y += comet.velocity.y;
        comet.group.position.z += comet.velocity.z;

        // Rotate comet to face direction of travel
        comet.group.rotation.z = Math.atan2(comet.velocity.y, comet.velocity.x);

        // Fade out near end of life
        const fadeStart = comet.maxLife * 0.8;
        if (comet.life > fadeStart) {
          const fadeProgress = (comet.life - fadeStart) / (comet.maxLife - fadeStart);
          comet.headMaterial.opacity = 0.95 * (1 - fadeProgress);
          comet.tailMaterial.opacity = 0.5 * (1 - fadeProgress);
        }

        // Reset comet when it's out of view or life expired
        if (comet.life > comet.maxLife || 
            comet.group.position.z > 600 ||
            Math.abs(comet.group.position.x) > 1000 ||
            Math.abs(comet.group.position.y) > 1000) {
          scene.remove(comet.group);
          comet.headMaterial.dispose();
          comet.tailMaterial.dispose();
          cometsRef.current[index] = createComet();
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      
      cometsRef.current.forEach(comet => {
        scene.remove(comet.group);
        comet.headMaterial.dispose();
        comet.tailMaterial.dispose();
      });
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      starGeometry.dispose();
      starMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-0">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
};

export default CosmosBackground;
