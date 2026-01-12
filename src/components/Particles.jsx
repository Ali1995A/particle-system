import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const DEFAULT_PARTICLE_COUNT = 3000;
const DEFAULT_TEXT_CANVAS_SIZE = 1024;
const DEFAULT_TEXT_SAMPLE_STEP = 8;
const DEFAULT_UPDATE_FPS = 60;

const hashString = (str) => {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
};

const mulberry32 = (seed) => {
    let t = seed >>> 0;
    return () => {
        t += 0x6D2B79F5;
        let x = Math.imul(t ^ (t >>> 15), t | 1);
        x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
        return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
};

const Particles = ({ handState, activeShape, particleColor, quality }) => {
    const pointsRef = useRef();
    const particlesPosRef = useRef(null); // Float32Array [x,y,z,...]
    const particlesVelRef = useRef(null); // Float32Array [vx,vy,vz,...]
    const accRef = useRef(0);

    const particleCount = quality?.particleCount ?? DEFAULT_PARTICLE_COUNT;
    const canvasSize = quality?.textCanvasSize ?? DEFAULT_TEXT_CANVAS_SIZE;
    const sampleStep = quality?.textSampleStep ?? DEFAULT_TEXT_SAMPLE_STEP;
    const updateFps = quality?.particleUpdateFps ?? DEFAULT_UPDATE_FPS;

    // Generate target positions based on text
    const targetPositions = useMemo(() => {
        const rng = mulberry32(hashString(String(activeShape)) ^ particleCount);
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext('2d');

        // Clear
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvasSize, canvasSize);

        // Draw text
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Adjust font size based on text length
        const fontSize = activeShape.length > 1 ? 200 : 600;
        ctx.font = `bold ${fontSize}px Arial, "Microsoft YaHei", sans-serif`;

        ctx.fillText(activeShape, canvasSize / 2, canvasSize / 2);

        const imageData = ctx.getImageData(0, 0, canvasSize, canvasSize);
        const data = imageData.data;

        const points = [];
        // Sample points
        for (let i = 0; i < canvasSize; i += sampleStep) { // Step size controls density
            for (let j = 0; j < canvasSize; j += sampleStep) {
                const index = (i * canvasSize + j) * 4;
                if (data[index] > 128) { // If pixel is bright
                    // Map to 3D space (-10 to 10)
                    const x = (j / canvasSize - 0.5) * 20;
                    const y = -(i / canvasSize - 0.5) * 20; // Flip Y
                    points.push(x, y);
                }
            }
        }

        const out = new Float32Array(particleCount * 3);
        if (points.length > 0) {
            const len = points.length / 2;
            for (let i = 0; i < particleCount; i++) {
                const pi = (i % len) * 2;
                const oi = i * 3;
                out[oi] = points[pi];
                out[oi + 1] = points[pi + 1];
                out[oi + 2] = 0;
            }
            return out;
        }

        for (let i = 0; i < particleCount; i++) {
            const oi = i * 3;
            out[oi] = (rng() - 0.5) * 20;
            out[oi + 1] = (rng() - 0.5) * 20;
            out[oi + 2] = 0;
        }
        return out;
    }, [activeShape, canvasSize, sampleStep, particleCount]);

    // Initialize particles
    useEffect(() => {
        const rng = mulberry32(0xC0FFEE ^ particleCount);
        const pos = new Float32Array(particleCount * 3);
        const vel = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            const oi = i * 3;
            pos[oi] = (rng() - 0.5) * 30;
            pos[oi + 1] = (rng() - 0.5) * 30;
            pos[oi + 2] = (rng() - 0.5) * 10;
        }
        particlesPosRef.current = pos;
        particlesVelRef.current = vel;
        accRef.current = 0;
    }, [particleCount]);

    useFrame((_, delta) => {
        if (!pointsRef.current || !particlesPosRef.current || !particlesVelRef.current) return;
        if (!targetPositions) return;

        accRef.current += delta;
        const step = 1 / updateFps;
        if (accRef.current < step) return;
        const dtFactor = Math.min(3, accRef.current * 60);
        accRef.current = 0;

        const positions = pointsRef.current.geometry.attributes.position.array;
        const handX = handState.position?.[0] ?? 0;
        const handY = handState.position?.[1] ?? 0;
        const handZ = handState.position?.[2] ?? 0;
        const isHandOpen = handState.isOpen;
        const isHandDetected = !!handState.isDetected;

        // Physics params
        const spring = 0.05 * dtFactor;
        const friction = Math.pow(0.90, dtFactor);
        const repulsionRadiusSq = 5 * 5;
        const repulsionForce = 2.0 * dtFactor;

        const pos = particlesPosRef.current;
        const vel = particlesVelRef.current;
        const target = targetPositions;

        for (let i = 0; i < particleCount; i++) {
            const oi = i * 3;
            const px = pos[oi];
            const py = pos[oi + 1];
            const pz = pos[oi + 2];

            // Force to target
            let fx = (target[oi] - px) * spring;
            let fy = (target[oi + 1] - py) * spring;
            let fz = (target[oi + 2] - pz) * spring;

            // Interaction
            if (isHandDetected && isHandOpen) {
                const dx = px - handX;
                const dy = py - handY;
                const dz = pz - handZ;
                const distSq = dx * dx + dy * dy + dz * dz;

                // Repulsion / Scatter
                if (distSq > 0.000001 && distSq < repulsionRadiusSq) {
                    const dist = Math.sqrt(distSq);
                    const force = (1 - dist / 5) * repulsionForce;
                    const invDist = 1 / dist;
                    fx += dx * invDist * force;
                    fy += dy * invDist * force;
                    fz += dz * invDist * force;
                }
            }

            let vx = vel[oi] + fx;
            let vy = vel[oi + 1] + fy;
            let vz = vel[oi + 2] + fz;

            vx *= friction;
            vy *= friction;
            vz *= friction;

            const nx = px + vx;
            const ny = py + vy;
            const nz = pz + vz;

            vel[oi] = vx;
            vel[oi + 1] = vy;
            vel[oi + 2] = vz;

            pos[oi] = nx;
            pos[oi + 1] = ny;
            pos[oi + 2] = nz;

            positions[oi] = nx;
            positions[oi + 1] = ny;
            positions[oi + 2] = nz;
        }

        pointsRef.current.geometry.attributes.position.needsUpdate = true;
    });

    const initialPositions = useMemo(() => {
        const rng = mulberry32(0xBADC0DE ^ particleCount);
        const pos = new Float32Array(particleCount * 3);
        for (let i = 0; i < particleCount; i++) {
            const oi = i * 3;
            pos[oi] = (rng() - 0.5) * 20;
            pos[oi + 1] = (rng() - 0.5) * 20;
            pos[oi + 2] = (rng() - 0.5) * 20;
        }
        return pos;
    }, [particleCount]);

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={particleCount}
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
