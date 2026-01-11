import { WEAPONS, WEAPON_ORDER, type WeaponConfig } from '../shared/weapons';
import type { WeaponManager } from './WeaponManager';

interface MenuItem {
  config: WeaponConfig;
  angle: number;
  x: number;
  y: number;
}

export class RadialMenu {
  private canvas: HTMLCanvasElement;
  private weaponManager: WeaponManager;

  private isOpen: boolean = false;
  private centerX: number = 0;
  private centerY: number = 0;
  private radius: number = 100;
  private itemRadius: number = 30;

  private items: MenuItem[] = [];
  private hoveredIndex: number = -1;
  private openAnimation: number = 0;

  private buttonElement: HTMLButtonElement | null = null;
  private onSelect?: () => void;

  constructor(canvas: HTMLCanvasElement, weaponManager: WeaponManager) {
    this.canvas = canvas;
    this.weaponManager = weaponManager;

    this.calculateItemPositions();
    this.createButtonElement();
    this.setupEventListeners();
  }

  private calculateItemPositions(): void {
    const count = WEAPON_ORDER.length;
    const startAngle = -Math.PI / 2;

    this.items = WEAPON_ORDER.map((type, index) => {
      const angle = startAngle + (index / count) * Math.PI * 2;
      return {
        config: WEAPONS[type],
        angle,
        x: Math.cos(angle) * this.radius,
        y: Math.sin(angle) * this.radius,
      };
    });
  }

  private createButtonElement(): void {
    this.buttonElement = document.createElement('button');
    this.buttonElement.id = 'weapon-menu-btn';
    this.buttonElement.className = 'weapon-menu-trigger';
    this.buttonElement.innerHTML = this.weaponManager.getCurrentWeapon().icon;
    this.buttonElement.title = 'Weapon Menu (Q)';

    // Style will be applied via CSS in the Astro component
    const style = document.createElement('style');
    style.textContent = `
      .weapon-menu-trigger {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 60px;
        height: 60px;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-radius: 50%;
        font-size: 28px;
        cursor: pointer;
        transition: all 0.2s;
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .weapon-menu-trigger:hover {
        border-color: rgba(255, 255, 255, 0.6);
        transform: scale(1.05);
      }
      .weapon-menu-trigger.open {
        border-color: #4ade80;
        background: rgba(74, 222, 128, 0.2);
      }
    `;
    document.head.appendChild(style);
  }

  private setupEventListeners(): void {
    this.buttonElement?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    // Click anywhere to close and select
    document.addEventListener('click', (e) => {
      if (this.isOpen) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        this.handleClick(x, y);
      }
    });

    // Mouse move for hover
    document.addEventListener('mousemove', (e) => {
      if (this.isOpen) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        this.handleMouseMove(x, y);
      }
    });

    // Keyboard shortcuts
    window.addEventListener('keydown', (e) => {
      // Number keys 1-8
      const num = parseInt(e.key);
      if (num >= 1 && num <= 8 && num <= WEAPON_ORDER.length) {
        e.preventDefault();
        this.weaponManager.selectWeaponByIndex(num - 1);
        this.updateButtonIcon();
        if (this.isOpen) this.close();
        this.onSelect?.();
      }

      // Q to toggle menu
      if (e.key.toLowerCase() === 'q') {
        e.preventDefault();
        this.toggle();
      }

      // Escape to close
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Mouse wheel
    this.canvas.addEventListener('wheel', (e) => {
      if (!this.isOpen) {
        e.preventDefault();
        if (e.deltaY > 0) {
          this.weaponManager.nextWeapon();
        } else {
          this.weaponManager.previousWeapon();
        }
        this.updateButtonIcon();
        this.onSelect?.();
      }
    }, { passive: false });
  }

  toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  open(): void {
    this.isOpen = true;
    this.openAnimation = 0;
    this.buttonElement?.classList.add('open');

    // Center in canvas
    this.centerX = this.canvas.width / 2;
    this.centerY = this.canvas.height / 2;
  }

  close(): void {
    this.isOpen = false;
    this.hoveredIndex = -1;
    this.buttonElement?.classList.remove('open');
  }

  private handleClick(x: number, y: number): void {
    const index = this.getItemAtPosition(x, y);
    if (index >= 0) {
      this.weaponManager.selectWeaponByIndex(index);
      this.updateButtonIcon();
      this.onSelect?.();
    }
    this.close();
  }

  private handleMouseMove(x: number, y: number): void {
    this.hoveredIndex = this.getItemAtPosition(x, y);
  }

  private getItemAtPosition(x: number, y: number): number {
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Must be within ring
    if (dist < 30 || dist > this.radius + this.itemRadius + 20) {
      return -1;
    }

    // Find closest item by angle
    let angle = Math.atan2(dy, dx);
    const startAngle = -Math.PI / 2;
    let normalizedAngle = angle - startAngle;
    if (normalizedAngle < 0) normalizedAngle += Math.PI * 2;

    const index = Math.round((normalizedAngle / (Math.PI * 2)) * this.items.length) % this.items.length;
    return index;
  }

  updateButtonIcon(): void {
    if (this.buttonElement) {
      this.buttonElement.innerHTML = this.weaponManager.getCurrentWeapon().icon;
    }
  }

  setOnSelect(callback: () => void): void {
    this.onSelect = callback;
  }

  update(deltaTime: number): void {
    if (this.isOpen && this.openAnimation < 1) {
      this.openAnimation = Math.min(1, this.openAnimation + deltaTime * 8);
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    if (!this.isOpen || this.openAnimation <= 0) return;

    const scale = this.easeOutBack(this.openAnimation);

    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.scale(scale, scale);

    // Draw background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + this.itemRadius + 15, 0, Math.PI * 2);
    ctx.fill();

    // Draw items
    const currentIndex = this.weaponManager.getCurrentWeaponIndex();

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const isHovered = i === this.hoveredIndex;
      const isSelected = i === currentIndex;
      const state = this.weaponManager.getWeaponState(WEAPON_ORDER[i]);

      // Item background
      if (isSelected) {
        ctx.fillStyle = 'rgba(74, 222, 128, 0.6)';
      } else if (isHovered) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      } else {
        ctx.fillStyle = 'rgba(100, 100, 100, 0.4)';
      }

      ctx.beginPath();
      ctx.arc(item.x, item.y, this.itemRadius, 0, Math.PI * 2);
      ctx.fill();

      // Border
      ctx.strokeStyle = isSelected ? '#4ade80' : 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.stroke();

      // Icon
      ctx.font = '22px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(item.config.icon, item.x, item.y - 4);

      // Ammo count
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = state.ammo > 0 ? '#ffffff' : '#ff4444';
      ctx.fillText(`${state.ammo}`, item.x, item.y + 14);

      // Keyboard hint
      ctx.font = '9px sans-serif';
      ctx.fillStyle = '#888888';
      ctx.fillText(`${i + 1}`, item.x + this.itemRadius - 6, item.y - this.itemRadius + 8);
    }

    // Center info for hovered item
    if (this.hoveredIndex >= 0) {
      const item = this.items[this.hoveredIndex];

      ctx.font = 'bold 14px sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText(item.config.name, 0, -8);

      ctx.font = '11px sans-serif';
      ctx.fillStyle = '#aaaaaa';

      // Truncate description if too long
      const desc = item.config.description;
      ctx.fillText(desc.length > 35 ? desc.slice(0, 32) + '...' : desc, 0, 10);
    } else {
      // Show current weapon name when nothing hovered
      const current = this.weaponManager.getCurrentWeapon();
      ctx.font = 'bold 12px sans-serif';
      ctx.fillStyle = '#888888';
      ctx.textAlign = 'center';
      ctx.fillText(current.name, 0, 0);
    }

    ctx.restore();
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  isMenuOpen(): boolean {
    return this.isOpen;
  }

  destroy(): void {
    this.buttonElement?.remove();
  }

  attachToDOM(): void {
    if (this.buttonElement && !this.buttonElement.parentElement) {
      document.body.appendChild(this.buttonElement);
    }
  }

  detachFromDOM(): void {
    this.buttonElement?.remove();
  }
}
