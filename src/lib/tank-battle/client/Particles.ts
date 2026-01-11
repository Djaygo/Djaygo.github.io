interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: 'explosion' | 'debris' | 'smoke' | 'spark' | 'fire' | 'electric' | 'trail';
  rotation?: number;
  rotationSpeed?: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private readonly MAX_PARTICLES = 800;

  update(deltaTime: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.type === 'debris') {
        p.vy += 600 * deltaTime;
      }

      if (p.type === 'smoke' || p.type === 'trail') {
        p.vx *= 0.97;
        p.vy *= 0.97;
        p.vy -= 40 * deltaTime;
      }

      if (p.type === 'spark') {
        p.vy += 300 * deltaTime;
      }

      if (p.type === 'fire') {
        // Fire rises and drifts
        p.vy -= 80 * deltaTime;
        p.vx *= 0.95;
        p.vy *= 0.98;
      }

      if (p.type === 'electric') {
        // Electric particles move erratically
        p.vx += (Math.random() - 0.5) * 500 * deltaTime;
        p.vy += (Math.random() - 0.5) * 500 * deltaTime;
        p.vx *= 0.95;
        p.vy *= 0.95;
      }

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;

      if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
        p.rotation += p.rotationSpeed * deltaTime;
      }

      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  createExplosion(x: number, y: number, radius: number): void {
    const particleCount = Math.min(40, Math.floor(radius * 1.5));

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 180;
      const hue = 20 + Math.random() * 40;
      const lightness = 45 + Math.random() * 35;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 80,
        life: 0.2 + Math.random() * 0.3,
        maxLife: 0.5,
        size: 3 + Math.random() * 6,
        color: `hsl(${hue}, 100%, ${lightness}%)`,
        type: 'explosion',
      });
    }

    const smokeCount = Math.floor(particleCount / 3);
    for (let i = 0; i < smokeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 15 + Math.random() * 40;
      const gray = 60 + Math.random() * 40;

      this.addParticle({
        x: x + (Math.random() - 0.5) * radius * 0.5,
        y: y + (Math.random() - 0.5) * radius * 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 20,
        life: 0.8 + Math.random() * 1.2,
        maxLife: 2,
        size: 12 + Math.random() * 24,
        color: `rgba(${gray}, ${gray}, ${gray}, 0.6)`,
        type: 'smoke',
      });
    }

    for (let i = 0; i < 8; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 200 + Math.random() * 350;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.5,
        maxLife: 0.9,
        size: 2,
        color: '#FFFF44',
        type: 'spark',
      });
    }
  }

  createDebris(debris: Array<{ x: number; y: number; color: [number, number, number] }>): void {
    const maxDebris = 80;
    const step = Math.max(1, Math.ceil(debris.length / maxDebris));

    for (let i = 0; i < debris.length; i += step) {
      const d = debris[i];
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.6;
      const speed = 60 + Math.random() * 140;

      this.addParticle({
        x: d.x,
        y: d.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.2 + Math.random() * 2,
        maxLife: 3.2,
        size: 2 + Math.random() * 3,
        color: `rgb(${d.color[0]}, ${d.color[1]}, ${d.color[2]})`,
        type: 'debris',
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 12,
      });
    }
  }

  createMuzzleFlash(x: number, y: number, angle: number): void {
    for (let i = 0; i < 6; i++) {
      const spread = (Math.random() - 0.5) * 0.4;
      const speed = 150 + Math.random() * 100;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle + spread) * speed,
        vy: Math.sin(angle + spread) * speed,
        life: 0.1 + Math.random() * 0.1,
        maxLife: 0.2,
        size: 4 + Math.random() * 4,
        color: `hsl(45, 100%, ${60 + Math.random() * 30}%)`,
        type: 'explosion',
      });
    }
  }

  createFireParticle(x: number, y: number): void {
    // Create a rising fire particle
    const hue = 20 + Math.random() * 30; // Orange to yellow
    const lightness = 50 + Math.random() * 30;

    this.addParticle({
      x: x + (Math.random() - 0.5) * 10,
      y,
      vx: (Math.random() - 0.5) * 30,
      vy: -20 - Math.random() * 40,
      life: 0.4 + Math.random() * 0.4,
      maxLife: 0.8,
      size: 4 + Math.random() * 6,
      color: `hsl(${hue}, 100%, ${lightness}%)`,
      type: 'fire',
    });
  }

  createEMPExplosion(x: number, y: number, radius: number): void {
    // Create electric particles spreading outward
    const particleCount = Math.min(30, Math.floor(radius * 0.4));

    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 100 + Math.random() * 200;
      const hue = 200 + Math.random() * 40; // Blue to cyan

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.4,
        maxLife: 0.7,
        size: 2 + Math.random() * 3,
        color: `hsl(${hue}, 80%, ${60 + Math.random() * 30}%)`,
        type: 'electric',
      });
    }

    // Create central bright flash
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = 50 + Math.random() * 80;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.15 + Math.random() * 0.1,
        maxLife: 0.25,
        size: 6 + Math.random() * 4,
        color: '#FFFFFF',
        type: 'explosion',
      });
    }
  }

  createMissileTrail(x: number, y: number): void {
    // Create smoke trail for missiles
    const gray = 80 + Math.random() * 40;

    this.addParticle({
      x: x + (Math.random() - 0.5) * 4,
      y: y + (Math.random() - 0.5) * 4,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 1.0,
      size: 6 + Math.random() * 8,
      color: `rgba(${gray}, ${gray}, ${gray}, 0.5)`,
      type: 'trail',
    });

    // Occasional flame particle from exhaust
    if (Math.random() < 0.3) {
      this.addParticle({
        x,
        y,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        life: 0.1 + Math.random() * 0.1,
        maxLife: 0.2,
        size: 3 + Math.random() * 3,
        color: `hsl(${30 + Math.random() * 20}, 100%, 60%)`,
        type: 'explosion',
      });
    }
  }

  createClusterExplosion(x: number, y: number): void {
    // Smaller, more intense explosion for cluster bomblets
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;
      const hue = 10 + Math.random() * 30; // More red-orange

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50,
        life: 0.15 + Math.random() * 0.2,
        maxLife: 0.35,
        size: 2 + Math.random() * 4,
        color: `hsl(${hue}, 100%, ${50 + Math.random() * 30}%)`,
        type: 'explosion',
      });
    }

    // Sparks
    for (let i = 0; i < 4; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;
      const speed = 150 + Math.random() * 200;

      this.addParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        size: 2,
        color: '#FFAA44',
        type: 'spark',
      });
    }
  }

  private addParticle(particle: Particle): void {
    if (this.particles.length < this.MAX_PARTICLES) {
      this.particles.push(particle);
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }
}
