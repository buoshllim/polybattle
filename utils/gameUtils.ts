import { GAME_CONFIG } from '../types';

export const getTerrainHeight = (x: number, z: number): number => {
  // Flatten terrain near castles (Z > 50 or Z < -50)
  if (Math.abs(z) > 50) {
    // Smooth transition from hills to flat
    const transition = Math.max(0, 1 - (Math.abs(z) - 50) / 10);
    const base = Math.sin(x * 0.1) * 1.5 + Math.cos(z * 0.1) * 1.5;
    return Math.max(0, base * transition);
  }

  // Smooth rolling hills in center
  const base = Math.sin(x * 0.1) * 1.5 + Math.cos(z * 0.1) * 1.5;
  const detail = Math.sin(x * 0.3 + z * 0.2) * 0.5;
  return Math.max(0, base + detail); 
};

export const randomRange = (min: number, max: number) => Math.random() * (max - min) + min;

export const generateId = () => Math.random().toString(36).substr(2, 9);

export const distance = (p1: {x: number, z: number}, p2: {x: number, z: number}) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.z - p1.z, 2));
};

// --- COLLISION UTILS ---

export interface RectCollider {
  x: number; // Center X
  z: number; // Center Z
  width: number;
  depth: number;
}

export interface CircleCollider {
  x: number;
  z: number;
  radius: number;
}

// Push circle out of another circle
export const resolveCircleCollision = (x: number, z: number, r: number, targetX: number, targetZ: number, targetR: number) => {
  const dx = x - targetX;
  const dz = z - targetZ;
  const dist = Math.sqrt(dx * dx + dz * dz);
  const minScroll = r + targetR;

  if (dist < minScroll && dist > 0) {
    const overlap = minScroll - dist;
    const nx = dx / dist;
    const nz = dz / dist;
    return {
      x: x + nx * overlap,
      z: z + nz * overlap
    };
  }
  return { x, z };
};

// Push circle out of rectangle (Axis Aligned)
export const resolveRectCollision = (x: number, z: number, r: number, rect: RectCollider) => {
  // Find closest point on rectangle to circle center
  const closestX = Math.max(rect.x - rect.width / 2, Math.min(x, rect.x + rect.width / 2));
  const closestZ = Math.max(rect.z - rect.depth / 2, Math.min(z, rect.z + rect.depth / 2));

  const dx = x - closestX;
  const dz = z - closestZ;
  const distSq = dx * dx + dz * dz;

  // If inside radius
  if (distSq < r * r) {
    const dist = Math.sqrt(distSq);
    
    // If center is inside rectangle exactly, push out by X or Z (whichever is closer to edge)
    if (dist === 0) {
       const distToLeft = Math.abs(x - (rect.x - rect.width/2));
       const distToRight = Math.abs(x - (rect.x + rect.width/2));
       const distToTop = Math.abs(z - (rect.z - rect.depth/2));
       const distToBottom = Math.abs(z - (rect.z + rect.depth/2));
       const min = Math.min(distToLeft, distToRight, distToTop, distToBottom);
       
       if (min === distToLeft) return { x: rect.x - rect.width/2 - r, z };
       if (min === distToRight) return { x: rect.x + rect.width/2 + r, z };
       if (min === distToTop) return { x, z: rect.z - rect.depth/2 - r };
       return { x, z: rect.z + rect.depth/2 + r };
    }

    const overlap = r - dist;
    const nx = dx / dist;
    const nz = dz / dist;
    
    return {
      x: x + nx * overlap,
      z: z + nz * overlap
    };
  }
  return { x, z };
};