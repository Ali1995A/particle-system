import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Particles from './Particles';

const Scene = ({ handState, activeShape, particleColor }) => {
    return (
        <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
            <color attach="background" args={['#000000']} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />

            <Particles
                handState={handState}
                activeShape={activeShape}
                particleColor={particleColor}
            />

            <OrbitControls enableZoom={false} enablePan={false} />
        </Canvas>
    );
};

export default Scene;
