/**
 * Input Controller for Keyboard, Touch Swipes, and On-Screen Virtual Controls.
 */

export class InputManager {
  constructor(callbacks) {
    this.callbacks = callbacks; // { onLeft, onRight, onJump, onSlide, onPause }
    this.touchStartX = 0;
    this.touchStartY = 0;
    this.touchStartTime = 0;
    this.minSwipeDistance = 35; // Pixels
    this.maxSwipeTime = 600; // Milliseconds

    this.initKeyboard();
    this.initTouch();
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'ArrowLeft':
        case 'KeyA':
          e.preventDefault();
          this.callbacks.onLeft?.();
          break;
        case 'ArrowRight':
        case 'KeyD':
          e.preventDefault();
          this.callbacks.onRight?.();
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'Space':
          e.preventDefault();
          this.callbacks.onJump?.();
          break;
        case 'ArrowDown':
        case 'KeyS':
          e.preventDefault();
          this.callbacks.onSlide?.();
          break;
        case 'KeyP':
        case 'Escape':
          e.preventDefault();
          this.callbacks.onPause?.();
          break;
      }
    });
  }

  initTouch() {
    // Touch events for mobile
    window.addEventListener('touchstart', (e) => {
      if (e.target.closest('.ui-interactive')) return;
      const t = e.touches[0];
      this.touchStartX = t.clientX;
      this.touchStartY = t.clientY;
      this.touchStartTime = Date.now();
    }, { passive: false });

    window.addEventListener('touchend', (e) => {
      if (e.target.closest('.ui-interactive')) return;
      const t = e.changedTouches[0];
      this.handleSwipe(t.clientX, t.clientY);
    }, { passive: false });

    // Mouse drag swipe fallback for testing
    let isMouseDown = false;
    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('.ui-interactive')) return;
      isMouseDown = true;
      this.touchStartX = e.clientX;
      this.touchStartY = e.clientY;
      this.touchStartTime = Date.now();
    });

    window.addEventListener('mouseup', (e) => {
      if (!isMouseDown) return;
      isMouseDown = false;
      this.handleSwipe(e.clientX, e.clientY);
    });
  }

  handleSwipe(endX, endY) {
    const deltaX = endX - this.touchStartX;
    const deltaY = endY - this.touchStartY;
    const deltaTime = Date.now() - this.touchStartTime;

    if (deltaTime > this.maxSwipeTime) return;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (Math.max(absX, absY) < this.minSwipeDistance) return;

    if (absX > absY) {
      // Horizontal swipe
      if (deltaX < 0) {
        this.callbacks.onLeft?.();
      } else {
        this.callbacks.onRight?.();
      }
    } else {
      // Vertical swipe
      if (deltaY < 0) {
        this.callbacks.onJump?.();
      } else {
        this.callbacks.onSlide?.();
      }
    }
  }
}
