import { useEffect, useMemo, useRef } from "react";
import p5 from "p5";
import { Box } from "@chakra-ui/react";
import type { CommitDay } from "../hooks/useCommitData";

interface Activity {
  userId: string;
  totalCommits: number;
  mergedPRs: number;
  streak: number;
  maxStreak: number;
  daysWithCommits: number;
  commitDays: CommitDay[];
  onLoad?: () => void;
}

interface BranchNode {
  angle: number;
  lengthRatio: number;
  children: BranchNode[];
}

interface BranchSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  len: number;
}

interface LeafNode {
  x: number;
  y: number;
  angle: number;
}

interface LeafHit {
  x: number;
  y: number;
  angle: number;
  commit: CommitDay;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function generateSkeleton(rng: () => number, currentLen: number, minLen = 10): BranchNode[] {
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

function drawLeaf(target: any, angleDeg: number, scale: number, r: number, g: number, b: number, alpha: number) {
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

export default function Tree({
  userId,
  totalCommits,
  mergedPRs,
  streak,
  daysWithCommits,
  commitDays,
  onLoad,
}: Activity) {
  const sketchRef = useRef<HTMLDivElement | null>(null);
  const loadedRef = useRef(false);

  const skeleton = useMemo(() => {
    const seed = hashString(userId);
    const rng = mulberry32(seed);
    return generateSkeleton(rng, 200, 10);
  }, [userId]);

  const activityScore = totalCommits + mergedPRs;

  useEffect(() => {
    let p5Instance: p5 | null = null;
    let resumeTimer: ReturnType<typeof setTimeout> | null = null;
    let cycleTimer: ReturnType<typeof setInterval> | null = null;

    const sketch = (p: p5) => {
      const baseLen = p.map(activityScore, 0, 200, 80, 220, true);
      const bR = p.map(streak, 0, 30, 90, 180, true);
      const bG = p.map(streak, 0, 30, 55, 110, true);
      const bB = 30;
      const leafG = p.map(daysWithCommits, 0, 30, 80, 215, true);
      const leafR = p.map(daysWithCommits, 0, 30, 90, 35, true);

      const sortedDays = [...commitDays].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
      );

      const CYCLE_MS = 3000;
      const MINI_W = 160;
      const MINI_H = 120;
      const MINI_PAD = 12;
      const MINI_INNER_PAD = 6;
      const ZOOM_BTN_W = 28;
      const ZOOM_BTN_H = 24;
      const ZOOM_BTN_GAP = 6;
      const ZOOM_BTN_OFFSET = 8;
      const MIN_ZOOM = 1;
      const MAX_ZOOM = 5;

      let camera = { x: 0, y: 0, zoom: 1 };
      let isDragging = false;
      let dragStart = { x: 0, y: 0 };
      let cameraAtDrag = { x: 0, y: 0 };

      let activeCommitIndex = 0;
      let manualHover: LeafHit | null = null;
      let isCyclingPaused = false;

      let branches: BranchSegment[] = [];
      let leaves: LeafNode[] = [];
      let commitLeafIndices: number[] = [];
      let commitLeafHits: LeafHit[] = [];
      let commitLeafByIndex: Array<LeafHit | null> = [];

      let treeBounds: Bounds = { minX: -1, maxX: 1, minY: -1, maxY: 1 };
      let treeBuffer: any | null = null;
      let minimapBuffer: any | null = null;
      let miniScale = 1;
      let miniOffsetX = 0;
      let miniOffsetY = 0;

      const worldToScreen = (wx: number, wy: number) => ({
        x: wx * camera.zoom + p.width / 2 + camera.x,
        y: (wy + p.height / 2) * camera.zoom + p.height / 2 + camera.y,
      });

      const viewportWorldRect = () => {
        const left = (0 - p.width / 2 - camera.x) / camera.zoom;
        const right = (p.width - p.width / 2 - camera.x) / camera.zoom;
        const top = (0 - p.height / 2 - camera.y) / camera.zoom - p.height / 2;
        const bottom = (p.height - p.height / 2 - camera.y) / camera.zoom - p.height / 2;
        return { left, right, top, bottom };
      };

      const requestRedraw = () => {
        p.redraw();
      };

      const applyZoomAtScreenPoint = (zoomFactor: number, screenX: number, screenY: number) => {
        const newZoom = p.constrain(camera.zoom * zoomFactor, MIN_ZOOM, MAX_ZOOM);
        const wx = (screenX - p.width / 2 - camera.x) / camera.zoom;
        const wy = (screenY - p.height / 2 - camera.y) / camera.zoom;
        camera.x = screenX - p.width / 2 - wx * newZoom;
        camera.y = screenY - p.height / 2 - wy * newZoom;
        camera.zoom = newZoom;
      };

      const minimapRect = () => {
        const x = p.width - MINI_W - MINI_PAD;
        const y = p.height - MINI_H - MINI_PAD;
        return { x, y, w: MINI_W, h: MINI_H };
      };

      const zoomButtonsRect = () => {
        const mini = minimapRect();
        const y = mini.y - ZOOM_BTN_H - ZOOM_BTN_OFFSET;
        const minusX = mini.x + mini.w - ZOOM_BTN_W;
        const plusX = minusX - ZOOM_BTN_W - ZOOM_BTN_GAP;
        return {
          plus: { x: plusX, y, w: ZOOM_BTN_W, h: ZOOM_BTN_H },
          minus: { x: minusX, y, w: ZOOM_BTN_W, h: ZOOM_BTN_H },
        };
      };

      const collectGeometry = (
        nodes: BranchNode[],
        len: number,
        x: number,
        y: number,
        angleDeg: number,
      ) => {
        const rad = (angleDeg * Math.PI) / 180;
        const tipX = x + len * Math.sin(rad);
        const tipY = y - len * Math.cos(rad);

        if (nodes.length === 0) {
          leaves.push({ x: tipX, y: tipY, angle: angleDeg });
          return;
        }

        branches.push({ x1: x, y1: y, x2: tipX, y2: tipY, len });
        for (const node of nodes) {
          collectGeometry(node.children, len * node.lengthRatio, tipX, tipY, angleDeg + node.angle);
        }
      };

      const computeBounds = (): Bounds => {
        const pad = 28;
        let minX = 0;
        let maxX = 0;
        let minY = 0;
        let maxY = 0;

        for (const branch of branches) {
          minX = Math.min(minX, branch.x1, branch.x2);
          maxX = Math.max(maxX, branch.x1, branch.x2);
          minY = Math.min(minY, branch.y1, branch.y2);
          maxY = Math.max(maxY, branch.y1, branch.y2);
        }
        for (const leaf of leaves) {
          minX = Math.min(minX, leaf.x - 12);
          maxX = Math.max(maxX, leaf.x + 12);
          minY = Math.min(minY, leaf.y - 12);
          maxY = Math.max(maxY, leaf.y + 12);
        }

        return {
          minX: minX - pad,
          maxX: maxX + pad,
          minY: minY - pad,
          maxY: maxY + pad,
        };
      };

      const buildCommitAssignment = () => {
        const total = leaves.length;
        const numCommits = sortedDays.length;
        commitLeafIndices = new Array(total).fill(-1);
        commitLeafByIndex = new Array(numCommits).fill(null);
        if (total === 0 || numCommits === 0) return;

        const used = new Set<number>();
        const step = total / numCommits;

        for (let c = 0; c < numCommits; c++) {
          let idx = Math.min(Math.round(c * step + step / 2), total - 1);
          while (used.has(idx) && idx < total - 1) idx += 1;
          while (used.has(idx) && idx > 0) idx -= 1;
          if (used.has(idx)) continue;
          used.add(idx);
          commitLeafIndices[idx] = c;
        }

        commitLeafHits = [];
        for (let i = 0; i < leaves.length; i++) {
          const commitIdx = commitLeafIndices[i];
          if (commitIdx === -1) continue;
          const leaf = leaves[i];
          const hit: LeafHit = {
            x: leaf.x,
            y: leaf.y,
            angle: leaf.angle,
            commit: sortedDays[commitIdx],
          };
          commitLeafHits.push(hit);
          commitLeafByIndex[commitIdx] = hit;
        }
      };

      const drawTreeBuffer = () => {
        const width = Math.max(2, Math.ceil(treeBounds.maxX - treeBounds.minX));
        const height = Math.max(2, Math.ceil(treeBounds.maxY - treeBounds.minY));
        treeBuffer = p.createGraphics(width, height);
        treeBuffer.clear();
        treeBuffer.angleMode(p.DEGREES);
        treeBuffer.push();
        treeBuffer.translate(-treeBounds.minX, -treeBounds.minY);

        for (const branch of branches) {
          treeBuffer.strokeWeight(p.map(branch.len, 10, 220, 1.2, 13, true));
          treeBuffer.stroke(bR, bG, bB);
          treeBuffer.line(branch.x1, branch.y1, branch.x2, branch.y2);
        }

        for (let i = 0; i < leaves.length; i++) {
          const leaf = leaves[i];
          const commitIdx = commitLeafIndices[i] ?? -1;
          const isCommitLeaf = commitIdx !== -1;

          treeBuffer.push();
          treeBuffer.translate(leaf.x, leaf.y);

          if (isCommitLeaf) {
            treeBuffer.noStroke();
            treeBuffer.fill(leafR, leafG + 40, 80, 35);
            treeBuffer.circle(0, 0, 30);
          }

          drawLeaf(
            treeBuffer,
            leaf.angle,
            isCommitLeaf ? 1.2 : 0.85,
            isCommitLeaf ? 100 : leafR,
            isCommitLeaf ? 210 : leafG,
            isCommitLeaf ? 80 : 55,
            isCommitLeaf ? 220 : 110,
          );

          if (isCommitLeaf) {
            treeBuffer.noStroke();
            treeBuffer.fill(160, 240, 120, 200);
            treeBuffer.circle(0, 0, 5);
          }

          treeBuffer.pop();
        }

        treeBuffer.pop();
      };

      const buildMinimapBuffer = () => {
        minimapBuffer = p.createGraphics(MINI_W, MINI_H);
        minimapBuffer.clear();

        const treeW = Math.max(1, treeBounds.maxX - treeBounds.minX);
        const treeH = Math.max(1, treeBounds.maxY - treeBounds.minY);
        miniScale = Math.min(
          (MINI_W - MINI_INNER_PAD * 2) / treeW,
          (MINI_H - MINI_INNER_PAD * 2) / treeH,
        );
        miniOffsetX = (MINI_W - treeW * miniScale) / 2 - treeBounds.minX * miniScale;
        miniOffsetY = (MINI_H - treeH * miniScale) / 2 - treeBounds.minY * miniScale;

        minimapBuffer.push();
        minimapBuffer.translate(miniOffsetX, miniOffsetY);
        minimapBuffer.scale(miniScale);
        minimapBuffer.stroke(90, 145, 80, 170);

        for (const branch of branches) {
          minimapBuffer.strokeWeight(p.map(branch.len, 10, 220, 0.5, 4, true));
          minimapBuffer.line(branch.x1, branch.y1, branch.x2, branch.y2);
        }

        minimapBuffer.noStroke();
        for (let i = 0; i < leaves.length; i++) {
          const leaf = leaves[i];
          const isCommitLeaf = (commitLeafIndices[i] ?? -1) !== -1;
          minimapBuffer.fill(isCommitLeaf ? 120 : 90, isCommitLeaf ? 190 : 145, isCommitLeaf ? 95 : 80, 180);
          minimapBuffer.circle(leaf.x, leaf.y, isCommitLeaf ? 7 : 5);
        }
        minimapBuffer.pop();
      };

      const rebuildCaches = () => {
        branches = [];
        leaves = [];
        collectGeometry(skeleton, baseLen, 0, 0, 0);
        treeBounds = computeBounds();
        buildCommitAssignment();
        drawTreeBuffer();
        buildMinimapBuffer();
      };

      const activeLeaf = (): LeafHit | null => {
        if (manualHover) return manualHover;
        return commitLeafByIndex[activeCommitIndex] ?? null;
      };

      const drawActiveLeafOverlay = (leaf: LeafHit) => {
        p.push();
        p.translate(leaf.x, leaf.y);
        p.noStroke();
        p.fill(leafR, leafG + 40, 80, 85);
        p.circle(0, 0, 34);
        drawLeaf(p, leaf.angle, 1.5, 180, 255, 120, 255);
        p.fill(220, 255, 180, 255);
        p.circle(0, 0, 7);
        p.pop();
      };

      const drawTooltip = (leaf: LeafHit) => {
        const s = worldToScreen(leaf.x, leaf.y);
        const { commit } = leaf;
        const boxW = 240;
        const pad = 10;
        const lineH = 16;

        const wrapLine = (text: string, maxWidth: number): string[] => {
          if (!text) return [""];
          const words = text.split(/\s+/);
          const wrapped: string[] = [];
          let current = "";

          for (const word of words) {
            const next = current ? `${current} ${word}` : word;
            if (p.textWidth(next) <= maxWidth) {
              current = next;
            } else {
              if (current) wrapped.push(current);
              current = word;
            }
          }

          if (current) wrapped.push(current);
          return wrapped.length ? wrapped : [""];
        };

        p.textSize(11);
        const lines = [
          `${commit.date} · ${commit.count} commit${commit.count > 1 ? "s" : ""}`,
          ...wrapLine(commit.message, boxW - pad * 2),
        ];
        const boxH = pad * 2 + lineH * lines.length;
        const goLeft = s.x > p.width / 2;
        const lineEndX = goLeft ? s.x - 30 : s.x + 30;
        const ty = p.constrain(s.y - boxH / 2, 4, p.height - boxH - 4);
        const tx = goLeft ? lineEndX - boxW : lineEndX;

        p.stroke(180, 255, 120, 160);
        p.strokeWeight(1.2);
        p.line(s.x, s.y, lineEndX, ty + boxH / 2);

        p.noStroke();
        p.fill(0, 20, 10, 220);
        p.rect(tx, ty, boxW, boxH, 6);

        p.noFill();
        p.stroke(120, 220, 100, 80);
        p.strokeWeight(1);
        p.rect(tx, ty, boxW, boxH, 6);

        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        lines.forEach((line, i) => {
          p.fill(i === 0 ? p.color(200, 255, 180) : p.color(150, 210, 140));
          p.text(line, tx + pad, ty + pad + i * lineH);
        });
      };

      const drawMinimap = () => {
        const mini = minimapRect();
        const mx = mini.x;
        const my = mini.y;

        p.noStroke();
        p.fill(0, 20, 10, 200);
        p.rect(mx, my, MINI_W, MINI_H, 6);

        if (minimapBuffer) p.image(minimapBuffer, mx, my);

        p.noFill();
        p.stroke(80, 140, 80, 120);
        p.strokeWeight(1);
        p.rect(mx, my, MINI_W, MINI_H, 6);

        const vis = viewportWorldRect();
        const rx = mx + vis.left * miniScale + miniOffsetX;
        const ry = my + vis.top * miniScale + miniOffsetY;
        const rw = (vis.right - vis.left) * miniScale;
        const rh = (vis.bottom - vis.top) * miniScale;

        p.noFill();
        p.stroke(180, 255, 120, 210);
        p.strokeWeight(1.2);
        p.rect(rx, ry, rw, rh, 2);
      };

      const drawZoomControls = () => {
        const buttons = zoomButtonsRect();
        const drawButton = (x: number, y: number, label: string) => {
          p.noStroke();
          p.fill(0, 20, 10, 210);
          p.rect(x, y, ZOOM_BTN_W, ZOOM_BTN_H, 4);
          p.noFill();
          p.stroke(120, 220, 100, 120);
          p.strokeWeight(1);
          p.rect(x, y, ZOOM_BTN_W, ZOOM_BTN_H, 4);
          p.noStroke();
          p.fill(255);
          p.textSize(15);
          p.textAlign(p.CENTER, p.CENTER);
          p.text(label, x + ZOOM_BTN_W / 2, y + ZOOM_BTN_H / 2 + 0.5);
        };

        drawButton(buttons.plus.x, buttons.plus.y, "+");
        drawButton(buttons.minus.x, buttons.minus.y, "-");
      };

      const drawCoordinates = () => {
        const worldCenterX = -camera.x / camera.zoom;
        const worldCenterY = -camera.y / camera.zoom - p.height / 2;
        p.noStroke();
        p.fill(255);
        p.textSize(12);
        p.textAlign(p.RIGHT, p.TOP);
        p.text(`x: ${worldCenterX.toFixed(1)}  y: ${worldCenterY.toFixed(1)}`, p.width - 12, 12);
      };

      const drawScene = () => {
        p.clear();
        p.background("#001818");

        p.push();
        p.translate(p.width / 2 + camera.x, p.height / 2 + camera.y);
        p.scale(camera.zoom);
        p.translate(0, p.height / 2);

        if (treeBuffer) {
          p.image(treeBuffer, treeBounds.minX, treeBounds.minY);
        }

        const active = activeLeaf();
        if (active) {
          drawActiveLeafOverlay(active);
        }
        p.pop();

        const tooltipLeaf = activeLeaf();
        if (tooltipLeaf) drawTooltip(tooltipLeaf);
        drawMinimap();
        drawZoomControls();
        drawCoordinates();
      };

      p.setup = () => {
        if (!sketchRef.current) return;
        p.createCanvas(sketchRef.current.offsetWidth, sketchRef.current.offsetHeight);
        p.angleMode(p.DEGREES);
        rebuildCaches();

        if (!loadedRef.current && onLoad) {
          loadedRef.current = true;
          onLoad();
        }

        p.noLoop();
        requestRedraw();

        cycleTimer = setInterval(() => {
          if (isCyclingPaused || sortedDays.length === 0) return;
          activeCommitIndex = (activeCommitIndex + 1) % sortedDays.length;
          requestRedraw();
        }, CYCLE_MS);
      };

      p.draw = () => {
        drawScene();
      };

      p.windowResized = () => {
        if (!sketchRef.current) return;
        p.resizeCanvas(sketchRef.current.offsetWidth, sketchRef.current.offsetHeight);
        rebuildCaches();
        requestRedraw();
      };

      // @ts-ignore
      p.mouseWheel = (event: WheelEvent) => {
        if (p.mouseX < 0 || p.mouseX > p.width || p.mouseY < 0 || p.mouseY > p.height) return;
        applyZoomAtScreenPoint(event.deltaY < 0 ? 1.1 : 0.9, p.mouseX, p.mouseY);
        requestRedraw();
        return false;
      };

      p.mousePressed = () => {
        const buttons = zoomButtonsRect();
        const insidePlus =
          p.mouseX > buttons.plus.x &&
          p.mouseX < buttons.plus.x + buttons.plus.w &&
          p.mouseY > buttons.plus.y &&
          p.mouseY < buttons.plus.y + buttons.plus.h;
        const insideMinus =
          p.mouseX > buttons.minus.x &&
          p.mouseX < buttons.minus.x + buttons.minus.w &&
          p.mouseY > buttons.minus.y &&
          p.mouseY < buttons.minus.y + buttons.minus.h;

        if (insidePlus || insideMinus) {
          applyZoomAtScreenPoint(insidePlus ? 1.1 : 0.9, p.width / 2, p.height / 2);
          requestRedraw();
          return;
        }

        const mini = minimapRect();
        if (
          p.mouseX > mini.x &&
          p.mouseX < mini.x + mini.w &&
          p.mouseY > mini.y &&
          p.mouseY < mini.y + mini.h
        ) {
          return;
        }

        isDragging = true;
        dragStart = { x: p.mouseX, y: p.mouseY };
        cameraAtDrag = { x: camera.x, y: camera.y };
      };

      p.mouseReleased = () => {
        isDragging = false;
      };

      p.mouseDragged = () => {
        if (!isDragging) return;
        camera.x = cameraAtDrag.x + (p.mouseX - dragStart.x);
        camera.y = cameraAtDrag.y + (p.mouseY - dragStart.y);
        requestRedraw();
      };

      p.mouseMoved = () => {
        let found: LeafHit | null = null;
        for (const hit of commitLeafHits) {
          const s = worldToScreen(hit.x, hit.y);
          if (p.dist(p.mouseX, p.mouseY, s.x, s.y) < 18) {
            found = hit;
            break;
          }
        }

        const changed =
          (manualHover === null && found !== null) ||
          (manualHover !== null && found === null) ||
          (manualHover !== null && found !== null && manualHover.commit.date !== found.commit.date);

        if (found) {
          if (resumeTimer) {
            clearTimeout(resumeTimer);
            resumeTimer = null;
          }
          manualHover = found;
          isCyclingPaused = true;
        } else if (isCyclingPaused && !resumeTimer) {
          resumeTimer = setTimeout(() => {
            manualHover = null;
            isCyclingPaused = false;
            resumeTimer = null;
            requestRedraw();
          }, 2000);
        }

        if (changed) requestRedraw();
      };

      p.mouseClicked = () => {
        for (const hit of commitLeafHits) {
          const s = worldToScreen(hit.x, hit.y);
          if (p.dist(p.mouseX, p.mouseY, s.x, s.y) < 18) {
            window.open(hit.commit.url, "_blank");
            break;
          }
        }
      };
    };

    if (sketchRef.current) {
      p5Instance = new p5(sketch, sketchRef.current);
    }

    return () => {
      p5Instance?.remove();
      p5Instance = null;
      loadedRef.current = false;
      if (resumeTimer) clearTimeout(resumeTimer);
      if (cycleTimer) clearInterval(cycleTimer);
    };
  }, [skeleton, activityScore, streak, daysWithCommits, commitDays, onLoad]);

  return (
    <Box
      ref={sketchRef}
      w="100%"
      h="100%"
      position="absolute"
      top={0}
      left={0}
      overflow="hidden"
    />
  );
}
