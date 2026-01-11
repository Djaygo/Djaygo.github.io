import type { Terrain } from './Terrain';
import type { Tank } from './Tank';
import type { Projectile } from './Projectile';
import type { ParticleSystem } from './Particles';
import type { WeaponConfig } from '../shared/weapons';
import { TANK, PHYSICS } from '../shared/constants';

export interface NapalmFire {
  x: number;
  y: number;
  life: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  private screenShake: { x: number; y: number; intensity: number } = { x: 0, y: 0, intensity: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.canvas.width = width;
    this.canvas.height = height;
  }

  clear(): void {
    this.ctx.save();

    if (this.screenShake.intensity > 0.01) {
      this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity * 10;
      this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity * 10;
      this.screenShake.intensity *= 0.9;
      this.ctx.translate(this.screenShake.x, this.screenShake.y);
    }

    this.ctx.clearRect(-10, -10, this.width + 20, this.height + 20);
  }

  restore(): void {
    this.ctx.restore();
  }

  addScreenShake(intensity: number): void {
    this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
  }

  drawTerrain(terrain: Terrain): void {
    const image = terrain.getImage();
    if (image) {
      this.ctx.drawImage(image, 0, 0);
    }
    // Draw falling sand particles on top of terrain
    terrain.drawSandParticles(this.ctx);
  }

  drawTank(tank: Tank, isLocal: boolean): void {
    if (!tank.alive) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.angle);

    if (tank.damageFlash > 0.05) {
      ctx.filter = `brightness(${1 + tank.damageFlash * 2})`;
    }

    ctx.fillStyle = '#333';
    const trackY = TANK.HEIGHT / 2 - 3;
    ctx.fillRect(-TANK.WIDTH / 2, trackY - 5, TANK.WIDTH, 8);
    ctx.fillRect(-TANK.WIDTH / 2, -trackY - 3, TANK.WIDTH, 8);

    for (let i = 0; i < 6; i++) {
      const x = -TANK.WIDTH / 2 + 8 + ((i * 12 + tank.trackOffset) % (TANK.WIDTH - 16));
      ctx.fillStyle = '#222';
      ctx.fillRect(x, trackY - 4, 4, 6);
      ctx.fillRect(x, -trackY - 2, 4, 6);
    }

    ctx.fillStyle = tank.color;
    ctx.beginPath();
    ctx.roundRect(-TANK.WIDTH / 2 + 2, -TANK.HEIGHT / 2 + 4, TANK.WIDTH - 4, TANK.HEIGHT - 8, 4);
    ctx.fill();

    ctx.fillStyle = this.adjustColor(tank.color, -30);
    ctx.fillRect(-TANK.WIDTH / 2 + 5, -TANK.HEIGHT / 2 + 6, TANK.WIDTH - 10, 4);

    ctx.save();
    ctx.rotate(tank.turretAngle - tank.angle);

    const recoilX = -tank.recoilOffset;

    ctx.fillStyle = this.adjustColor(tank.color, -20);
    ctx.beginPath();
    ctx.arc(recoilX, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#444';
    ctx.fillRect(recoilX + 5, -TANK.TURRET_WIDTH / 2, TANK.TURRET_LENGTH - 5, TANK.TURRET_WIDTH);

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.arc(recoilX + TANK.TURRET_LENGTH, 0, TANK.TURRET_WIDTH / 2 + 1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.filter = 'none';
    ctx.restore();

    if (isLocal) {
      this.drawTankHUD(tank);
    } else {
      this.drawNameTag(tank);
    }
  }

  private drawTankHUD(tank: Tank): void {
    const ctx = this.ctx;
    const barWidth = 50;
    const barHeight = 6;
    const y = tank.y - TANK.HEIGHT - 15;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(tank.x - barWidth / 2 - 2, y - 2, barWidth + 4, barHeight + 4);

    const healthPercent = tank.health / tank.maxHealth;
    const healthColor = healthPercent > 0.5 ? '#22c55e' : healthPercent > 0.25 ? '#eab308' : '#ef4444';

    ctx.fillStyle = '#333';
    ctx.fillRect(tank.x - barWidth / 2, y, barWidth, barHeight);

    ctx.fillStyle = healthColor;
    ctx.fillRect(tank.x - barWidth / 2, y, barWidth * healthPercent, barHeight);
  }

  private drawNameTag(tank: Tank): void {
    const ctx = this.ctx;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillText(tank.name, tank.x + 1, tank.y - TANK.HEIGHT - 5 + 1);

    ctx.fillStyle = '#fff';
    ctx.fillText(tank.name, tank.x, tank.y - TANK.HEIGHT - 5);
  }

  drawProjectile(projectile: Projectile): void {
    const ctx = this.ctx;

    // Draw trail with weapon-specific color
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    if (projectile.trail.length > 1) {
      ctx.beginPath();
      ctx.moveTo(projectile.trail[0].x, projectile.trail[0].y);

      for (let i = 1; i < projectile.trail.length; i++) {
        const alpha = 1 - i / projectile.trail.length;
        ctx.strokeStyle = projectile.trailColor.replace(/[\d.]+\)$/, `${alpha * 0.6})`);
        ctx.lineTo(projectile.trail[i].x, projectile.trail[i].y);
      }
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(projectile.x, projectile.y);
    ctx.rotate(projectile.getAngle());

    const size = projectile.projectileSize;

    // Draw weapon-specific projectile
    switch (projectile.behavior?.type) {
      case 'guided':
        this.drawDroneProjectile(ctx, size, projectile.projectileColor);
        break;
      case 'ballistic':
        this.drawMissileProjectile(ctx, size, projectile.projectileColor);
        break;
      case 'emp':
        this.drawEMPProjectile(ctx, size, projectile.projectileColor, projectile.age);
        break;
      case 'cluster':
        this.drawClusterProjectile(ctx, size, projectile.projectileColor);
        break;
      case 'spreading':
        this.drawNapalmProjectile(ctx, size, projectile.projectileColor);
        break;
      case 'penetrating':
        this.drawBunkerBusterProjectile(ctx, size, projectile.projectileColor);
        break;
      default:
        this.drawStandardProjectile(ctx, size, projectile.projectileColor);
    }

    ctx.restore();
  }

  private drawStandardProjectile(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(0, 0, 8 * size, 4 * size, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(-2, 0, 4 * size, 3 * size, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDroneProjectile(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    // Triangular drone body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(10 * size, 0);
    ctx.lineTo(-8 * size, -6 * size);
    ctx.lineTo(-4 * size, 0);
    ctx.lineTo(-8 * size, 6 * size);
    ctx.closePath();
    ctx.fill();

    // Propeller circle
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-2 * size, 0, 3 * size, 0, Math.PI * 2);
    ctx.fill();

    // Wings
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -5 * size);
    ctx.lineTo(-6 * size, -10 * size);
    ctx.moveTo(0, 5 * size);
    ctx.lineTo(-6 * size, 10 * size);
    ctx.stroke();
  }

  private drawMissileProjectile(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    // Missile body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 12 * size, 4 * size, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nose cone
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(14 * size, 0);
    ctx.lineTo(8 * size, -3 * size);
    ctx.lineTo(8 * size, 3 * size);
    ctx.closePath();
    ctx.fill();

    // Fins
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(-8 * size, -3 * size);
    ctx.lineTo(-14 * size, -8 * size);
    ctx.lineTo(-10 * size, -3 * size);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-8 * size, 3 * size);
    ctx.lineTo(-14 * size, 8 * size);
    ctx.lineTo(-10 * size, 3 * size);
    ctx.closePath();
    ctx.fill();

    // Exhaust glow
    ctx.fillStyle = 'rgba(255, 150, 50, 0.8)';
    ctx.beginPath();
    ctx.ellipse(-12 * size, 0, 4 * size, 2 * size, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawEMPProjectile(ctx: CanvasRenderingContext2D, size: number, color: string, age: number): void {
    // Pulsing orb
    const pulse = 1 + Math.sin(age * 0.01) * 0.2;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(0, 0, 6 * size * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 8 * size * pulse);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, 8 * size * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Electric arcs
    ctx.strokeStyle = 'rgba(200, 220, 255, 0.8)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      const angle = (age * 0.005 + i * Math.PI / 2);
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const x1 = Math.cos(angle) * 10 * size;
      const y1 = Math.sin(angle) * 10 * size;
      const cx = Math.cos(angle + 0.3) * 6 * size;
      const cy = Math.sin(angle + 0.3) * 6 * size;
      ctx.quadraticCurveTo(cx, cy, x1, y1);
      ctx.stroke();
    }
  }

  private drawClusterProjectile(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    // Main shell
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10 * size, 5 * size, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cluster pattern
    ctx.fillStyle = color;
    const clusterPositions = [
      { x: 3, y: 0 },
      { x: -2, y: 3 },
      { x: -2, y: -3 },
      { x: -5, y: 0 },
    ];
    for (const pos of clusterPositions) {
      ctx.beginPath();
      ctx.arc(pos.x * size, pos.y * size, 2 * size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawNapalmProjectile(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    // Canister body
    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.roundRect(-8 * size, -4 * size, 16 * size, 8 * size, 2);
    ctx.fill();

    // Flame indicator
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(6 * size, -2 * size);
    ctx.quadraticCurveTo(10 * size, 0, 6 * size, 2 * size);
    ctx.lineTo(4 * size, 0);
    ctx.closePath();
    ctx.fill();

    // Warning stripe
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-6 * size, -4 * size);
    ctx.lineTo(-6 * size, 4 * size);
    ctx.stroke();
  }

  private drawBunkerBusterProjectile(ctx: CanvasRenderingContext2D, size: number, color: string): void {
    // Heavy shell body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14 * size, 5 * size, 0, 0, Math.PI * 2);
    ctx.fill();

    // Armored nose
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.moveTo(16 * size, 0);
    ctx.lineTo(10 * size, -4 * size);
    ctx.lineTo(10 * size, 4 * size);
    ctx.closePath();
    ctx.fill();

    // Reinforcement bands
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-4 * size, -5 * size);
    ctx.lineTo(-4 * size, 5 * size);
    ctx.moveTo(2 * size, -5 * size);
    ctx.lineTo(2 * size, 5 * size);
    ctx.stroke();
  }

  drawParticles(particles: ParticleSystem): void {
    const ctx = this.ctx;

    for (const p of particles.getParticles()) {
      const alpha = p.life / p.maxLife;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'smoke') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (1 - alpha) * 0.5), 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'debris') {
        ctx.translate(p.x, p.y);
        if (p.rotation !== undefined) {
          ctx.rotate(p.rotation);
        }
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      } else if (p.type === 'spark') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  drawAimingLine(tank: Tank, mousePos: { x: number; y: number }, config?: WeaponConfig): void {
    if (!tank.alive) return;

    const ctx = this.ctx;
    const startX = tank.x + Math.cos(tank.turretAngle) * TANK.TURRET_LENGTH;
    const startY = tank.y + Math.sin(tank.turretAngle) * TANK.TURRET_LENGTH;

    const points: Array<{ x: number; y: number }> = [];
    let x = startX;
    let y = startY;

    // Use weapon-specific speed and gravity
    const speed = config?.speed ?? PHYSICS.PROJECTILE_SPEED;
    const gravityMult = config?.gravityMultiplier ?? 1.0;

    let vx = Math.cos(tank.turretAngle) * speed;
    let vy = Math.sin(tank.turretAngle) * speed;

    const dt = 0.016;
    const maxSteps = 80;
    const isGuided = config?.behavior?.type === 'guided';

    for (let i = 0; i < maxSteps; i++) {
      points.push({ x, y });

      // Guided projectiles (drones) fly straight for visualization
      if (!isGuided) {
        vy += PHYSICS.GRAVITY * gravityMult * dt;
      }

      x += vx * dt;
      y += vy * dt;

      if (y > this.height || x < 0 || x > this.width) break;
    }

    if (points.length > 1) {
      ctx.setLineDash([8, 8]);

      // Use weapon-specific trail color
      const trailColor = config?.trailColor ?? 'rgba(255, 255, 255, 0.3)';
      ctx.strokeStyle = trailColor.replace(/[\d.]+\)$/, '0.3)');
      ctx.lineWidth = 2;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length; i++) {
        const alpha = 1 - i / points.length;
        if (alpha < 0.1) break;
        ctx.lineTo(points[i].x, points[i].y);
      }

      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  drawNapalmFires(fires: NapalmFire[]): void {
    const ctx = this.ctx;

    for (const fire of fires) {
      const alpha = fire.life;

      // Base fire glow
      const gradient = ctx.createRadialGradient(fire.x, fire.y, 0, fire.x, fire.y, 15);
      gradient.addColorStop(0, `rgba(255, 200, 50, ${alpha * 0.8})`);
      gradient.addColorStop(0.5, `rgba(255, 100, 0, ${alpha * 0.5})`);
      gradient.addColorStop(1, 'rgba(255, 50, 0, 0)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(fire.x, fire.y, 15, 0, Math.PI * 2);
      ctx.fill();

      // Flickering flames
      const flickerOffset = Math.sin(performance.now() * 0.01 + fire.x) * 3;
      ctx.fillStyle = `rgba(255, 220, 100, ${alpha * 0.6})`;
      ctx.beginPath();
      ctx.moveTo(fire.x - 5, fire.y);
      ctx.quadraticCurveTo(fire.x, fire.y - 15 + flickerOffset, fire.x + 5, fire.y);
      ctx.fill();
    }
  }

  drawEMPEffect(x: number, y: number, radius: number, progress: number): void {
    if (progress >= 1) return;

    const ctx = this.ctx;
    const currentRadius = radius * progress;
    const alpha = 1 - progress;

    ctx.save();

    // Outer ring
    ctx.strokeStyle = `rgba(100, 150, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner glow
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, currentRadius);
    gradient.addColorStop(0, 'rgba(100, 150, 255, 0)');
    gradient.addColorStop(0.7, `rgba(100, 150, 255, ${alpha * 0.1})`);
    gradient.addColorStop(1, `rgba(150, 200, 255, ${alpha * 0.3})`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
    ctx.fill();

    // Electric arcs around the ring
    ctx.strokeStyle = `rgba(200, 220, 255, ${alpha})`;
    ctx.lineWidth = 2;
    const arcCount = 8;
    for (let i = 0; i < arcCount; i++) {
      const angle = (i / arcCount) * Math.PI * 2 + progress * Math.PI;
      const arcLength = 0.3;

      ctx.beginPath();
      ctx.arc(x, y, currentRadius - 2, angle, angle + arcLength);
      ctx.stroke();

      // Small lightning bolts
      const startAngle = angle + arcLength / 2;
      const boltX = x + Math.cos(startAngle) * (currentRadius - 2);
      const boltY = y + Math.sin(startAngle) * (currentRadius - 2);
      const endX = x + Math.cos(startAngle) * (currentRadius + 10);
      const endY = y + Math.sin(startAngle) * (currentRadius + 10);
      const midX = (boltX + endX) / 2 + (Math.random() - 0.5) * 8;
      const midY = (boltY + endY) / 2 + (Math.random() - 0.5) * 8;

      ctx.beginPath();
      ctx.moveTo(boltX, boltY);
      ctx.lineTo(midX, midY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    ctx.restore();
  }

  private adjustColor(hex: string, amount: number): string {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000ff) + amount));
    return `rgb(${r}, ${g}, ${b})`;
  }
}
