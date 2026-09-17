// Native Web Audio chime effects - works reliably on iOS Safari without external assets
export function playChoreDing(enabled: boolean = true) {
  if (!enabled) return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    // Pleasant double chime: C5 -> G5
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.08); // G5
    osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.25); // C6

    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now + 0.08);

    osc1.stop(now + 0.25);
    osc2.stop(now + 0.45);
  } catch (e) {
    console.debug('Audio not supported or blocked:', e);
  }
}

export function playRewardFanfare(enabled: boolean = true) {
  if (!enabled) return;
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, High C
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = now + idx * 0.1;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.01, startTime);
      gain.gain.linearRampToValueAtTime(0.18, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  } catch (e) {
    console.debug('Audio error:', e);
  }
}
