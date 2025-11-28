import React, { useEffect, useRef } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const HandTracker = ({ onHandUpdate }) => {
    const videoRef = useRef(null);
    const handLandmarkerRef = useRef(null);
    const requestRef = useRef(null);

    useEffect(() => {
        const initHandLandmarker = async () => {
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
            );

            handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
                    delegate: 'GPU',
                },
                runningMode: 'VIDEO',
                numHands: 1,
            });

            startWebcam();
        };

        initHandLandmarker();

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, []);

    const startWebcam = async () => {
        if (!videoRef.current) return;

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user', // Force front camera
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            });
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener('loadeddata', predictWebcam);
        } catch (err) {
            console.error('Error accessing webcam:', err);
        }
    };

    const predictWebcam = () => {
        if (!handLandmarkerRef.current || !videoRef.current) return;

        const startTimeMs = performance.now();
        if (videoRef.current.currentTime !== videoRef.current.lastVideoTime) {
            const detections = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

            if (detections.landmarks && detections.landmarks.length > 0) {
                const landmarks = detections.landmarks[0];

                const wrist = landmarks[0];
                const tips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky

                let avgDist = 0;
                tips.forEach(idx => {
                    const dx = landmarks[idx].x - wrist.x;
                    const dy = landmarks[idx].y - wrist.y;
                    const dz = landmarks[idx].z - wrist.z;
                    avgDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
                });
                avgDist /= tips.length;

                const isClosed = avgDist < 0.25;

                // Mirror X for front camera feel
                const x = (0.5 - landmarks[9].x) * 10;
                const y = (0.5 - landmarks[9].y) * 10;

                onHandUpdate({
                    isOpen: !isClosed,
                    position: [x, y, 0],
                    isDetected: true
                });
            } else {
                onHandUpdate(prev => ({ ...prev, isDetected: false }));
            }

            videoRef.current.lastVideoTime = videoRef.current.currentTime;
        }

        requestRef.current = requestAnimationFrame(predictWebcam);
    };

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '1px',
                height: '1px',
                opacity: 0,
                pointerEvents: 'none',
            }}
        />
    );
};

export default HandTracker;
