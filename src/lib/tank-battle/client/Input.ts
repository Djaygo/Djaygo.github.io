import type { PlayerInput } from '../shared/types';

export class InputManager {
  private keys: Set<string> = new Set();
  private mouseX: number = 0;
  private mouseY: number = 0;
  private mouseDown: boolean = false;
  private pendingShot: boolean = false;

  private canvas: HTMLCanvasElement;
  private canvasRect: DOMRect;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.canvasRect = canvas.getBoundingClientRect();

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', this.handleResize);
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key.toLowerCase());
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private handleMouseMove = (e: MouseEvent): void => {
    // Update rect if canvas became visible
    if (this.canvasRect.width === 0 || this.canvasRect.height === 0) {
      this.canvasRect = this.canvas.getBoundingClientRect();
    }
    this.mouseX = e.clientX - this.canvasRect.left;
    this.mouseY = e.clientY - this.canvasRect.top;
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.mouseDown = true;
      this.pendingShot = true;
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.mouseDown = false;
    }
  };

  private handleResize = (): void => {
    this.canvasRect = this.canvas.getBoundingClientRect();
  };

  getInput(tankX: number, tankY: number, sequenceNumber: number): PlayerInput {
    let moveX = 0;
    let moveY = 0;

    if (this.keys.has('a') || this.keys.has('arrowleft')) moveX -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) moveX += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) moveY -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) moveY += 1;

    // Update rect if it has zero dimensions (canvas was hidden when initialized)
    if (this.canvasRect.width === 0 || this.canvasRect.height === 0) {
      this.canvasRect = this.canvas.getBoundingClientRect();
    }

    const scaleX = this.canvas.width / this.canvasRect.width;
    const scaleY = this.canvas.height / this.canvasRect.height;
    const worldMouseX = this.mouseX * scaleX;
    const worldMouseY = this.mouseY * scaleY;

    const turretAngle = Math.atan2(worldMouseY - tankY, worldMouseX - tankX);

    return {
      timestamp: Date.now(),
      sequenceNumber,
      moveDirection: { x: moveX, y: moveY },
      turretAngle,
      shooting: this.mouseDown,
    };
  }

  consumeShot(): boolean {
    if (this.pendingShot) {
      this.pendingShot = false;
      return true;
    }
    return false;
  }

  getMousePosition(): { x: number; y: number } {
    const scaleX = this.canvas.width / this.canvasRect.width;
    const scaleY = this.canvas.height / this.canvasRect.height;
    return {
      x: this.mouseX * scaleX,
      y: this.mouseY * scaleY,
    };
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key.toLowerCase());
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    this.canvas.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('resize', this.handleResize);
  }
}
