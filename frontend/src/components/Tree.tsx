import { useEffect, useMemo, useRef, useState } from "react";
import p5 from "p5";
import { Box } from "@chakra-ui/react";
import type { CommitDay } from "../hooks/useCommitData";
import CommitDetailsModal from "./tree/CommitDetailsModal";
import SortModeToggle from "./tree/SortModeToggle";
import { buildDisplayCommitGroups, getSelectedCommitDetails, sortCommitGroupsForSketch } from "./tree/commitUtils";
import { drawLeaf, generateSkeleton, hashString, mulberry32 } from "./tree/sketchUtils";
import type { Activity, Bounds, BranchNode, BranchSegment, LeafHit, LeafNode } from "./tree/types";

export default function Tree({
  userId,
  totalCommits,
  mergedPRs,
  streak,
  maxStreak,
  daysWithCommits,
  previousPeriodCommits,
  growthVelocityPct,
  commitDays,
  onLoad,
}: Activity) {
  const sketchRef = useRef<HTMLDivElement | null>(null);
  const loadedRef = useRef(false);
  const [selectedCommitDay, setSelectedCommitDay] = useState<CommitDay | null>(null);
  const [commitSortMode, setCommitSortMode] = useState<"date" | "repository">("date");

  const skeleton = useMemo(() => {
    const seed = hashString(userId);
    const rng = mulberry32(seed);
    return generateSkeleton(rng, 200, 10);
  }, [userId]);

  const activityScore = totalCommits + mergedPRs;

  const displayCommitGroups = useMemo<CommitDay[]>(
    () => buildDisplayCommitGroups(commitDays, commitSortMode),
    [commitDays, commitSortMode],
  );

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

      const sortedDays = sortCommitGroupsForSketch(displayCommitGroups, commitSortMode);

      const CYCLE_MS = 3000;
      const MINI_W = 160;
      const MINI_H = 120;
      const MINI_PAD = 12;
      const MINI_INNER_PAD = 6;
      const ZOOM_BTN_W = 28;
      const ZOOM_BTN_H = 24;
      const ZOOM_BTN_GAP = 6;
      const ZOOM_BTN_OFFSET = 8;
      const RESET_BTN_W = 56;
      const SCROLLER_W = 16;
      const SCROLLER_GAP = 8;
      const SCROLLER_HANDLE_H = 16;
      const MIN_ZOOM = 1;
      const MAX_ZOOM = 5;
      const LEAF_HOVER_RADIUS = 20;
      const LEAF_CLICK_RADIUS = 28;

      const UI_BG = "rgba(3, 10, 10, 0.86)";
      const UI_BG_SOFT = "rgba(3, 10, 10, 0.78)";
      const UI_BORDER = "rgba(112, 142, 136, 0.55)";
      const UI_ACCENT = "rgba(178, 214, 207, 0.86)";
      const UI_TEXT = "#eaf4f2";
      const UI_TEXT_MUTED = "#b4cec9";

      let camera = { x: 0, y: 0, zoom: 1 };
      let isDragging = false;
      let isScrollerDragging = false;
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
      let tooltipCtaHitbox: { x: number; y: number; w: number; h: number; commit: CommitDay } | null = null;
      let tooltipCtaHovered = false;

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

      const resetView = () => {
        camera.x = 0;
        camera.y = 0;
        camera.zoom = MIN_ZOOM;
      };

      const setZoomAtScreenPoint = (targetZoom: number, screenX: number, screenY: number) => {
        const newZoom = p.constrain(targetZoom, MIN_ZOOM, MAX_ZOOM);
        const wx = (screenX - p.width / 2 - camera.x) / camera.zoom;
        const wy = (screenY - p.height / 2 - camera.y) / camera.zoom;
        camera.x = screenX - p.width / 2 - wx * newZoom;
        camera.y = screenY - p.height / 2 - wy * newZoom;
        camera.zoom = newZoom;
      };

      const applyZoomAtScreenPoint = (zoomFactor: number, screenX: number, screenY: number) => {
        setZoomAtScreenPoint(camera.zoom * zoomFactor, screenX, screenY);
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
        const resetX = plusX - RESET_BTN_W - ZOOM_BTN_GAP;
        return {
          reset: { x: resetX, y, w: RESET_BTN_W, h: ZOOM_BTN_H },
          plus: { x: plusX, y, w: ZOOM_BTN_W, h: ZOOM_BTN_H },
          minus: { x: minusX, y, w: ZOOM_BTN_W, h: ZOOM_BTN_H },
        };
      };

      const zoomScrollerRect = () => {
        const mini = minimapRect();
        return {
          x: mini.x - SCROLLER_W - SCROLLER_GAP,
          y: mini.y,
          w: SCROLLER_W,
          h: MINI_H,
        };
      };

      const zoomToScrollerRatio = () => (camera.zoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM);

      const scrollerHandleY = (scroller: { y: number; h: number }) => {
        const travel = Math.max(1, scroller.h - SCROLLER_HANDLE_H);
        const ratio = p.constrain(zoomToScrollerRatio(), 0, 1);
        return scroller.y + (1 - ratio) * travel;
      };

      const setZoomFromScroller = (screenY: number) => {
        const scroller = zoomScrollerRect();
        const clampedY = p.constrain(screenY, scroller.y, scroller.y + scroller.h);
        const ratio = 1 - (clampedY - scroller.y) / scroller.h;
        const targetZoom = p.lerp(MIN_ZOOM, MAX_ZOOM, ratio);
        setZoomAtScreenPoint(targetZoom, p.width / 2, p.height / 2);
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

        const drawLeafAtIndex = (i: number) => {
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
        };

        for (let i = 0; i < leaves.length; i++) {
          if ((commitLeafIndices[i] ?? -1) !== -1) continue;
          drawLeafAtIndex(i);
        }

        for (let i = 0; i < leaves.length; i++) {
          if ((commitLeafIndices[i] ?? -1) === -1) continue;
          drawLeafAtIndex(i);
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
          if (isCommitLeaf) continue;
          minimapBuffer.fill(90, 145, 80, 180);
          minimapBuffer.circle(leaf.x, leaf.y, 5);
        }

        for (let i = 0; i < leaves.length; i++) {
          const leaf = leaves[i];
          const isCommitLeaf = (commitLeafIndices[i] ?? -1) !== -1;
          if (!isCommitLeaf) continue;
          minimapBuffer.fill(120, 190, 95, 200);
          minimapBuffer.circle(leaf.x, leaf.y, 7);
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
        const boxW = Math.max(220, Math.min(300, p.width - 16));
        const pad = 10;
        const lineH = 20;
        const ctaGap = 12;
        const ctaLineH = 16;

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

        p.textSize(14);
        const previewMessage = commit.commits?.[0]?.message || commit.message;
        const headerLine = `${commit.date} · ${commit.count} commit${commit.count > 1 ? "s" : ""}`;
        const wrappedMessageLines = wrapLine(previewMessage, boxW - pad * 2);
        const ctaLine = commit.count > 1 ? "Click to view all commits" : "Click to view commit details";
        const maxBoxH = Math.max(120, p.height - 16);
        const maxMessageLines = Math.max(1, Math.floor((maxBoxH - pad * 2 - lineH - ctaGap - ctaLineH) / lineH));
        const messageLines = wrappedMessageLines.slice(0, maxMessageLines);

        if (wrappedMessageLines.length > maxMessageLines) {
          const lastIndex = messageLines.length - 1;
          const ellipsis = "...";
          let lastLine = messageLines[lastIndex] ?? "";
          while (lastLine.length > 0 && p.textWidth(`${lastLine}${ellipsis}`) > boxW - pad * 2) {
            lastLine = lastLine.slice(0, -1);
          }
          messageLines[lastIndex] = `${lastLine}${ellipsis}`;
        }

        const boxH = pad * 2 + lineH * (1 + messageLines.length) + ctaGap + ctaLineH;
        const goLeft = s.x > p.width / 2;
        const lineEndX = goLeft ? s.x - 30 : s.x + 30;
        const ty = p.constrain(s.y - boxH / 2, 4, p.height - boxH - 4);
        const preferredTx = goLeft ? lineEndX - boxW : lineEndX;
        const tx = p.constrain(preferredTx, 8, p.width - boxW - 8);

        p.stroke(UI_ACCENT);
        p.strokeWeight(1.2);
        p.line(s.x, s.y, lineEndX, ty + boxH / 2);

        p.noStroke();
        p.fill(UI_BG);
        p.rect(tx, ty, boxW, boxH, 6);

        p.noFill();
        p.stroke(UI_BORDER);
        p.strokeWeight(1);
        p.rect(tx, ty, boxW, boxH, 6);

        p.noStroke();
        p.textAlign(p.LEFT, p.TOP);
        p.fill(UI_TEXT);
        p.text(headerLine, tx + pad, ty + pad);

        p.fill(UI_TEXT_MUTED);
        messageLines.forEach((line, i) => {
          p.text(line, tx + pad, ty + pad + lineH * (i + 1));
        });

        const ctaY = ty + boxH - pad - ctaLineH;
        p.stroke("rgba(112, 142, 136, 0.6)");
        p.strokeWeight(1);
        p.line(tx + pad, ctaY - ctaGap, tx + boxW - pad, ctaY - ctaGap);

        p.noStroke();
        p.textSize(12);
        const ctaTextW = p.textWidth(ctaLine);
        const ctaX = tx + pad;
        const ctaHoveredNow =
          p.mouseX >= ctaX &&
          p.mouseX <= ctaX + ctaTextW &&
          p.mouseY >= ctaY &&
          p.mouseY <= ctaY + ctaLineH;
        p.fill(ctaHoveredNow ? UI_TEXT : UI_ACCENT);
        p.text(ctaLine, ctaX, ctaY);

        if (ctaHoveredNow) {
          p.stroke("rgba(234, 244, 242, 0.5)");
          p.strokeWeight(1);
          p.line(ctaX, ctaY + ctaLineH - 3, ctaX + ctaTextW, ctaY + ctaLineH - 3);
          p.noStroke();
        }

        tooltipCtaHitbox = {
          x: ctaX,
          y: ctaY,
          w: ctaTextW,
          h: ctaLineH,
          commit,
        };
        tooltipCtaHovered = ctaHoveredNow;
      };

      const openCommitDetailsWindow = (commitDay: CommitDay) => {
        setSelectedCommitDay(commitDay);
      };

      const drawMinimap = () => {
        const mini = minimapRect();
        const mx = mini.x;
        const my = mini.y;

        p.noStroke();
        p.fill(UI_BG_SOFT);
        p.rect(mx, my, MINI_W, MINI_H, 6);

        if (minimapBuffer) p.image(minimapBuffer, mx, my);

        p.noFill();
        p.stroke(UI_BORDER);
        p.strokeWeight(1);
        p.rect(mx, my, MINI_W, MINI_H, 6);

        const vis = viewportWorldRect();
        const rx = mx + vis.left * miniScale + miniOffsetX;
        const ry = my + vis.top * miniScale + miniOffsetY;
        const rw = (vis.right - vis.left) * miniScale;
        const rh = (vis.bottom - vis.top) * miniScale;

        p.noFill();
        p.stroke(UI_ACCENT);
        p.strokeWeight(1.2);
        p.rect(rx, ry, rw, rh, 2);
      };

      const drawZoomControls = () => {
        const buttons = zoomButtonsRect();
        const scroller = zoomScrollerRect();
        const drawButton = (x: number, y: number, w: number, h: number, label: string) => {
          p.noStroke();
          p.fill(UI_BG);
          p.rect(x, y, w, h, 4);
          p.noFill();
          p.stroke(UI_BORDER);
          p.strokeWeight(1);
          p.rect(x, y, w, h, 4);
          p.noStroke();
          p.fill(UI_TEXT);
          p.textSize(label.length > 1 ? 11 : 15);
          p.textAlign(p.CENTER, p.CENTER);
          p.text(label, x + w / 2, y + h / 2 + 0.5);
        };

        drawButton(buttons.reset.x, buttons.reset.y, buttons.reset.w, buttons.reset.h, "reset");
        drawButton(buttons.plus.x, buttons.plus.y, buttons.plus.w, buttons.plus.h, "+");
        drawButton(buttons.minus.x, buttons.minus.y, buttons.minus.w, buttons.minus.h, "-");

        p.noStroke();
        p.fill(UI_BG);
        p.rect(scroller.x, scroller.y, scroller.w, scroller.h, 6);

        p.noFill();
        p.stroke(UI_BORDER);
        p.strokeWeight(1);
        p.rect(scroller.x, scroller.y, scroller.w, scroller.h, 6);

        const handleY = scrollerHandleY(scroller);
        p.noStroke();
        p.fill(UI_ACCENT);
        p.rect(scroller.x + 2, handleY, scroller.w - 4, SCROLLER_HANDLE_H, 4);
      };

      const drawCoordinates = () => {
        const worldCenterX = -camera.x / camera.zoom;
        const worldCenterY = -camera.y / camera.zoom - p.height / 2;
        const buttons = zoomButtonsRect();
        p.noStroke();
        p.fill(UI_TEXT_MUTED);
        p.textSize(12);
        p.textAlign(p.RIGHT, p.BOTTOM);
        p.text(
          `x: ${worldCenterX.toFixed(1)}  y: ${worldCenterY.toFixed(1)}`,
          buttons.minus.x + buttons.minus.w,
          buttons.plus.y - 8,
        );
      };

      const drawStatsPanel = () => {
        const growthSign = growthVelocityPct >= 0 ? "+" : "";
        const velocityValue = `${growthSign}${growthVelocityPct.toFixed(1)}%`;
        const panelRightX = p.width - 12;
        const labelX = panelRightX - 190;
        const panelY = 12;
        const lineH = 16;
        const rows: Array<{ label: string; value: string; color?: string }> = [
          { label: "Streak", value: `${streak}` },
          { label: "Max Streak", value: `${maxStreak}` },
          { label: "Days with Commits", value: `${daysWithCommits}` },
          { label: "Merged Pull Requests", value: `${mergedPRs}` },
          { label: "Number of Commits", value: `${totalCommits}` },
          {
            label: "Velocity vs last month",
            value: velocityValue,
            color: growthVelocityPct >= 0 ? "#8ee8a7" : "#f3a1a1",
          },
        ];

        p.noStroke();
        p.textSize(12);
        rows.forEach((row, i) => {
          const y = panelY + i * lineH;
          p.fill(UI_TEXT_MUTED);
          p.textAlign(p.LEFT, p.TOP);
          p.text(`${row.label}:`, labelX, y);
          p.fill(row.color || UI_TEXT);
          p.textAlign(p.RIGHT, p.TOP);
          p.text(row.value, panelRightX, y);
        });
      };

      const drawBackgroundGrid = () => {
        const vis = viewportWorldRect();
        const minPxGap = 26;
        const maxPxGap = 82;
        let step = 20;

        while (step * camera.zoom < minPxGap) step *= 2;
        while (step * camera.zoom > maxPxGap && step > 2.5) step /= 2;

        const majorEvery = 5;
        const majorStep = step * majorEvery;
        const startX = Math.floor(vis.left / step) * step;
        const endX = Math.ceil(vis.right / step) * step;
        const startY = Math.floor(vis.top / step) * step;
        const endY = Math.ceil(vis.bottom / step) * step;

        p.strokeWeight(1 / camera.zoom);

        for (let x = startX; x <= endX; x += step) {
          const isMajor = Math.abs(x % majorStep) < 0.0001;
          p.stroke(isMajor ? "rgba(178, 214, 207, 0.12)" : "rgba(178, 214, 207, 0.06)");
          p.line(x, startY, x, endY);
        }

        for (let y = startY; y <= endY; y += step) {
          const isMajor = Math.abs(y % majorStep) < 0.0001;
          p.stroke(isMajor ? "rgba(178, 214, 207, 0.12)" : "rgba(178, 214, 207, 0.06)");
          p.line(startX, y, endX, y);
        }
      };

      const drawScene = () => {
        p.clear();
        p.background("#022222");
        tooltipCtaHitbox = null;
        tooltipCtaHovered = false;

        p.push();
        p.translate(p.width / 2 + camera.x, p.height / 2 + camera.y);
        p.scale(camera.zoom);
        p.translate(0, p.height / 2);

        drawBackgroundGrid();

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
        drawStatsPanel();
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
        if (
          tooltipCtaHitbox &&
          p.mouseX >= tooltipCtaHitbox.x &&
          p.mouseX <= tooltipCtaHitbox.x + tooltipCtaHitbox.w &&
          p.mouseY >= tooltipCtaHitbox.y &&
          p.mouseY <= tooltipCtaHitbox.y + tooltipCtaHitbox.h
        ) {
          openCommitDetailsWindow(tooltipCtaHitbox.commit);
          requestRedraw();
          return;
        }

        const buttons = zoomButtonsRect();
        const scroller = zoomScrollerRect();
        const insideReset =
          p.mouseX > buttons.reset.x &&
          p.mouseX < buttons.reset.x + buttons.reset.w &&
          p.mouseY > buttons.reset.y &&
          p.mouseY < buttons.reset.y + buttons.reset.h;
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

        if (insideReset || insidePlus || insideMinus) {
          if (insideReset) {
            resetView();
          } else {
            applyZoomAtScreenPoint(insidePlus ? 1.1 : 0.9, p.width / 2, p.height / 2);
          }
          requestRedraw();
          return;
        }

        if (
          p.mouseX > scroller.x &&
          p.mouseX < scroller.x + scroller.w &&
          p.mouseY > scroller.y &&
          p.mouseY < scroller.y + scroller.h
        ) {
          isScrollerDragging = true;
          setZoomFromScroller(p.mouseY);
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
        isScrollerDragging = false;
      };

      p.mouseDragged = () => {
        if (isScrollerDragging) {
          setZoomFromScroller(p.mouseY);
          requestRedraw();
          return;
        }

        if (!isDragging) return;
        camera.x = cameraAtDrag.x + (p.mouseX - dragStart.x);
        camera.y = cameraAtDrag.y + (p.mouseY - dragStart.y);
        requestRedraw();
      };

      p.mouseMoved = () => {
        let found: LeafHit | null = null;
        for (const hit of commitLeafHits) {
          const s = worldToScreen(hit.x, hit.y);
          if (p.dist(p.mouseX, p.mouseY, s.x, s.y) < LEAF_HOVER_RADIUS) {
            found = hit;
            break;
          }
        }

        const changed =
          (manualHover === null && found !== null) ||
          (manualHover !== null && found === null) ||
          (manualHover !== null && found !== null && manualHover.commit.date !== found.commit.date);

        const ctaHoveredNow =
          !!tooltipCtaHitbox &&
          p.mouseX >= tooltipCtaHitbox.x &&
          p.mouseX <= tooltipCtaHitbox.x + tooltipCtaHitbox.w &&
          p.mouseY >= tooltipCtaHitbox.y &&
          p.mouseY <= tooltipCtaHitbox.y + tooltipCtaHitbox.h;
        const ctaHoverChanged = ctaHoveredNow !== tooltipCtaHovered;
        tooltipCtaHovered = ctaHoveredNow;

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

        if (changed || ctaHoverChanged) requestRedraw();

        if (ctaHoveredNow) {
          p.cursor(p.HAND);
        } else {
          p.cursor(p.ARROW);
        }
      };

      p.mouseClicked = () => {
        for (const hit of commitLeafHits) {
          const s = worldToScreen(hit.x, hit.y);
          if (p.dist(p.mouseX, p.mouseY, s.x, s.y) < LEAF_CLICK_RADIUS) {
            openCommitDetailsWindow(hit.commit);
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
  }, [
    skeleton,
    activityScore,
    streak,
    daysWithCommits,
    displayCommitGroups,
    commitSortMode,
    growthVelocityPct,
    previousPeriodCommits,
    totalCommits,
    onLoad,
  ]);

  const selectedCommitDetails = getSelectedCommitDetails(selectedCommitDay);

  return (
    <>
      <Box
        key={commitSortMode}
        ref={sketchRef}
        w="100%"
        h="100%"
        position="absolute"
        top={0}
        left={0}
        overflow="hidden"
      />

      <SortModeToggle
        commitSortMode={commitSortMode}
        onChange={(mode) => {
          setSelectedCommitDay(null);
          setCommitSortMode(mode);
        }}
      />

      <CommitDetailsModal
        selectedCommitDay={selectedCommitDay}
        selectedCommitDetails={selectedCommitDetails}
        onClose={() => setSelectedCommitDay(null)}
      />
    </>
  );
}
