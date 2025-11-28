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

        // Detect mobile devices (iOS and Android)
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isMobile = isIOS || isAndroid;

        // Detect browser
        const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);
        const isSafari = /Safari/.test(navigator.userAgent) && !isChrome;

        console.log('Device detection:', {
            isIOS,
            isAndroid,
            isMobile,
            browser: isSafari ? 'Safari' : isChrome ? 'Chrome' : 'Other',
            userAgent: navigator.userAgent
        });

        try {
            // Try multiple constraint strategies
            const constraints = [];

            // Strategy 1: Optimal mobile constraints with flexible resolution ranges
            // Works well on both iOS Safari and Android Chrome
            if (isMobile) {
                console.log('Mobile device detected, using optimized mobile strategy');

                constraints.push({
                    video: {
                        facingMode: { ideal: 'user' },
                        width: { min: 640, ideal: 1280, max: 1920 },
                        height: { min: 480, ideal: 720, max: 1080 },
                        frameRate: { ideal: 30, max: 60 }
                    }
                });
            }

            // Strategy 2: Simple facingMode with ideal resolution (universal)
            constraints.push({
                video: {
                    facingMode: 'user',
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 30 }
                }
            });

            // Strategy 3: Simple facingMode without resolution (maximum compatibility)
            constraints.push({
                video: {
                    facingMode: 'user'
                }
            });

            // Try to enumerate devices to find front camera
            let frontCameraDeviceId = null;
            let hasDeviceLabels = false;

            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const videoDevices = devices.filter(device => device.kind === 'videoinput');
                console.log('Available video devices:', videoDevices.map(d => ({
                    deviceId: d.deviceId,
                    label: d.label || '(unlabeled)',
                    kind: d.kind
                })));

                // Check if we have device labels (requires permission)
                hasDeviceLabels = videoDevices.some(device => device.label !== '');
                console.log('Device labels available:', hasDeviceLabels);

                if (hasDeviceLabels) {
                    // Look for front camera by label
                    const frontCamera = videoDevices.find(device =>
                        device.label.toLowerCase().includes('front') ||
                        device.label.toLowerCase().includes('user') ||
                        device.label.toLowerCase().includes('facetime')
                    );

                    if (frontCamera) {
                        frontCameraDeviceId = frontCamera.deviceId;
                        console.log('Found front camera by label:', frontCamera.label);
                    } else if (videoDevices.length > 0) {
                        // On mobile, first camera is usually front camera
                        frontCameraDeviceId = videoDevices[0].deviceId;
                        console.log('Using first camera as fallback:', videoDevices[0].label);
                    }
                }
            } catch (enumError) {
                console.warn('Could not enumerate devices:', enumError);
            }

            // Strategy 4: Use specific device ID if found (for desktop or as additional fallback)
            if (frontCameraDeviceId && hasDeviceLabels && !isMobile) {
                constraints.push({
                    video: {
                        deviceId: { exact: frontCameraDeviceId },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 }
                    }
                });
            }

            // Strategy 5: Minimal constraints (last resort)
            constraints.push({
                video: true
            });

            console.log(`Will try ${constraints.length} camera strategies`);

            // Try each constraint strategy
            let stream = null;
            let lastError = null;

            for (let i = 0; i < constraints.length; i++) {
                try {
                    console.log(`Trying camera constraint strategy ${i + 1}/${constraints.length}:`, constraints[i]);
                    const testStream = await navigator.mediaDevices.getUserMedia(constraints[i]);

                    // Verify we got the front camera
                    const videoTrack = testStream.getVideoTracks()[0];
                    if (videoTrack) {
                        const settings = videoTrack.getSettings();
                        console.log(`Strategy ${i + 1} camera settings:`, {
                            facingMode: settings.facingMode,
                            width: settings.width,
                            height: settings.height,
                            frameRate: settings.frameRate,
                            deviceId: settings.deviceId
                        });

                        // Check if this is the back camera (we want front camera)
                        if (settings.facingMode === 'environment') {
                            console.warn(`Strategy ${i + 1} returned back camera, trying next strategy...`);
                            testStream.getTracks().forEach(track => track.stop());
                            continue;
                        }
                    }

                    stream = testStream;
                    console.log(`✓ Successfully obtained front camera with strategy ${i + 1}`);
                    break;
                } catch (err) {
                    console.warn(`Strategy ${i + 1} failed:`, err.name, err.message);
                    lastError = err;
                }
            }

            if (!stream) {
                throw lastError || new Error('All camera strategies failed');
            }

            // Log final camera settings
            const videoTrack = stream.getVideoTracks()[0];
            if (videoTrack) {
                const settings = videoTrack.getSettings();
                console.log('✓ Final camera settings:', {
                    facingMode: settings.facingMode,
                    width: settings.width,
                    height: settings.height,
                    frameRate: settings.frameRate,
                    deviceId: settings.deviceId,
                    label: videoTrack.label
                });
            }

            videoRef.current.srcObject = stream;

            // Explicitly play video for iOS
            try {
                await videoRef.current.play();
                console.log('Video playback started');
            } catch (playErr) {
                console.error('Video playback failed:', playErr);
                // Try playing on user interaction if needed (though we can't easily do that here without UI)
            }

            videoRef.current.addEventListener('loadeddata', predictWebcam);
        } catch (err) {
            console.error('Error accessing webcam:', {
                name: err.name,
                message: err.message,
                constraint: err.constraint
            });

            // Provide user-friendly error messages
            let errorMessage = '无法访问摄像头。';
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                errorMessage += '请允许浏览器访问摄像头权限。';
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                errorMessage += '未找到摄像头设备。';
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                errorMessage += '摄像头正被其他应用使用。';
            } else if (err.name === 'OverconstrainedError') {
                errorMessage += '摄像头不支持请求的配置。';
            }

            console.error(errorMessage);
            alert(errorMessage + '\n\n技术详情: ' + err.message);
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
