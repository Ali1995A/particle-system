const supportsWebGL2 = () => {
  try {
    const canvas = document.createElement('canvas');
    return !!canvas.getContext('webgl2');
  } catch {
    return false;
  }
};

export const getQualityPreset = () => {
  if (typeof window === 'undefined') {
    return {
      label: 'default',
      isLowEnd: false,
      dpr: 1,
      antialias: true,
      enableControls: true,
      particleCount: 3000,
      textCanvasSize: 1024,
      textSampleStep: 8,
      particleUpdateFps: 60,
      handFps: 24,
      video: { width: 1280, height: 720, frameRate: 30 },
    };
  }

  const ua = navigator.userAgent || '';
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isIPad =
    /iPad/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1 && Math.max(screen.width, screen.height) >= 1024);

  const cores = navigator.hardwareConcurrency || 0;
  const hasWebGL2 = supportsWebGL2();

  // iPad Pro 1st gen (A9X) class devices often struggle with high DPR + heavy per-frame JS loops.
  const isLowEnd = isIOS && isIPad && (!hasWebGL2 || (cores > 0 && cores <= 2));

  if (!isLowEnd) {
    return {
      label: 'default',
      isLowEnd: false,
      dpr: Math.min(2, window.devicePixelRatio || 1),
      antialias: true,
      enableControls: true,
      particleCount: 3000,
      textCanvasSize: 1024,
      textSampleStep: 8,
      particleUpdateFps: 60,
      handFps: 24,
      video: { width: 1280, height: 720, frameRate: 30 },
    };
  }

  return {
    label: 'low-ios-ipad',
    isLowEnd: true,
    dpr: 1,
    antialias: false,
    enableControls: false,
    particleCount: 1200,
    textCanvasSize: 512,
    textSampleStep: 10,
    particleUpdateFps: 30,
    handFps: 12,
    video: { width: 640, height: 480, frameRate: 15 },
  };
};

