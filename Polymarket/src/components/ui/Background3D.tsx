import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import * as THREE from 'three';

// Morphing crystal
function MorphingCrystal({ position, color, scale = 1 }: { 
  position: [number, number, number]; 
  color: string;
  scale?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const originalPositions = useRef<Float32Array | null>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.15;
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.1) * 0.3;
      
      const geometry = meshRef.current.geometry as THREE.BufferGeometry;
      const positions = geometry.attributes.position;
      
      if (!originalPositions.current) {
        originalPositions.current = new Float32Array(positions.array);
      }
      
      for (let i = 0; i < positions.count; i++) {
        const ox = originalPositions.current[i * 3];
        const oy = originalPositions.current[i * 3 + 1];
        const oz = originalPositions.current[i * 3 + 2];
        
        const noise = Math.sin(state.clock.elapsedTime * 0.8 + ox * 2) * 0.15 +
                     Math.cos(state.clock.elapsedTime * 0.6 + oy * 2) * 0.15;
        
        positions.setXYZ(i, ox + ox * noise * 0.3, oy + oy * noise * 0.3, oz + oz * noise * 0.3);
      }
      positions.needsUpdate = true;
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.3} floatIntensity={1}>
      <mesh ref={meshRef} position={position} scale={scale}>
        <octahedronGeometry args={[1, 2]} />
        <meshStandardMaterial 
          color={color}
          transparent
          opacity={0.4}
          metalness={0.8}
          roughness={0.2}
          wireframe
        />
      </mesh>
    </Float>
  );
}

// Flowing ribbon
function FlowingRibbon({ color, offset = 0 }: { color: string; offset?: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const geometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-10, 0, -5),
      new THREE.Vector3(-5, 3, -8),
      new THREE.Vector3(0, -2, -6),
      new THREE.Vector3(5, 4, -10),
      new THREE.Vector3(10, 0, -7),
    ]);
    
    return new THREE.TubeGeometry(curve, 100, 0.08, 8, false);
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2 + offset) * 0.2;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.3 + offset) * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial 
        color={color}
        transparent
        opacity={0.5}
        metalness={0.9}
        roughness={0.1}
        emissive={color}
        emissiveIntensity={0.3}
      />
    </mesh>
  );
}

// Floating ring
function FloatingRing({ position, color, size = 1 }: {
  position: [number, number, number];
  color: string;
  size?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.3;
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={2}>
      <mesh ref={meshRef} position={position}>
        <torusGeometry args={[size, 0.02, 16, 100]} />
        <meshStandardMaterial 
          color={color}
          transparent
          opacity={0.7}
          metalness={1}
          roughness={0}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>
    </Float>
  );
}

// Particle constellation
function ParticleConstellation() {
  const count = 150;
  const meshRef = useRef<THREE.Points>(null);
  const linesRef = useRef<THREE.LineSegments>(null);
  
  const { positions, linePositions } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const points: THREE.Vector3[] = [];
    
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 30;
      const y = (Math.random() - 0.5) * 20;
      const z = (Math.random() - 0.5) * 15 - 8;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      points.push(new THREE.Vector3(x, y, z));
    }
    
    // Create connections between nearby points
    const linePoints: number[] = [];
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dist = points[i].distanceTo(points[j]);
        if (dist < 3) {
          linePoints.push(points[i].x, points[i].y, points[i].z);
          linePoints.push(points[j].x, points[j].y, points[j].z);
        }
      }
    }
    
    return { 
      positions, 
      linePositions: new Float32Array(linePoints)
    };
  }, []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
    if (linesRef.current) {
      linesRef.current.rotation.y = state.clock.elapsedTime * 0.02;
    }
  });

  return (
    <group>
      <points ref={meshRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial 
          size={0.08}
          color="#22d3ee"
          transparent
          opacity={0.8}
          sizeAttenuation
        />
      </points>
      
      <lineSegments ref={linesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={linePositions.length / 3}
            array={linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial 
          color="#8b5cf6"
          transparent
          opacity={0.15}
        />
      </lineSegments>
    </group>
  );
}

// Glowing sphere
function GlowingSphere({ position, color }: {
  position: [number, number, number];
  color: string;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec3 vNormal;
        varying vec3 vPosition;
        
        void main() {
          float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.0);
          float pulse = sin(uTime * 2.0) * 0.2 + 0.8;
          vec3 glow = uColor * fresnel * pulse;
          float alpha = fresnel * 0.6;
          gl_FragColor = vec4(glow, alpha);
        }
      `,
      transparent: true,
      side: THREE.FrontSide,
    });
  }, [color]);

  useFrame((state) => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <Float speed={1.5} rotationIntensity={0.2} floatIntensity={1.5}>
      <mesh ref={meshRef} position={position} material={material}>
        <sphereGeometry args={[0.8, 32, 32]} />
      </mesh>
    </Float>
  );
}

// Main 3D scene
function Scene() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[10, 10, 10]} intensity={0.4} color="#22d3ee" />
      <pointLight position={[-10, -5, 5]} intensity={0.3} color="#a855f7" />
      <pointLight position={[0, -10, 0]} intensity={0.2} color="#f472b6" />
      
      <ParticleConstellation />
      
      {/* Morphing crystals */}
      <MorphingCrystal position={[-5, 2, -8]} color="#22d3ee" scale={1.2} />
      <MorphingCrystal position={[6, -1, -10]} color="#a855f7" scale={1.5} />
      <MorphingCrystal position={[0, 4, -12]} color="#f472b6" scale={0.8} />
      
      {/* Flowing ribbons */}
      <FlowingRibbon color="#22d3ee" offset={0} />
      <FlowingRibbon color="#a855f7" offset={2} />
      
      {/* Floating rings */}
      <FloatingRing position={[-3, -2, -6]} color="#22d3ee" size={0.8} />
      <FloatingRing position={[4, 3, -8]} color="#a855f7" size={1.2} />
      <FloatingRing position={[-6, 1, -10]} color="#f472b6" size={0.6} />
      
      {/* Glowing spheres */}
      <GlowingSphere position={[3, -3, -7]} color="#22d3ee" />
      <GlowingSphere position={[-4, 4, -9]} color="#a855f7" />
    </>
  );
}

export function Background3D() {
  return (
    <div className="fixed inset-0" style={{ zIndex: -1 }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'hsl(260, 25%, 4%)' }}
      >
        <Scene />
      </Canvas>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

export default Background3D;
