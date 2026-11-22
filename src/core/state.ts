import type { CaptchaType } from './types';

/**
 * 一轮验证的几何与开关状态。
 * 轨迹归 TrackRecorder、点击点归 ClickHandler，各自持有自己的数据。
 */
export class State {
  constructor(public type: CaptchaType) {}

  imgWidth = 240;
  imgHeight = 150;
  scale = 1;
  invScale = 1;
  imgLoaded = false;
  busy = false;
  passed = false;
  token: string | null = null;

  // slide 特有
  markWidth = 50;
  markTopY = 0;
  markOffset = 0;
  maxOffset = 0;
  moving = false;
  rafId: number | null = null;

  // click 特有
  charCount = 4;

  beginRound(): void {
    this.passed = false;
    this.token = null;
    this.busy = false;
    this.imgLoaded = false;
  }

  beginRefresh(): void {
    this.imgLoaded = false;
    this.busy = false;
  }

  cancelFrame(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}
