import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const PARTICLE_COUNT = 3000;
const CANVAS_SIZE = 1024;

const Particles = ({ handState, activeShape, particleColor }) => {
    const pointsRef = useRef();
    const particlesRef = useRef([]); // Store current physics state { x, y, z, vx, vy, vz }

    // Generate target positions based on text
    const targetPositions = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = CANVAS_SIZE;
        canvas.height = CANVAS_SIZE;
        const ctx = canvas.getContext('2d');

        // Clear
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        // Draw text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Adjust font size based on text length
        const fontSize = activeShape.length > 1 ? 200 : 600;
        ctx.font = `bold ${fontSize}px Arial, "Microsoft YaHei", sans-serif`;

        ctx.fillText(activeShape, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

        const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        const data = imageData.data;

        const points = [];
        // Sample points
        for (let i = 0; i < CANVAS_SIZE; i += 8) { // Step size controls density
            for (let j = 0; j < CANVAS_SIZE; j += 8) {
                const index = (i * CANVAS_SIZE + j) * 4;
                if (data[index] > 128) { // If pixel is bright
                    // Map to 3D space (-10 to 10)
                    const x = (j / CANVAS_SIZE - 0.5) * 20;
                    const y = -(i / CANVAS_SIZE - 0.5) * 20; // Flip Y
                    points.push(new THREE.Vector3(x, y, 0));
                }
            }
        }

        // Fill or trim to match PARTICLE_COUNT
        const result = new Array(PARTICLE_COUNT).fill(null).map((_, i) => {
            if (points.length > 0) {
                return points[i % points.length];
            }
            return new THREE.Vector3((Math.random() - 0.5) * 20, (Math.random() - 0.5) * 20, 0);
        });

        return result;
    }, [activeShape]);

    // Initialize particles
    useEffect(() => {
        particlesRef.current = new Array(PARTICLE_COUNT).fill(null).map(() => ({
            x: (Math.random() - 0.5) * 30,
            y: (Math.random() - 0.5) * 30,
            z: (Math.random() - 0.5) * 10,
            vx: 0,
            vy: 0,
            vz: 0
        }));
    }, []);

    useFrame(() => {
        if (!pointsRef.current || !particlesRef.current) return;

        const positions = pointsRef.current.geometry.attributes.position.array;
        const handPos = new THREE.Vector3(...handState.position);
        const isHandOpen = handState.isOpen;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const p = particlesRef.current[i];
            const target = targetPositions[i];

            // Physics params
            const spring = 0.05;
            const friction = 0.90;
            const repulsionRadius = 5;
            const repulsionForce = 2.0;

            // Force to target
            let fx = (target.x - p.x) * spring;
            let fy = (target.y - p.y) * spring;
            let fz = (target.z - p.z) * spring;

            // Interaction
            if (handState.isDetected) {
                const dx = p.x - handPos.x;
                const dy = p.y - handPos.y;
                const dz = p.z - handPos.z;
                const distSq = dx * dx + dy * dy + dz * dz;
                const dist = Math.sqrt(distSq);

                if (isHandOpen) {
                    // Repulsion / Scatter
                    if (dist < repulsionRadius) {
                        const force = (1 - dist / repulsionRadius) * repulsionForce;
                        fx += (dx / dist) * force;
                        fy += (dy / dist) * force;
                        fz += (dz / dist) * force;
                    }
                } else {
                    // Attraction / Gather (Stronger pull to target or hand?)
                    // User said: "Close hand, particles gather". 
                    // Usually means gather to the target shape or gather to the hand?
                    // "Zhang kai shou lizi kuosan bing xiaoshi" (Spread and disappear)
                    // "He shou, lizi juji" (Gather)
                    // Let's assume "Gather" means form the shape tightly.
                    // And "Spread" means explode/disperse.

                    // If hand is closed, we just let the spring force do its job (gather to shape).
                    // Maybe increase spring force?
                    // Or if "Spread" means disperse, we add random noise or repulsion from center.
                }
            }

            // If hand is open, we add extra dispersion if requested "Spread and disappear"
            // "Disappear" might mean fade out or spread far.
            // Let's just spread for now.

            p.vx += fx;
            p.vy += fy;
            p.vz += fz;

            p.vx *= friction;
            p.vy *= friction;
            p.vz *= friction;

            p.x += p.vx;
            p.y += p.vy;
            p.z += p.vz;

            positions[i * 3] = p.x;
            positions[i * 3 + 1] = p.y;
            positions[i * 3 + 2] = p.z;
        }

        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    });

    const initialPositions = useMemo(() => {
        const pos = new Float32Array(PARTICLE_COUNT * 3);
        for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
            pos[i] = (Math.random() - 0.5) * 20;
        }
        return pos;
    }, []);

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={PARTICLE_COUNT}
                    array={initialPositions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.15}
                color={particleColor}
                sizeAttenuation={true}
                transparent={true}
                opacity={0.8}
                blending={THREE.AdditiveBlending}
            />
        </points>
    );
};

export default Particles;
