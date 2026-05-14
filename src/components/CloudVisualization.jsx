import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Box, Cylinder, Billboard } from '@react-three/drei';
import * as THREE from 'three';

// Emoji Icon Component with enhanced styling
function EmojiIcon({ position, emoji, label, color, size = 0.8, labelOffset = 0, labelSize = null, isMobile = false, isRegisterPage = false }) {
  const iconRef = useRef();
  
  useFrame((state) => {
    if (iconRef.current) {
      iconRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.8) * 0.03;
    }
  });

  // Slightly reduce size for Register page
  const adjustedSize = isRegisterPage ? size * 0.92 : size;
  const finalLabelSize = labelSize !== null ? (isMobile ? labelSize * 0.85 : labelSize) : (isMobile ? adjustedSize * 0.28 : adjustedSize * 0.32);
  const emojiSize = isMobile ? adjustedSize * 1.1 : adjustedSize * 1.3;

  return (
    <group ref={iconRef} position={position}>
      {/* Glowing background ring */}
      <Cylinder args={[adjustedSize * 0.65, adjustedSize * 0.65, 0.05, 32]} position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          opacity={0.25}
          transparent
        />
      </Cylinder>
      {/* Outer glow ring */}
      <Cylinder args={[adjustedSize * 0.75, adjustedSize * 0.75, 0.02, 32]} position={[0, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.2}
          opacity={0.15}
          transparent
        />
      </Cylinder>
      {/* Subtle shadow/glow behind emoji */}
      <Billboard position={[0, 0, adjustedSize * 0.49]}>
        <Text
          fontSize={emojiSize * 1.04}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
        >
          {emoji}
        </Text>
      </Billboard>
      {/* Emoji text with enhanced styling */}
      <Billboard position={[0, 0, adjustedSize * 0.5]}>
        <Text
          fontSize={emojiSize}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.05}
          outlineColor="#000000"
        >
          {emoji}
        </Text>
      </Billboard>
      {/* Label with better spacing */}
      <Billboard position={[0, -adjustedSize * 1.15 + labelOffset, 0]}>
        <Text
          fontSize={finalLabelSize}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#000000"
          fontWeight="bold"
        >
          {label}
        </Text>
      </Billboard>
    </group>
  );
}




// Data packet flowing between components
function DataPacket({ startPos, endPos, delay = 0, color = '#22d3ee', isEncrypted = false }) {
  const packetRef = useRef();
  const meshRef = useRef();

  useFrame((state) => {
    if (packetRef.current && meshRef.current) {
      const time = (state.clock.elapsedTime - delay) % 5;
      const progress = Math.max(0, Math.min(1, time / 3));
      
      if (progress > 0 && progress < 1) {
        const currentPos = [
          startPos[0] + (endPos[0] - startPos[0]) * progress,
          startPos[1] + (endPos[1] - startPos[1]) * progress + Math.sin(progress * Math.PI) * 0.2,
          startPos[2] + (endPos[2] - startPos[2]) * progress,
        ];
        
        packetRef.current.position.set(...currentPos);
        packetRef.current.visible = true;
        // No rotation - just movement
      } else {
        packetRef.current.visible = false;
      }
    }
  });

  return (
    <group ref={packetRef} visible={false}>
      <mesh ref={meshRef}>
        {isEncrypted ? (
          <boxGeometry args={[0.18, 0.18, 0.18]} />
        ) : (
          <octahedronGeometry args={[0.15, 0]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.8}
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
    </group>
  );
}

// Connection line
function ConnectionLine({ startPos, endPos, color = '#22d3ee', opacity = 0.4, dashed = false }) {
  const lineRef = useRef();
  
  useFrame(() => {
    if (lineRef.current) {
      const points = [
        new THREE.Vector3(...startPos),
        new THREE.Vector3(...endPos),
      ];
      lineRef.current.geometry.setFromPoints(points);
    }
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial 
        color={color} 
        opacity={opacity} 
        transparent 
        dashSize={dashed ? 0.15 : undefined}
        gapSize={dashed ? 0.08 : undefined}
      />
    </line>
  );
}

// Main scene
function Scene({ isMobile = false, isRegisterPage = false }) {
  // Adjust positions based on screen size
  const scale = isMobile ? 0.7 : 1.0;
  
  // For Register page, move both user devices inward together to prevent overlap (increased offset to prevent cutting)
  const userDeviceOffset = isRegisterPage ? 0 : 0.1;
  
  // Upload flow positions - original spacing for desktop, scaled for mobile
  // User devices moved inward slightly to prevent touching box edges
  const userDevicePos = isMobile ? [-5.0 * scale, 0.8, 0] : [-4.2 - userDeviceOffset, 0.8, 0];
  const encryptPos = isMobile ? [-2.5 * scale, 0.8, 0] : [-2.0, 0.8, 0];
  const cloudPos = [0, 1.1, 0];
  const keyMgmtPos = [0, -2.0, 0]; // Moved down more to prevent overlap
  
  // Download flow positions - original spacing for desktop, scaled for mobile
  // Move both user devices together (same offset)
  const decryptPos = isMobile ? [2.5 * scale, 0.8, 0] : [2.0, 0.8, 0];
  const userDeviceDownloadPos = isMobile ? [5.0 * scale, 0.8, 0] : [4.2 + userDeviceOffset, 0.8, 0];

  // Upload flow particles
  const uploadParticles = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      delay: i * 0.6,
      color: i % 2 === 0 ? '#22d3ee' : '#a855f7',
    }));
  }, []);

  // Download flow particles
  const downloadParticles = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      delay: i * 0.6 + 2,
      color: i % 2 === 0 ? '#10b981' : '#60a5fa',
    }));
  }, []);

  return (
    <>
      <ambientLight intensity={0.7} />
      <pointLight position={[5, 5, 5]} intensity={1.2} />
      <pointLight position={[-5, -5, -5]} intensity={0.6} color="#3b82f6" />
      <directionalLight position={[0, 3, 3]} intensity={0.5} />
      
      {/* Upload Flow Connections */}
      <ConnectionLine startPos={userDevicePos} endPos={encryptPos} color="#22d3ee" opacity={0.4} />
      <ConnectionLine startPos={encryptPos} endPos={cloudPos} color="#a855f7" opacity={0.4} />
      <ConnectionLine startPos={keyMgmtPos} endPos={encryptPos} color="#fbbf24" opacity={0.3} dashed />
      
      {/* Download Flow Connections */}
      <ConnectionLine startPos={cloudPos} endPos={decryptPos} color="#60a5fa" opacity={0.4} />
      <ConnectionLine startPos={decryptPos} endPos={userDeviceDownloadPos} color="#10b981" opacity={0.4} />
      <ConnectionLine startPos={keyMgmtPos} endPos={decryptPos} color="#fbbf24" opacity={0.3} dashed />
      
      {/* Components with Emoji Icons - with label offsets to prevent overlap */}
      <EmojiIcon position={userDevicePos} emoji="👤" label="User Device" color="#22d3ee" size={0.9} labelOffset={0} isMobile={isMobile} isRegisterPage={isRegisterPage} />
      <EmojiIcon position={encryptPos} emoji="🔐" label="Client Encryption" color="#a855f7" size={0.85} labelOffset={-0.15} labelSize={0.24} isMobile={isMobile} isRegisterPage={isRegisterPage} />
      <EmojiIcon position={cloudPos} emoji="☁️" label="Cloud Storage" color="#60a5fa" size={1.0} labelOffset={-0.1} labelSize={0.26} isMobile={isMobile} isRegisterPage={isRegisterPage} />
      <EmojiIcon position={decryptPos} emoji="🔓" label="Client Decryption" color="#10b981" size={0.85} labelOffset={-0.15} labelSize={0.24} isMobile={isMobile} isRegisterPage={isRegisterPage} />
      <EmojiIcon position={userDeviceDownloadPos} emoji="👤" label="User Device" color="#22d3ee" size={0.9} labelOffset={0} isMobile={isMobile} isRegisterPage={isRegisterPage} />
      <EmojiIcon position={keyMgmtPos} emoji="🔑" label="Key Management" color="#fbbf24" size={0.8} labelOffset={-0.2} isMobile={isMobile} isRegisterPage={isRegisterPage} />
      
      {/* Upload Flow - Plain data to encryption */}
      {uploadParticles.slice(0, 3).map((particle, i) => (
        <DataPacket
          key={`upload-plain-${i}`}
          startPos={userDevicePos}
          endPos={encryptPos}
          delay={particle.delay}
          color={particle.color}
          isEncrypted={false}
        />
      ))}
      
      {/* Upload Flow - Encrypted data to cloud */}
      {uploadParticles.slice(3, 6).map((particle, i) => (
        <DataPacket
          key={`upload-encrypted-${i}`}
          startPos={encryptPos}
          endPos={cloudPos}
          delay={particle.delay}
          color="#a855f7"
          isEncrypted={true}
        />
      ))}
      
      {/* Download Flow - Encrypted data from cloud */}
      {downloadParticles.slice(0, 3).map((particle, i) => (
        <DataPacket
          key={`download-encrypted-${i}`}
          startPos={cloudPos}
          endPos={decryptPos}
          delay={particle.delay}
          color="#60a5fa"
          isEncrypted={true}
        />
      ))}
      
      {/* Download Flow - Decrypted data to user */}
      {downloadParticles.slice(3, 6).map((particle, i) => (
        <DataPacket
          key={`download-plain-${i}`}
          startPos={decryptPos}
          endPos={userDeviceDownloadPos}
          delay={particle.delay}
          color={particle.color}
          isEncrypted={false}
        />
      ))}
      
      {/* Flow Labels - fixed, always faces camera, positioned above components with better spacing */}
      <Billboard position={isMobile ? [-3.75 * scale, 2.1, 0] : [-3.1 - (isRegisterPage ? 0.6 : 0), 2.1, 0]}>
        <Text
          fontSize={isMobile ? 0.18 : 0.22}
          color="#22d3ee"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#000000"
          fontWeight="bold"
        >
          Plain Data
        </Text>
      </Billboard>
      <Billboard position={isMobile ? [-1.25 * scale, 2.1, 0] : [-1.0, 2.1, 0]}>
        <Text
          fontSize={isMobile ? 0.18 : 0.22}
          color="#a855f7"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#000000"
          fontWeight="bold"
        >
          Encrypted
        </Text>
      </Billboard>
      <Billboard position={isMobile ? [1.25 * scale, 2.1, 0] : [1.0, 2.1, 0]}>
        <Text
          fontSize={isMobile ? 0.18 : 0.22}
          color="#60a5fa"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#000000"
          fontWeight="bold"
        >
          Encrypted
        </Text>
      </Billboard>
      <Billboard position={isMobile ? [3.75 * scale, 2.1, 0] : [3.1 + (isRegisterPage ? 0.6 : 0), 2.1, 0]}>
        <Text
          fontSize={isMobile ? 0.18 : 0.22}
          color="#10b981"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.025}
          outlineColor="#000000"
          fontWeight="bold"
        >
          Plain Data
        </Text>
      </Billboard>
    </>
  );
}

export default function CloudVisualization({ isRegisterPage = false }) {
  // Detect mobile screen size
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="h-full w-full rounded-2xl overflow-hidden bg-slate-900/60 border border-white/10">
      <Canvas
        camera={{ position: [0, 1.1, isMobile ? 6.5 : 5.5], fov: isMobile ? 70 : 65 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <Scene isMobile={isMobile} isRegisterPage={isRegisterPage} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          autoRotate={false}
          minPolarAngle={Math.PI / 3.5}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </div>
  );
}
