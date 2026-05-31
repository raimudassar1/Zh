'use strict';

window.AnimRegistry = (() => {
  const cache = {};
  let manifest = null;

  async function loadLottieRuntime() {
    if (window.lottie) return window.lottie;
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js';
      script.onload = () => resolve(window.lottie);
      script.onerror = () => {
        console.warn('Lottie CDN failed — animations disabled');
        resolve(null); // graceful degradation
      };
      document.head.appendChild(script);
    });
  }

  async function init() {
    await loadLottieRuntime();
    try {
      const res = await fetch('assets/anim/manifest.json');
      manifest = await res.json();
    } catch (e) {
      console.warn('Animation manifest not found — animations disabled');
      manifest = {};
    }
  }

  async function load(contextKey) {
    if (cache[contextKey]) return cache[contextKey];
    const entry = manifest?.[contextKey];
    if (!entry) return null;

    try {
      const res = await fetch(entry.file);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cache[contextKey] = data;
      return data;
    } catch (e) {
      console.warn(`Failed to load animation: ${contextKey}`, e.message);
      return null;
    }
  }

  async function play(contextKey, containerId, options = {}) {
    if (!window.lottie) return null;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

    const data = await load(contextKey);
    if (!data) return null;

    const container = document.getElementById(containerId);
    if (!container) return null;

    // Destroy existing instance
    if (container._lottieInstance) {
      container._lottieInstance.destroy();
      container._lottieInstance = null;
    }

    container.style.display = 'block';
    
    try {
      const instance = window.lottie.loadAnimation({
        container,
        animationData: data,
        renderer: options.renderer || 'svg',
        loop: options.loop ?? false,
        autoplay: true,
      });

      container._lottieInstance = instance;

      if (!options.loop && options.duration) {
        setTimeout(() => {
          if (container._lottieInstance === instance) {
            instance.destroy();
            container.style.display = 'none';
            container._lottieInstance = null;
          }
        }, options.duration);
      }

      instance.addEventListener('complete', () => {
        if (!options.loop) {
          instance.destroy();
          container.style.display = 'none';
          if (container._lottieInstance === instance) {
            container._lottieInstance = null;
          }
        }
      });

      return instance;
    } catch (err) {
      console.error("Lottie render error:", err);
      // Fallback: try Canvas renderer if SVG renderer fails (e.g. WebView issue)
      if (options.renderer !== 'canvas') {
        return play(contextKey, containerId, { ...options, renderer: 'canvas' });
      }
      return null;
    }
  }

  function stop(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (container._lottieInstance) {
      container._lottieInstance.destroy();
      container._lottieInstance = null;
    }
    container.style.display = 'none';
  }

  function stopAll() {
    const containers = document.querySelectorAll('[id^="lottie-"], [id^="anim-"]');
    containers.forEach(container => {
      if (container._lottieInstance) {
        container._lottieInstance.destroy();
        container._lottieInstance = null;
      }
      container.style.display = 'none';
    });
  }

  return {
    init,
    load,
    play,
    stop,
    stopAll,
    loadLottieRuntime
  };
})();

// Programmatic sound synthesis using Web Audio API
class WebSoundEngine {
  constructor() {
    this.ctx = null;
  }
  initCtx() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) this.ctx = new AudioContextClass();
    }
  }
  playTone(freq, type, duration, delay = 0) {
    this.initCtx();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      // Try to resume on click/interaction
      this.ctx.resume();
    }
    setTimeout(() => {
      try {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
      } catch(e) {}
    }, delay);
  }
  playCorrect() { this.playTone(587.33, 'sine', 0.15); }
  playWrong() { this.playTone(120, 'sawtooth', 0.20); }
  playStreak() {
    this.playTone(523.25, 'sine', 0.15, 0);
    this.playTone(659.25, 'sine', 0.15, 100);
    this.playTone(783.99, 'sine', 0.15, 200);
  }
  playLevelUp() {
    this.playTone(523.25, 'sine', 0.20, 0);
    this.playTone(659.25, 'sine', 0.20, 100);
    this.playTone(783.99, 'sine', 0.20, 200);
    this.playTone(1046.50, 'sine', 0.50, 300);
  }
  playCardFlip() {
    this.initCtx();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch(e) {}
  }
}
window.SoundManager = new WebSoundEngine();

