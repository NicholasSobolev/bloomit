import { useEffect, useRef } from "react";
import p5 from "p5";
import { Box } from "@chakra-ui/react";

interface Activity {
  totalCommits: number;
  mergedPRs: number;
  streak: number;
  maxStreak: number;
  daysWithCommits: number;
  onLoad?: () => void;
}

export default function Tree({
  totalCommits,
  mergedPRs,
  streak,
  maxStreak,
  daysWithCommits,
  onLoad,
}: Activity) {
  const sketchRef = useRef<HTMLDivElement | null>(null);
  const loadedRef = useRef(false); // ensure onLoad is called only once

  useEffect(() => {
    let p5Instance: p5 | null = null;

    const sketch = (p: p5) => {
      const activityScore = totalCommits + mergedPRs;
      const baseLen = p.map(activityScore, 0, 200, 80, 200, true);
      const branchColor = streak > 10 ? [120, 80, 40] : [80, 50, 30];
      const leafBaseColor = p.map(daysWithCommits, 0, 30, 80, 200, true);

      const branch = (len: number) => {
        if (len > 10) {
          p.strokeWeight(p.map(len, 10, 100, 1, 15));
          p.stroke(branchColor[0], branchColor[1], branchColor[2]);
          p.line(0, 0, 0, -len);
          p.translate(0, -len);

          // left branch
          p.push();
          p.rotate(p.random(-30, -20));
          branch(len * p.random(0.7, 0.9));
          p.pop();

          // right branch
          p.push();
          p.rotate(p.random(20, 30));
          branch(len * p.random(0.7, 0.9));
          p.pop();
        } else {
          // leaf
          const r = 50 + p.random(-20, 20);
          const g = leafBaseColor + p.random(-30, 30);
          const b = 50 + p.random(-20, 20);
          p.fill(r, g, b);
          p.noStroke();

          p.beginShape();
          for (let i = 45; i < 135; i++) {
            const rad = 15;
            p.vertex(rad * p.cos(i), rad * p.sin(i));
          }
          for (let i = 135; i > 40; i--) {
            const rad = 15;
            p.vertex(rad * p.cos(i), rad * p.sin(-i));
          }
          p.endShape(p.CLOSE);
        }
      };

      const drawTree = () => {
        p.clear();
        p.background("#002222");
        p.translate(p.width / 2, p.height);
        branch(baseLen);
      };

      p.setup = () => {
        if (!sketchRef.current) return;
        p.createCanvas(
          sketchRef.current.offsetWidth,
          sketchRef.current.offsetHeight,
        );
        p.angleMode(p.DEGREES);

        // ✅ Call onLoad immediately after canvas is ready
        if (!loadedRef.current && onLoad) {
          loadedRef.current = true;
          onLoad();
        }

        drawTree();
        p.noLoop();
      };

      p.windowResized = () => {
        if (!sketchRef.current) return;
        p.resizeCanvas(
          sketchRef.current.offsetWidth,
          sketchRef.current.offsetHeight,
        );
        drawTree();
      };
    };

    if (sketchRef.current && !p5Instance) {
      p5Instance = new p5(sketch, sketchRef.current);
    }

    return () => {
      p5Instance?.remove();
      p5Instance = null;
      loadedRef.current = false;
    };
  }, [totalCommits, mergedPRs, streak, maxStreak, daysWithCommits, onLoad]);

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
