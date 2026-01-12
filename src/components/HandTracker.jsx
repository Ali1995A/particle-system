import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const HandTracker = forwardRef(({ onHandUpdate }, ref) => {
    const videoRef = useRef(null);
    const handLandmarkerRef = useRef(null);
    const requestRef = useRef(null);
    const streamRef = useRef(null);
    const isFrontCameraRef = useRef(true);

    const startedRef = useRef(false);
    const predictingRef = useRef(false);
    const initPromiseRef = useRef(null);

    const [showPlayButton, setShowPlayButton] = useState(false);
    const [errorText, setErrorText] = useState('');

    const ensureHandLandmarker = () => {
        if (handLandmarkerRef.current) return Promise.resolve(handLandmarkerRef.current);
        if (initPromiseRef.current) return initPromiseRef.current;

        initPromiseRef.current = (async () => {
            // Important: keep the wasm base version aligned with the installed JS package version.
            const vision = await FilesetResolver.forVisionTasks(
                'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'
            );

            const create = async (delegate) =>
                HandLandmarker.createFromOptions(vision, {
                    baseOptions: {
                        modelAssetPath:
                            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
                        delegate,
                    },
                    runningMode: 'VIDEO',
                    numHands: 1,
                });

            // Older iOS devices (and iOS Chrome which is WebKit) may fail with GPU delegate; fallback to CPU.
            try {
                handLandmarkerRef.current = await create('GPU');
            } catch (gpuErr) {
                console.warn('HandLandmarker GPU init failed, falling back to CPU:', gpuErr);
                handLandmarkerRef.current = await create('CPU');
            }

            return handLandmarkerRef.current;
        })()
            .then((lm) => {
                maybeStartPredicting();
                return lm;
            })
            .catch((err) => {
                console.error('Failed to init HandLandmarker:', err);
                // Allow retry.
                initPromiseRef.current = null;
                setErrorText('手势识别加载失败。\n\n点“再试一次”。');
                throw err;
            });

        return initPromiseRef.current;
    };

    const getUserMediaCompat = (constraints) => {
        if (navigator.mediaDevices?.getUserMedia) {
            return navigator.mediaDevices.getUserMedia(constraints);
        }

        const legacyGetUserMedia =
            navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia;

        if (!legacyGetUserMedia) {
            return Promise.reject(new Error('getUserMedia is not supported'));
        }

        return new Promise((resolve, reject) => {
            legacyGetUserMedia.call(navigator, constraints, resolve, reject);
        });
    };

    const cleanupStream = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    };

    const maybeStartPredicting = () => {
        if (!startedRef.current) return;
        if (predictingRef.current) return;
        if (!handLandmarkerRef.current) return;
        if (!videoRef.current) return;
        if (!streamRef.current) return;
        if (videoRef.current.readyState < 2) return; // HAVE_CURRENT_DATA
        predictingRef.current = true;
        predictWebcam();
    };

    useEffect(() => {
        // Preload model in background; user can still start camera immediately.
        void ensureHandLandmarker();

        return () => {
            predictingRef.current = false;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            cleanupStream();
        };
    }, []);

    useImperativeHandle(ref, () => ({
        start: () => {
            startedRef.current = true;
            void ensureHandLandmarker();
            // iOS Safari：需要“用户手势”链路里尽快触发 getUserMedia。
            // 这里不要 await 任何事情，避免打断 user activation。
            void startWebcam();
        },
        stop: () => {
            startedRef.current = false;
            predictingRef.current = false;
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            cleanupStream();
        },
    }));

    const startWebcam = async () => {
        if (!videoRef.current) return;

        const hasModernGetUserMedia = !!navigator.mediaDevices?.getUserMedia;
        const hasLegacyGetUserMedia = !!(
            navigator.getUserMedia ||
            navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia ||
            navigator.msGetUserMedia
        );

        if (!hasModernGetUserMedia && !hasLegacyGetUserMedia) {
            setErrorText('这个浏览器不支持摄像头。请换一个浏览器或升级系统/微信版本。');
            return;
        }

        // iOS/移动端：需要 HTTPS（localhost 例外）。
        if (!window.isSecureContext) {
            setErrorText('需要 HTTPS 才能使用摄像头。请用 https:// 打开这个页面。');
            return;
        }

        // Restart safety
        setErrorText('');
        predictingRef.current = false;
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        cleanupStream();

        // Detect mobile devices (iOS and Android)
        const isIOS =
            /iPad|iPhone|iPod/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isMobile = isIOS || isAndroid;

        // Detect browser
        const ua = navigator.userAgent || '';
        const isChrome = /Chrome/.test(ua) || /CriOS/.test(ua);
        const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);

        // iOS 内置浏览器/WebView（如微信内）对摄像头能力因版本而异：不提前阻止，失败时给“重试”入口。
        const isIOSInAppBrowser = isIOS && /MicroMessenger|Weibo|QQ\//i.test(ua);

        console.log('Device detection:', {
            isIOS,
            isAndroid,
            isMobile,
            browser: isSafari ? 'Safari' : isChrome ? 'Chrome' : 'Other',
            userAgent: navigator.userAgent,
        });

        try {
            // Important: do NOT await anything (like enumerateDevices) before getUserMedia.
            const constraints = [];

            if (isMobile) {
                constraints.push({
                    audio: false,
                    video: {
                        facingMode: 'user',
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 },
                    },
                });
            }

            constraints.push({
                audio: false,
                video: {
                    facingMode: { ideal: 'user' },
                },
            });

            constraints.push({ audio: false, video: true });

            console.log(`Will try ${constraints.length} camera strategies`);

            let stream = null;
            let lastError = null;

            for (let i = 0; i < constraints.length; i++) {
                try {
                    console.log(`Trying camera constraint strategy ${i + 1}/${constraints.length}:`, constraints[i]);
                    const testStream = await getUserMediaCompat(constraints[i]);

                    const videoTrack = testStream.getVideoTracks()[0];
                    if (videoTrack) {
                        const settings = videoTrack.getSettings();
                        console.log(`Strategy ${i + 1} camera settings:`, {
                            facingMode: settings.facingMode,
                            width: settings.width,
                            height: settings.height,
                            frameRate: settings.frameRate,
                            deviceId: settings.deviceId,
                        });

                        const requestedFacingMode = constraints[i]?.video?.facingMode;
                        const requestedFacingModeValue =
                            typeof requestedFacingMode === 'string' ? requestedFacingMode : requestedFacingMode?.ideal;
                        const inferredFacingMode = settings.facingMode || requestedFacingModeValue;
                        isFrontCameraRef.current = inferredFacingMode !== 'environment';
                    }

                    stream = testStream;
                    console.log(`✓ Successfully obtained camera with strategy ${i + 1}`);
                    break;
                } catch (err) {
                    console.warn(`Strategy ${i + 1} failed:`, err?.name, err?.message);
                    lastError = err;
                }
            }

            if (!stream) {
                throw lastError || new Error('All camera strategies failed');
            }

            streamRef.current = stream;
            videoRef.current.lastVideoTime = -1;
            videoRef.current.srcObject = stream;
            videoRef.current.setAttribute('playsinline', '');
            videoRef.current.setAttribute('webkit-playsinline', '');
            videoRef.current.muted = true;
            videoRef.current.autoplay = true;

            videoRef.current.onloadedmetadata = async () => {
                try {
                    console.log('Video metadata loaded, attempting to play...');
                    await videoRef.current.play();
                    console.log('✓ Video playback started successfully');
                    setShowPlayButton(false);
                    maybeStartPredicting();
                } catch (playErr) {
                    console.error('Video playback failed:', playErr);
                    setShowPlayButton(true);
                }
            };

            // If metadata is already ready (some browsers), start immediately.
            if (videoRef.current.readyState >= 1) {
                void videoRef.current.onloadedmetadata();
            }

            // If model init already completed, start predicting once video has data.
            void initPromiseRef.current;
        } catch (err) {
            console.error('Error accessing webcam:', {
                name: err?.name,
                message: err?.message,
                constraint: err?.constraint,
            });

            let errorMessage = '无法打开摄像头。';
            if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
                errorMessage += '请点“允许”后再试一次。';
            } else if (err?.name === 'NotFoundError' || err?.name === 'DevicesNotFoundError') {
                errorMessage += '未找到摄像头设备。';
            } else if (err?.name === 'NotReadableError' || err?.name === 'TrackStartError') {
                errorMessage += '摄像头正被其他应用使用。';
            } else if (err?.name === 'OverconstrainedError') {
                errorMessage += '摄像头不支持请求的配置。';
            }

            if (isIOSInAppBrowser) {
                errorMessage += '\n\n如果没有出现“是否允许使用相机”的询问，请升级微信版本后再试。';
            }

            console.error(errorMessage);
            setErrorText(errorMessage);
        }
    };

    const predictWebcam = () => {
        if (!startedRef.current) {
            predictingRef.current = false;
            return;
        }
        if (!handLandmarkerRef.current || !videoRef.current) {
            predictingRef.current = false;
            return;
        }

        const startTimeMs = performance.now();
        if (videoRef.current.currentTime !== videoRef.current.lastVideoTime) {
            const detections = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);

            if (detections.landmarks && detections.landmarks.length > 0) {
                const landmarks = detections.landmarks[0];

                const wrist = landmarks[0];
                const tips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky

                let avgDist = 0;
                tips.forEach((idx) => {
                    const dx = landmarks[idx].x - wrist.x;
                    const dy = landmarks[idx].y - wrist.y;
                    const dz = landmarks[idx].z - wrist.z;
                    avgDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
                });
                avgDist /= tips.length;

                const isClosed = avgDist < 0.25;

                // Mirror X for front camera feel
                const x = (isFrontCameraRef.current ? 0.5 - landmarks[9].x : landmarks[9].x - 0.5) * 10;
                const y = (0.5 - landmarks[9].y) * 10;

                onHandUpdate({
                    isOpen: !isClosed,
                    position: [x, y, 0],
                    isDetected: true,
                });
            } else {
                onHandUpdate((prev) => ({ ...prev, isDetected: false }));
            }

            videoRef.current.lastVideoTime = videoRef.current.currentTime;
        }

        requestRef.current = requestAnimationFrame(predictWebcam);
    };

    const handleManualPlay = async () => {
        if (videoRef.current) {
            try {
                await videoRef.current.play();
                setShowPlayButton(false);
                maybeStartPredicting();
            } catch (e) {
                console.error('Manual play failed', e);
                setErrorText('无法启动视频，请再试一次。');
            }
        }
    };

    return (
        <>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    pointerEvents: 'none',
                    zIndex: -1,
                }}
            />
            {!!errorText && (
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        backgroundColor: 'rgba(0,0,0,0.85)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        color: 'white',
                        textAlign: 'center',
                        padding: 24,
                        gap: 16,
                    }}
                >
                    <div style={{ fontSize: 18, lineHeight: 1.4, whiteSpace: 'pre-wrap', maxWidth: 520 }}>
                        {errorText}
                    </div>
                    <button
                        onClick={() => {
                            startedRef.current = true;
                            void ensureHandLandmarker();
                            void startWebcam();
                        }}
                        style={{
                            padding: '14px 24px',
                            fontSize: 18,
                            backgroundColor: 'white',
                            color: 'black',
                            border: 'none',
                            borderRadius: 12,
                            fontWeight: 700,
                        }}
                    >
                        再试一次
                    </button>
                </div>
            )}
            {showPlayButton && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 1000,
                    }}
                >
                    <button
                        onClick={handleManualPlay}
                        style={{
                            padding: '15px 30px',
                            fontSize: '1.2rem',
                            backgroundColor: 'rgba(255, 0, 0, 0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '10px',
                        }}
                    >
                        点击启动摄像头
                    </button>
                </div>
            )}
        </>
    );
});

export default HandTracker;
