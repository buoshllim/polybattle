

// Simple synth for game sounds using Web Audio API
let audioCtx: AudioContext | null = null;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Helper for tone generation (heal, victory, etc)
const createOscillator = (type: OscillatorType, freq: number, duration: number, vol: number = 0.1, delay: number = 0) => {
  const ctx = initAudio();
  if (!ctx) return;
  setTimeout(() => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }, delay * 1000);
};

// Helper for simple noise (steps, etc)
const createNoise = (duration: number, vol: number = 0.1) => {
    const ctx = initAudio();
    if (!ctx) return;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    
    noise.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
}

export const playSound = (type: 'attack' | 'hit' | 'heal' | 'death' | 'step' | 'victory' | 'defeat' | 'crumble' | 'upgrade' | 'fireball' | 'cannon' | 'invisibility' | 'skill_unlock' | 'invincible') => {
  const ctx = initAudio();
  if (!ctx) return;

  try {
    const t = ctx.currentTime;

    switch (type) {
      case 'attack':
        // SHORT, SHARP WIND SLASH
        {
            // Shorter duration for snappiness
            const duration = 0.08 + Math.random() * 0.05; // ~0.1s

            // Create noise buffer
            const bufferSize = ctx.sampleRate * duration;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            // Bandpass focuses on the "air" sound, removing low rumble
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.Q.value = 0.5; // Wide band for wind noise

            // Rapid sweep for the "cutting" effect
            const startFreq = 600;
            const peakFreq = 2500 + Math.random() * 1000; // Go high for sharpness
            
            filter.frequency.setValueAtTime(startFreq, t);
            filter.frequency.linearRampToValueAtTime(peakFreq, t + duration * 0.4);
            filter.frequency.exponentialRampToValueAtTime(100, t + duration);

            // Fast Envelope
            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.25, t + duration * 0.2); // Fast attack
            gain.gain.exponentialRampToValueAtTime(0.001, t + duration); // Fast decay

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            noise.start();
        }
        break;

      case 'hit':
        // CLEAN PHYSICAL IMPACT (No Buzz)
        {
            // Just a noise burst (Impact/Thud)
            const duration = 0.1;
            const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for(let i=0; i<data.length; i++) data[i] = Math.random() * 2 - 1;
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            
            // Lowpass filter to ensure it sounds like a blunt hit
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(500, t); 

            const noiseGain = ctx.createGain();
            noiseGain.gain.setValueAtTime(0.4, t);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, t + duration);

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(ctx.destination);
            noise.start();
        }
        break;

      case 'heal':
        // Magical chime
        createOscillator('sine', 440, 0.3, 0.05);
        setTimeout(() => createOscillator('sine', 660, 0.3, 0.05), 100);
        setTimeout(() => createOscillator('sine', 880, 0.5, 0.05), 200);
        break;
      case 'death':
        // Falling pitch
        {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.frequency.setValueAtTime(200, t);
          osc.frequency.exponentialRampToValueAtTime(50, t + 0.5);
          gain.gain.setValueAtTime(0.1, t);
          gain.gain.linearRampToValueAtTime(0, t + 0.5);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(t + 0.5);
        }
        break;
      case 'step':
        // Very subtle click
         createNoise(0.05, 0.02);
        break;
      case 'victory':
        // Major Arpeggio Fanfare
        createOscillator('triangle', 523.25, 0.4, 0.2, 0);   // C5
        createOscillator('triangle', 659.25, 0.4, 0.2, 0.15); // E5
        createOscillator('triangle', 783.99, 0.4, 0.2, 0.3);  // G5
        createOscillator('triangle', 1046.50, 1.0, 0.2, 0.45); // C6
        break;
      case 'defeat':
        // Sinister/Discordant
        createOscillator('sawtooth', 100, 1.5, 0.3, 0);
        createOscillator('sawtooth', 87, 1.5, 0.3, 0.1); 
        createOscillator('sawtooth', 75, 2.0, 0.3, 0.2);
        // Laugh-like modulation
        setTimeout(() => createOscillator('square', 200, 0.1, 0.1), 300);
        setTimeout(() => createOscillator('square', 180, 0.1, 0.1), 400);
        setTimeout(() => createOscillator('square', 160, 0.1, 0.1), 500);
        break;
      case 'crumble':
        // Low rumble
        createNoise(1.5, 0.3);
        createOscillator('sawtooth', 50, 1.0, 0.4);
        break;
      case 'upgrade':
        // Positive rising chime (Power up)
        createOscillator('sine', 400, 0.1, 0.2, 0);
        createOscillator('sine', 600, 0.1, 0.2, 0.1);
        createOscillator('sine', 1000, 0.3, 0.2, 0.2);
        break;
      case 'skill_unlock':
        // Magical upward sweep
        createOscillator('sine', 800, 0.2, 0.2, 0);
        createOscillator('sine', 1200, 0.2, 0.2, 0.1);
        createOscillator('square', 1500, 0.3, 0.1, 0.2);
        break;
      case 'fireball':
        // Whoosh + Crackle
        createNoise(0.5, 0.3);
        createOscillator('sawtooth', 150, 0.5, 0.2); // Low burn
        break;
      case 'cannon':
        // Deep Boom
        createNoise(0.3, 0.8);
        createOscillator('square', 60, 0.4, 0.5); // Sub bass
        break;
      case 'invisibility':
        // High pitched shimmer
        createOscillator('sine', 2000, 1.0, 0.1);
        createOscillator('sine', 1800, 1.0, 0.1, 0.2);
        break;
      case 'invincible':
        // Heavy Metallic Power-Up Sound (Low to High power chord)
        createOscillator('square', 110, 1.0, 0.3, 0);
        createOscillator('sawtooth', 220, 1.0, 0.3, 0);
        createOscillator('square', 440, 1.5, 0.3, 0.1); // Octave up
        createNoise(0.5, 0.5); // Burst
        break;
    }
  } catch (e) {
    // Ignore audio errors
  }
};