import type { BranchNode } from "../types/Tree.types";

export function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function generateSkeleton(rng: () => number, currentLen: number, minLen = 10): BranchNode[] {
  if (currentLen <= minLen) return [];
  const leftAngle = -(20 + rng() * 15);
  const rightAngle = 20 + rng() * 15;
  const leftRatio = 0.68 + rng() * 0.18;
  const rightRatio = 0.68 + rng() * 0.18;
  return [
    { angle: leftAngle, lengthRatio: leftRatio, children: generateSkeleton(rng, currentLen * leftRatio, minLen) },
    { angle: rightAngle, lengthRatio: rightRatio, children: generateSkeleton(rng, currentLen * rightRatio, minLen) },
  ];
}

export function drawLeaf(target: any, angleDeg: number, scale: number, r: number, g: number, b: number, alpha: number) {
  target.push();
  target.rotate(angleDeg);
  target.noStroke();
  target.fill(r, g, b, alpha);
  target.scale(scale);
  target.beginShape();
  for (let i = 0; i <= 180; i += 12) {
    const radius = 11 * target.sin(i);
    target.vertex(radius * target.cos(i - 90), -i * 0.17);
  }
  target.endShape(target.CLOSE);
  target.pop();
}

export function repositoryFromCommitUrl(url: string): string {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/i);
  if (!match) return "Unknown repository";
  return `${match[1]}/${match[2]}`;
}
