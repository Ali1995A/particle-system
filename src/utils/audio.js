// Improved synth using Web Audio API

let audioCtx = null;

const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
};

// Create a noise buffer once
let noiseBuffer = null;
const getNoiseBuffer = (ctx) => {
    if (!noiseBuffer) {
        const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
        noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
    }
    return noiseBuffer;
};

export const playScatter = () => {
    const ctx = initAudio();
    if (!ctx) return;

    const t = ctx.currentTime;

    // 1. Noise Burst (Explosion/Whoosh)
    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(1000, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(100, t + 0.5); // Sweep down

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(t);
    noise.stop(t + 0.5);

    // 2. Low Thump (Sub-bass impact)
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.3); // Pitch drop

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0.5, t);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.3);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(t);
    osc.stop(t + 0.3);
};

export const playGather = () => {
    const ctx = initAudio();
    if (!ctx) return;

    const t = ctx.currentTime;

    // Reverse suction effect (Reverse cymbal/whoosh feel)
    // We can simulate this with noise ramping UP in volume and filter

    const noise = ctx.createBufferSource();
    noise.buffer = getNoiseBuffer(ctx);

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(200, t);
    noiseFilter.frequency.exponentialRampToValueAtTime(2000, t + 0.4); // Sweep up

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.01, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.5, t + 0.3); // Fade in
    noiseGain.gain.linearRampToValueAtTime(0, t + 0.4); // Cut off sharply

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(t);
    noise.stop(t + 0.4);

    // "Click" or "Lock" sound at the end
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, t + 0.35);

    const oscGain = ctx.createGain();
    oscGain.gain.setValueAtTime(0, t + 0.35);
    oscGain.gain.linearRampToValueAtTime(0.3, t + 0.36);
    oscGain.gain.exponentialRampToValueAtTime(0.01, t + 0.5);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(t + 0.35);
    osc.stop(t + 0.5);
};
