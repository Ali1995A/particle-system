import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Particles from './Particles';

const Scene = ({ handState, activeShape, particleColor, quality }) => {
    return (
        <Canvas
            dpr={quality?.dpr ?? 1}
            gl={{
                antialias: quality?.antialias ?? true,
                powerPreference: 'high-performance',
                alpha: false,
                preserveDrawingBuffer: false,
            }}
            camera={{ position: [0, 0, 10], fov: 75 }}
        >
            <color attach="background" args={['#000000']} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />

            <Particles
                handState={handState}
                activeShape={activeShape}
                particleColor={particleColor}
                quality={quality}
            />

            {(quality?.enableControls ?? true) && <OrbitControls enableZoom={false} enablePan={false} />}
        </Canvas>
    );
};

export default Scene;
