const DEFAULT_DURATION_MS = 20_000;
const MAX_UPDATE_RATE_MS = 1000 / 30;

function clampProgress(progress: number) {
  return Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
}

export class RoutePlayerClock {
  private progress = 0;
  private playing = false;
  private startTime = 0;
  private animationFrame: number | null = null;
  private lastUpdateTime = 0;

  constructor(
    private readonly onProgress: (progress: number) => void,
    private readonly onComplete: () => void,
    private readonly durationMs = DEFAULT_DURATION_MS,
  ) {}

  get isPlaying() {
    return this.playing;
  }

  play() {
    if (this.playing) return;
    if (this.progress >= 1) this.setProgress(0);
    this.playing = true;
    this.startTime = performance.now() - this.progress * this.durationMs;
    this.lastUpdateTime = 0;
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  pause() {
    if (!this.playing) return;
    this.playing = false;
    if (this.animationFrame !== null) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
  }

  restart() {
    this.pause();
    this.setProgress(0);
  }

  seek(progress: number) {
    this.setProgress(progress);
    if (this.playing) this.startTime = performance.now() - this.progress * this.durationMs;
  }

  destroy() {
    this.pause();
  }

  private setProgress(progress: number) {
    this.progress = clampProgress(progress);
    this.onProgress(this.progress);
  }

  private tick = (now: number) => {
    if (!this.playing) return;
    const progress = clampProgress((now - this.startTime) / this.durationMs);
    if (now - this.lastUpdateTime >= MAX_UPDATE_RATE_MS || progress === 1) {
      this.progress = progress;
      this.lastUpdateTime = now;
      this.onProgress(progress);
    }
    if (progress >= 1) {
      this.playing = false;
      this.animationFrame = null;
      this.onComplete();
      return;
    }
    this.animationFrame = requestAnimationFrame(this.tick);
  };
}
