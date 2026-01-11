import type { TerrainInitData } from '../shared/types';
import { TERRAIN, COLORS } from '../shared/constants';

// Sand granule size - larger = fewer particles = better performance
const SAND_GRANULE_SIZE = 3;
const SETTLE_THRESHOLD = 10; // Frames without movement before settling
const MAX_ACTIVE_PARTICLES = 800; // Limit active particles for performance

interface SandParticle {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  settled: boolean;
  stuckFrames: number;
  velocity: number; // Vertical velocity for more natural falling
}

export class Terrain {
  private width: number = 0;
  private height: number = 0;
  private seed: number = 0;

  private terrainCanvas: OffscreenCanvas | null = null;
  private terrainCtx: OffscreenCanvasRenderingContext2D | null = null;
  private terrainImageData: ImageData | null = null;
  private collisionMask: Uint8Array | null = null;

  // Falling sand simulation
  private sandParticles: SandParticle[] = [];
  private sandGrid: Map<string, number> = new Map(); // "x,y" -> particle index

  private pendingDebris: Array<{ x: number; y: number; color: [number, number, number] }> = [];

  initialize(data: TerrainInitData): void {
    this.width = data.width;
    this.height = data.height;
    this.seed = data.seed;

    this.terrainCanvas = new OffscreenCanvas(this.width, this.height);
    this.terrainCtx = this.terrainCanvas.getContext('2d')!;

    this.generateFromSeed();
    this.terrainImageData = this.terrainCtx.getImageData(0, 0, this.width, this.height);
    this.buildCollisionMask();

    // Clear sand simulation
    this.sandParticles = [];
    this.sandGrid.clear();
  }

  private generateFromSeed(): void {
    const ctx = this.terrainCtx!;

    const skyGradient = ctx.createLinearGradient(0, 0, 0, this.height);
    skyGradient.addColorStop(0, COLORS.SKY_TOP);
    skyGradient.addColorStop(1, COLORS.SKY_BOTTOM);
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const heightmap = this.generateHeightmap();
    this.drawTerrainLayers(heightmap);
  }

  private generateHeightmap(): number[] {
    const heightmap: number[] = [];
    const random = this.seededRandom(this.seed);
    const seedOffset = random() * 1000;

    // Base ground level (lower part of screen)
    const valleyHeight = this.height * 0.75;
    const mountainHeight = this.height * 0.45;

    // Mountain positions (left and right sides)
    const leftMountainCenter = this.width * 0.15;
    const rightMountainCenter = this.width * 0.85;
    const mountainWidth = this.width * 0.25;

    for (let x = 0; x < this.width; x++) {
      // Start with valley height
      let height = valleyHeight;

      // Left mountain - smooth gaussian-like curve
      const leftDist = Math.abs(x - leftMountainCenter);
      if (leftDist < mountainWidth) {
        const t = 1 - (leftDist / mountainWidth);
        const mountainContrib = t * t * (3 - 2 * t); // smoothstep
        height -= (valleyHeight - mountainHeight) * mountainContrib;
      }

      // Right mountain - smooth gaussian-like curve
      const rightDist = Math.abs(x - rightMountainCenter);
      if (rightDist < mountainWidth) {
        const t = 1 - (rightDist / mountainWidth);
        const mountainContrib = t * t * (3 - 2 * t); // smoothstep
        height -= (valleyHeight - mountainHeight) * mountainContrib;
      }

      // Add gentle rolling noise (very smooth, no spikes)
      const gentleNoise = Math.sin((x + seedOffset) * 0.01) * 15;
      height += gentleNoise;

      heightmap.push(Math.floor(height));
    }

    return heightmap;
  }

  private drawTerrainLayers(heightmap: number[]): void {
    const ctx = this.terrainCtx!;

    ctx.fillStyle = COLORS.ROCK;
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    for (let x = 0; x < this.width; x++) {
      ctx.lineTo(x, heightmap[x] + TERRAIN.GRASS_DEPTH + TERRAIN.DIRT_DEPTH);
    }
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = COLORS.DIRT;
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    for (let x = 0; x < this.width; x++) {
      ctx.lineTo(x, heightmap[x] + TERRAIN.GRASS_DEPTH);
    }
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = COLORS.GRASS;
    ctx.beginPath();
    ctx.moveTo(0, this.height);
    for (let x = 0; x < this.width; x++) {
      ctx.lineTo(x, heightmap[x]);
    }
    ctx.lineTo(this.width, this.height);
    ctx.closePath();
    ctx.fill();
  }

  private buildCollisionMask(): void {
    const data = this.terrainImageData!.data;
    this.collisionMask = new Uint8Array(this.width * this.height);

    for (let i = 0; i < this.width * this.height; i++) {
      const pixelIndex = i * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];

      const isSky = this.isSkyColor(r, g, b);
      this.collisionMask[i] = isSky ? 0 : 1;
    }
  }

  private isSkyColor(r: number, g: number, b: number): boolean {
    return b > r && b > g && r < 100;
  }

  createCrater(centerX: number, centerY: number, radius: number): void {
    if (!this.terrainImageData || !this.collisionMask) return;

    const data = this.terrainImageData.data;
    const radiusSq = radius * radius;
    const innerRadiusSq = (radius * 0.5) * (radius * 0.5); // Inner 50% is vaporized

    const startY = Math.max(0, Math.floor(centerY - radius));
    const endY = Math.min(this.height - 1, Math.ceil(centerY + radius));
    const startX = Math.max(0, Math.floor(centerX - radius));
    const endX = Math.min(this.width - 1, Math.ceil(centerX + radius));

    // Align to granule grid for consistent positioning
    const alignedStartX = Math.floor(startX / SAND_GRANULE_SIZE) * SAND_GRANULE_SIZE;
    const alignedStartY = Math.floor(startY / SAND_GRANULE_SIZE) * SAND_GRANULE_SIZE;

    // Track granule positions to avoid duplicates
    const processedGranules = new Set<string>();

    // First pass: create crater and convert edge pixels to sand granules
    for (let y = alignedStartY; y <= endY; y += SAND_GRANULE_SIZE) {
      for (let x = alignedStartX; x <= endX; x += SAND_GRANULE_SIZE) {
        // Check center of granule
        const gx = x + Math.floor(SAND_GRANULE_SIZE / 2);
        const gy = y + Math.floor(SAND_GRANULE_SIZE / 2);
        const dx = gx - centerX;
        const dy = gy - centerY;
        const distSq = dx * dx + dy * dy;

        if (distSq < radiusSq) {
          // Sample color from center of granule
          const sampleIndex = Math.min(gy, this.height - 1) * this.width + Math.min(gx, this.width - 1);
          const samplePixelIndex = sampleIndex * 4;

          // Check if this granule area has any solid pixels
          let hasSolid = false;
          for (let py = y; py < Math.min(y + SAND_GRANULE_SIZE, this.height); py++) {
            for (let px = x; px < Math.min(x + SAND_GRANULE_SIZE, this.width); px++) {
              const idx = py * this.width + px;
              if (this.collisionMask![idx] === 1) {
                hasSolid = true;
                // Add to debris for visual effect
                const pixIdx = idx * 4;
                this.pendingDebris.push({
                  x: px,
                  y: py,
                  color: [data[pixIdx], data[pixIdx + 1], data[pixIdx + 2]],
                });
              }
            }
          }

          if (hasSolid) {
            // Clear all pixels in granule area
            for (let py = y; py < Math.min(y + SAND_GRANULE_SIZE, this.height); py++) {
              for (let px = x; px < Math.min(x + SAND_GRANULE_SIZE, this.width); px++) {
                const idx = py * this.width + px;
                if (this.collisionMask![idx] === 1) {
                  this.clearPixel(px, py, data, idx);
                }
              }
            }

            // Only create sand granule for outer ring (inner is vaporized)
            if (distSq >= innerRadiusSq) {
              const granuleKey = `${x},${y}`;
              if (!processedGranules.has(granuleKey) && !this.sandGrid.has(granuleKey)) {
                processedGranules.add(granuleKey);

                // Limit total active particles for performance
                const activeCount = this.sandParticles.filter(p => !p.settled).length;
                if (activeCount < MAX_ACTIVE_PARTICLES) {
                  this.sandParticles.push({
                    x,
                    y,
                    r: data[samplePixelIndex],
                    g: data[samplePixelIndex + 1],
                    b: data[samplePixelIndex + 2],
                    settled: false,
                    stuckFrames: 0,
                    velocity: 0,
                  });
                  this.sandGrid.set(granuleKey, this.sandParticles.length - 1);
                }
              }
            }
          }
        }
      }
    }

    // Second pass: check for unsupported terrain above the crater and convert to sand
    this.collapseUnsupportedTerrain(startX, endX, startY, data);

    this.terrainCtx!.putImageData(this.terrainImageData, 0, 0);
  }

  private clearPixel(x: number, y: number, data: Uint8ClampedArray, index: number): void {
    const pixelIndex = index * 4;
    const skyR = 22 + (38 - 22) * (y / this.height);
    const skyG = 33 + (62 - 33) * (y / this.height);
    const skyB = 46 + (62 - 46) * (y / this.height);

    data[pixelIndex] = skyR;
    data[pixelIndex + 1] = skyG;
    data[pixelIndex + 2] = skyB;
    data[pixelIndex + 3] = 255;

    this.collisionMask![index] = 0;
  }

  private collapseUnsupportedTerrain(startX: number, endX: number, craterTopY: number, data: Uint8ClampedArray): void {
    // Expand range to catch edge collapses - check further out from crater
    const expandedStartX = Math.max(0, startX - SAND_GRANULE_SIZE * 15);
    const expandedEndX = Math.min(this.width - 1, endX + SAND_GRANULE_SIZE * 15);

    // Align to granule grid
    const alignedStartX = Math.floor(expandedStartX / SAND_GRANULE_SIZE) * SAND_GRANULE_SIZE;
    const alignedEndX = Math.ceil(expandedEndX / SAND_GRANULE_SIZE) * SAND_GRANULE_SIZE;

    // Multiple passes to handle cascading collapses
    let changed = true;
    let passes = 0;
    const maxPasses = 30;

    while (changed && passes < maxPasses) {
      changed = false;
      passes++;

      // For each column (in granule steps), check if there's floating terrain
      for (let x = alignedStartX; x <= alignedEndX; x += SAND_GRANULE_SIZE) {
        // Scan from bottom to top, tracking if we have continuous support
        let hasSupport = true; // Bottom of screen is always supported

        for (let y = this.height - SAND_GRANULE_SIZE; y >= 0; y -= SAND_GRANULE_SIZE) {
          // Check if this granule area has any solid pixels
          let hasSolid = false;
          let hasAnySand = false;

          for (let py = y; py < Math.min(y + SAND_GRANULE_SIZE, this.height); py++) {
            for (let px = x; px < Math.min(x + SAND_GRANULE_SIZE, this.width); px++) {
              const idx = py * this.width + px;
              if (this.collisionMask![idx] === 1) {
                hasSolid = true;
              }
            }
          }

          // Check for sand at this granule position
          const granuleKey = `${x},${y}`;
          if (this.sandGrid.has(granuleKey)) {
            hasAnySand = true;
          }

          if (hasSolid) {
            // Check if this granule should collapse
            let shouldCollapse = !hasSupport;

            // Also check for unstable diagonal edges even if there's support below
            if (hasSupport) {
              const belowY = y + SAND_GRANULE_SIZE;
              if (belowY < this.height) {
                const directlyBelowEmpty = this.isGranuleEmpty(x, belowY);

                // If nothing directly below, check if this is a diagonal overhang
                if (directlyBelowEmpty) {
                  // This granule is overhanging - should definitely fall
                  shouldCollapse = true;
                } else {
                  // Check if this is a narrow edge that should collapse
                  const leftX = x - SAND_GRANULE_SIZE;
                  const rightX = x + SAND_GRANULE_SIZE;

                  // Check if this is an isolated edge (empty on sides and diagonals)
                  const leftSideEmpty = this.isGranuleEmpty(leftX, y);
                  const rightSideEmpty = this.isGranuleEmpty(rightX, y);
                  const leftDiagEmpty = this.isGranuleEmpty(leftX, belowY);
                  const rightDiagEmpty = this.isGranuleEmpty(rightX, belowY);

                  // Collapse if it's a thin edge with empty space on both sides
                  if (leftSideEmpty && leftDiagEmpty) {
                    shouldCollapse = true;
                  } else if (rightSideEmpty && rightDiagEmpty) {
                    shouldCollapse = true;
                  }
                }
              }
            }

            if (shouldCollapse) {
              // This granule should fall - convert to sand
              if (!this.sandGrid.has(granuleKey)) {
                // Limit active particles
                const activeCount = this.sandParticles.filter(p => !p.settled).length;
                if (activeCount >= MAX_ACTIVE_PARTICLES) continue;

                // Sample color from center
                const sampleX = Math.min(x + Math.floor(SAND_GRANULE_SIZE / 2), this.width - 1);
                const sampleY = Math.min(y + Math.floor(SAND_GRANULE_SIZE / 2), this.height - 1);
                const sampleIndex = sampleY * this.width + sampleX;
                const pixelIndex = sampleIndex * 4;

                this.sandParticles.push({
                  x,
                  y,
                  r: data[pixelIndex],
                  g: data[pixelIndex + 1],
                  b: data[pixelIndex + 2],
                  settled: false,
                  stuckFrames: 0,
                  velocity: 0,
                });
                this.sandGrid.set(granuleKey, this.sandParticles.length - 1);

                // Clear pixels in granule
                for (let py = y; py < Math.min(y + SAND_GRANULE_SIZE, this.height); py++) {
                  for (let px = x; px < Math.min(x + SAND_GRANULE_SIZE, this.width); px++) {
                    const idx = py * this.width + px;
                    if (this.collisionMask![idx] === 1) {
                      this.clearPixel(px, py, data, idx);
                    }
                  }
                }

                changed = true;
              }
              // After converting, this position no longer provides support
              hasSupport = false;
            } else {
              // Solid with support - maintains support chain
              hasSupport = true;
            }
          } else if (hasAnySand) {
            // Sand particles don't provide stable support
            hasSupport = false;
          } else {
            // Empty space - breaks support chain
            hasSupport = false;
          }
        }
      }
    }
  }

  private isGranuleEmpty(x: number, y: number): boolean {
    // Check if a granule position is empty (no terrain, no sand)
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;

    // Check for sand particle
    const granuleKey = `${x},${y}`;
    if (this.sandGrid.has(granuleKey)) return false;

    // Check collision mask for any solid pixels in this granule
    for (let py = y; py < Math.min(y + SAND_GRANULE_SIZE, this.height); py++) {
      for (let px = x; px < Math.min(x + SAND_GRANULE_SIZE, this.width); px++) {
        const idx = py * this.width + px;
        if (this.collisionMask![idx] === 1) {
          return false;
        }
      }
    }
    return true;
  }

  // Update falling sand simulation - call this each frame
  updateSand(): void {
    if (!this.terrainImageData || !this.collisionMask) return;

    // Count active particles
    const activeParticles = this.sandParticles.filter(p => !p.settled);
    if (activeParticles.length === 0) {
      // All sand has settled - clean up the array
      if (this.sandParticles.length > 0) {
        this.cleanupSettledParticles();
      }
      return;
    }

    let anyChanged = false;

    // Process particles from bottom to top so lower particles move first
    const sortedIndices = this.sandParticles
      .map((_, i) => i)
      .filter(i => !this.sandParticles[i].settled)
      .sort((a, b) => this.sandParticles[b].y - this.sandParticles[a].y);

    for (const i of sortedIndices) {
      const particle = this.sandParticles[i];
      if (particle.settled) continue;

      const result = this.tryMoveSandParticle(particle, i);

      if (result === 'moved') {
        anyChanged = true;
        particle.stuckFrames = 0;
      } else if (result === 'blocked_by_terrain') {
        particle.stuckFrames++;
        if (particle.stuckFrames >= SETTLE_THRESHOLD) {
          this.settleSandParticle(particle, i);
          anyChanged = true;
        }
      } else if (result === 'blocked_by_sand') {
        // Blocked by other sand - takes much longer to settle (wait for other sand to move)
        particle.stuckFrames++;
        if (particle.stuckFrames >= SETTLE_THRESHOLD * 4) {
          this.settleSandParticle(particle, i);
          anyChanged = true;
        }
      }
    }

    // Update the canvas if anything changed
    if (anyChanged) {
      this.terrainCtx!.putImageData(this.terrainImageData, 0, 0);
    }
  }

  private tryMoveSandParticle(particle: SandParticle, particleIndex: number): 'moved' | 'blocked_by_terrain' | 'blocked_by_sand' {
    const { x, y } = particle;
    const step = SAND_GRANULE_SIZE;

    // Falling sand movement priorities: down, then diagonals
    const moves = [
      [0, step],      // directly down
      [step, step],   // diagonally down-right
      [-step, step],  // diagonally down-left
    ];

    // Randomize diagonal preference to prevent bias
    if (Math.random() > 0.5) {
      [moves[1], moves[2]] = [moves[2], moves[1]];
    }

    let blockedBySand = false;

    for (const [dx, dy] of moves) {
      const newX = x + dx;
      const newY = y + dy;

      // Check bounds (granule must fit within canvas)
      if (newX < 0 || newX + step > this.width || newY + step > this.height) {
        continue;
      }

      // Check if destination area is clear (no terrain, no other sand)
      let destClear = true;
      let hasTerrainBlock = false;
      let hasSandBlock = false;

      for (let py = newY; py < newY + step && destClear; py++) {
        for (let px = newX; px < newX + step && destClear; px++) {
          const idx = py * this.width + px;
          if (this.collisionMask![idx] === 1) {
            destClear = false;
            hasTerrainBlock = true;
          }
        }
      }

      // Check for other sand particles at destination
      const newKey = `${newX},${newY}`;
      if (this.sandGrid.has(newKey)) {
        destClear = false;
        hasSandBlock = true;
      }

      if (!destClear) {
        if (hasSandBlock) blockedBySand = true;
        continue;
      }

      // Move the particle
      const oldKey = `${x},${y}`;
      this.sandGrid.delete(oldKey);
      this.sandGrid.set(newKey, particleIndex);

      particle.x = newX;
      particle.y = newY;

      return 'moved';
    }

    // Couldn't move - determine why
    if (blockedBySand) {
      return 'blocked_by_sand';
    }

    // Check what's directly below
    const belowY = y + step;
    if (belowY >= this.height) {
      return 'blocked_by_terrain'; // At bottom of screen
    }

    const belowKey = `${x},${belowY}`;
    if (this.sandGrid.has(belowKey)) {
      return 'blocked_by_sand';
    }

    return 'blocked_by_terrain';
  }

  private settleSandParticle(particle: SandParticle, particleIndex: number): void {
    if (!this.terrainImageData || !this.collisionMask) return;

    const { x, y, r, g, b } = particle;

    // Don't settle if out of bounds
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      particle.settled = true;
      const key = `${x},${y}`;
      this.sandGrid.delete(key);
      return;
    }

    const data = this.terrainImageData.data;

    // Paint the entire granule area with the particle's color
    for (let py = y; py < Math.min(y + SAND_GRANULE_SIZE, this.height); py++) {
      for (let px = x; px < Math.min(x + SAND_GRANULE_SIZE, this.width); px++) {
        const idx = py * this.width + px;
        const pixelIndex = idx * 4;

        data[pixelIndex] = r;
        data[pixelIndex + 1] = g;
        data[pixelIndex + 2] = b;
        data[pixelIndex + 3] = 255;

        // Update collision mask - this is now solid terrain
        this.collisionMask![idx] = 1;
      }
    }

    // Mark as settled and remove from grid
    particle.settled = true;
    const key = `${x},${y}`;
    this.sandGrid.delete(key);
  }

  // Get count of active (unsettled) sand particles
  getActiveSandCount(): number {
    return this.sandParticles.filter(p => !p.settled).length;
  }

  // Draw sand particles (call from renderer)
  drawSandParticles(ctx: CanvasRenderingContext2D): void {
    for (const particle of this.sandParticles) {
      if (particle.settled) continue;

      ctx.fillStyle = `rgb(${particle.r}, ${particle.g}, ${particle.b})`;
      ctx.fillRect(particle.x, particle.y, SAND_GRANULE_SIZE, SAND_GRANULE_SIZE);
    }
  }

  // Clean up settled particles periodically
  cleanupSettledParticles(): void {
    this.sandParticles = this.sandParticles.filter(p => !p.settled);
  }

  isSolid(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return y >= this.height;
    }

    const fx = Math.floor(x);
    const fy = Math.floor(y);
    const index = fy * this.width + fx;

    // Check collision mask first
    if (this.collisionMask?.[index] === 1) return true;

    // Check if there's a sand particle covering this position
    // Sand particles are aligned to granule grid
    const granuleX = Math.floor(fx / SAND_GRANULE_SIZE) * SAND_GRANULE_SIZE;
    const granuleY = Math.floor(fy / SAND_GRANULE_SIZE) * SAND_GRANULE_SIZE;
    const key = `${granuleX},${granuleY}`;
    return this.sandGrid.has(key);
  }

  getHeightAt(x: number): number {
    if (!this.collisionMask) return this.height * TERRAIN.GROUND_LEVEL;

    const xi = Math.floor(Math.max(0, Math.min(this.width - 1, x)));

    for (let y = 0; y < this.height; y++) {
      // Check collision mask
      const index = y * this.width + xi;
      if (this.collisionMask[index] === 1) {
        return y;
      }
      // Check sand particles (aligned to granule grid)
      const granuleX = Math.floor(xi / SAND_GRANULE_SIZE) * SAND_GRANULE_SIZE;
      const granuleY = Math.floor(y / SAND_GRANULE_SIZE) * SAND_GRANULE_SIZE;
      const key = `${granuleX},${granuleY}`;
      if (this.sandGrid.has(key)) {
        return y;
      }
    }
    return this.height;
  }

  getImage(): OffscreenCanvas | null {
    return this.terrainCanvas;
  }

  popDebris(): Array<{ x: number; y: number; color: [number, number, number] }> {
    const debris = this.pendingDebris;
    this.pendingDebris = [];
    return debris;
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }
}
