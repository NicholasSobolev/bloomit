import { useEffect, useRef } from "react";
import p5 from "p5";
import { Box } from "@chakra-ui/react";

export default function Tree() {
  const sketchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let p5Instance: p5 | null = null;

    const sketch = (p: p5) => {
      let currentLen = 0;
      const maxLen = 200;
      const growthSpeed = 2;
      let leavesReady = false;
      let leafGraphics: p5.Graphics | null = null;

      const sidebarLeft = 24;
      const sidebarWidth = 250;
      const centerShift = (sidebarLeft + sidebarWidth) / 2;

      const drawTree = (
        ctx: any,
        len: number,
        drawBranches: boolean,
        drawLeaves: boolean,
      ) => {
        ctx.push();
        if (len > 10) {
          if (drawBranches) {
            ctx.stroke(255);
            ctx.strokeWeight(ctx.map(len, 10, maxLen, 1, 8));
            ctx.line(0, 0, 0, -len);
          }
          ctx.translate(0, -len);

          ctx.push();
          ctx.rotate(30);
          drawTree(ctx, len * 0.7, drawBranches, drawLeaves);
          ctx.pop();

          ctx.push();
          ctx.rotate(-30);
          drawTree(ctx, len * 0.7, drawBranches, drawLeaves);
          ctx.pop();
        } else if (drawLeaves) {
          const g = 170 + Math.random() * 60;
          const b = 200 + Math.random() * 40;
          const size = 6 + Math.random() * 8;
          ctx.noStroke();
          ctx.fill(255, g, b);
          ctx.ellipse(0, 0, size, size);
        }
        ctx.pop();
      };

      const generateLeafGraphics = () => {
        if (leafGraphics) leafGraphics.remove?.();
        leafGraphics = p.createGraphics(p.width, p.height);
        leafGraphics.angleMode(p.DEGREES);
        leafGraphics.clear();
        leafGraphics.push();

        leafGraphics.translate(p.width / 2 + centerShift, p.height);
        drawTree(leafGraphics, maxLen, false, true);
        leafGraphics.pop();
      };

      p.setup = () => {
        if (!sketchRef.current) return;
        p.createCanvas(
          sketchRef.current.offsetWidth,
          sketchRef.current.offsetHeight,
        );
        Object.assign((p as any).canvas.style, {
          pointerEvents: "none",
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: "0",
        });
        p.angleMode(p.DEGREES);
        p.noFill();
      };

      p.draw = () => {
        p.clear();

        if (currentLen < maxLen) {
          currentLen += growthSpeed;
        } else if (!leavesReady) {
          leavesReady = true;
          setTimeout(() => {
            generateLeafGraphics();
            p.loop();
          }, 700);
          p.noLoop();
        }

        // draw branches
        p.push();
        p.translate(p.width / 2 + centerShift, p.height);
        drawTree(p, currentLen, true, false);
        p.pop();

        // draw blossoms
        if (leavesReady && leafGraphics) {
          p.image(leafGraphics, 0, 0);
          p.noLoop();
        }
      };

      p.windowResized = () => {
        if (!sketchRef.current) return;
        p.resizeCanvas(
          sketchRef.current.offsetWidth,
          sketchRef.current.offsetHeight,
        );
        if (leavesReady) {
          generateLeafGraphics();
          p.loop();
        }
      };
    };

    if (sketchRef.current && !p5Instance) {
      p5Instance = new p5(sketch, sketchRef.current);
    }

    return () => {
      if (p5Instance) {
        p5Instance.remove();
        p5Instance = null;
      }
    };
  }, []);

  return <Box ref={sketchRef} w="100%" h="100%" />;
}
