"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import { NowPopover } from "./now-popover";

export type PathLink = {
  from: number;
  to: number;
  /** done: both weeks reached · current: this week → next (fills by days) · future: locked */
  kind: "done" | "current" | "future";
  /** current only: share of the week gone (0–1). */
  fraction?: number;
};

type Pt = { x: number; y: number };
type Curve = { link: PathLink; p0: Pt; p1: Pt; p2: Pt; p3: Pt; side: 1 | -1 };

/** Point on a cubic Bézier at t. */
function bezier(c: Curve, t: number): Pt {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const d = 3 * u * t * t;
  const e = t * t * t;
  return {
    x: a * c.p0.x + b * c.p1.x + d * c.p2.x + e * c.p3.x,
    y: a * c.p0.y + b * c.p1.y + d * c.p2.y + e * c.p3.y,
  };
}

const pathOf = (c: Curve) =>
  `M ${c.p0.x} ${c.p0.y} C ${c.p1.x} ${c.p1.y}, ${c.p2.x} ${c.p2.y}, ${c.p3.x} ${c.p3.y}`;

/**
 * Curved dashed links between the week nodes (elements marked `data-path-node` inside the same
 * positioned parent). Each link leaves the lower-outer side of a node, bows outwards around its
 * date label and enters the next node, like a game map path.
 */
export function PathLinks({ links }: { links: PathLink[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const maskId = useId();
  const [state, setState] = useState<{ w: number; h: number; curves: Curve[] } | null>(null);

  useLayoutEffect(() => {
    const host = ref.current?.parentElement;
    if (!host) return;
    const measure = () => {
      const box = host.getBoundingClientRect();
      const centers = [...host.querySelectorAll<HTMLElement>("[data-path-node]")].map((n) => {
        const r = n.getBoundingClientRect();
        return {
          x: r.left - box.left + r.width / 2,
          y: r.top - box.top + r.height / 2,
          r: r.width / 2,
        };
      });
      const curves: Curve[] = [];
      for (const link of links) {
        const a = centers[link.from];
        const b = centers[link.to];
        if (!a || !b) continue;
        // Bow out on the side the path is coming from, so the line clears the date label.
        const side: 1 | -1 = b.x <= a.x ? 1 : -1;
        // Leave at about 4–5 o'clock (mirrored when bowing left) so the line passes beside the label.
        const p0 = { x: a.x + side * (a.r + 2) * 0.82, y: a.y + (a.r + 2) * 0.57 };
        const p3 = { x: b.x + side * b.r * 0.72, y: b.y - b.r * 0.72 };
        const dy = p3.y - p0.y;
        const out = side * 34;
        curves.push({
          link,
          side,
          p0,
          p1: { x: p0.x + out, y: p0.y + dy * 0.25 },
          p2: { x: p3.x + out, y: p3.y - dy * 0.3 },
          p3,
        });
      }
      setState({ w: box.width, h: box.height, curves });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, [links]);

  const current = state?.curves.find((c) => c.link.kind === "current");
  const head = current
    ? bezier(current, Math.min(1, Math.max(0, current.link.fraction ?? 0)))
    : null;

  return (
    <>
      <svg
        ref={ref}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-visible"
        width={state?.w ?? 0}
        height={state?.h ?? 0}
      >
        {state?.curves.map((c, i) => {
          const d = pathOf(c);
          const dash = {
            strokeDasharray: "12 11",
            strokeLinecap: "round" as const,
            strokeWidth: 6,
          };
          if (c.link.kind === "done") {
            return <path key={i} d={d} fill="none" stroke="var(--grass)" {...dash} />;
          }
          if (c.link.kind === "future") {
            return (
              <path
                key={i}
                d={d}
                fill="none"
                stroke="color-mix(in oklch, var(--muted-foreground), transparent 60%)"
                {...dash}
              />
            );
          }
          const pct = Math.round(Math.min(1, Math.max(0, c.link.fraction ?? 0)) * 100);
          return (
            <g key={i}>
              <mask id={`${maskId}-m`} maskUnits="userSpaceOnUse">
                <path
                  d={d}
                  fill="none"
                  stroke="white"
                  strokeWidth={12}
                  pathLength={100}
                  strokeDasharray={`${pct} 100`}
                />
              </mask>
              <path
                d={d}
                fill="none"
                stroke="color-mix(in oklch, var(--muted-foreground), transparent 60%)"
                {...dash}
              />
              <path d={d} fill="none" stroke="var(--grass)" mask={`url(#${maskId}-m)`} {...dash} />
            </g>
          );
        })}
        {head ? (
          <circle
            cx={head.x}
            cy={head.y}
            r={8}
            fill="var(--grass)"
            stroke="var(--background)"
            strokeWidth={3}
          />
        ) : null}
      </svg>
      {head && state ? <NowPopover x={head.x} y={head.y} width={state.w} /> : null}
    </>
  );
}
