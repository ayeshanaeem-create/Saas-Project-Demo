import { Caveat } from "next/font/google";
import type { CSSProperties } from "react";

import { cn } from "@/lib/utils";

// Handwriting font for the callouts. Loaded here rather than in the root layout, so only pages
// that show callouts download it.
const caveat = Caveat({ subsets: ["latin"] });

type Point = { x: number; y: number };
/** A cubic Bézier: start, two control points, end. */
type Cubic = [Point, Point, Point, Point];

export type AnnotationProps = {
  /** The handwritten note. */
  text: string;
  /**
   * The spot the arrow points at, in px from the edges of the positioned parent: one of
   * left/right and one of top/bottom, e.g. `{ left: 58, top: 106 }`.
   */
  pointAt: { left?: number; right?: number; top?: number; bottom?: number };
  /** The way the arrow travels toward that spot, in degrees: 0 → right, 90 → down, 180 → left, -90 → up. */
  direction: number;
  /** Arrow length in px. */
  length?: number;
  /** How far the arrow bows, as a share of its length: 0 is straight, positive bows to the right of travel, negative to the left. */
  curve?: number;
  /** The side of the arrow's tail the note sits on. Defaults to the side the arrow comes from. */
  noteSide?: "left" | "right" | "above" | "below";
  /** For a note above or below the tail: start it at the tail, centre it on it, or end it there. */
  noteAlign?: "start" | "center" | "end";
  /** Note width in px before it wraps. */
  noteWidth?: number;
  /** Seconds before the arrow starts drawing; the note fades in once it's drawn. */
  delay?: number;
  /** Visibility per breakpoint, e.g. `hidden xl:block`. */
  className?: string;
};

/** Space between the arrow's tail and its note, in px. */
const NOTE_GAP = 8;

const NOTE_CLASS = "hero-annotation-note text-[21px] leading-[1.05] font-semibold text-balance text-hero-note";

/**
 * A hand-drawn callout: a sketchy curved arrow pointing at `pointAt`, with a handwritten note
 * at its tail. Place it inside a `relative` parent. It's decorative (`aria-hidden`), so the
 * notes should repeat what the page already says.
 */
export function Annotation({
  text,
  pointAt,
  direction,
  length = 90,
  curve = 0.2,
  noteSide,
  noteAlign = "center",
  noteWidth = 160,
  delay = 0,
  className,
}: AnnotationProps) {
  const arrow = drawArrow(direction, length, curve);
  const side = noteSide ?? defaultNoteSide(direction);

  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute z-10 size-0", className)}
      style={{ ...pointAt, "--annotation-delay": `${delay}s` } as CSSProperties}
    >
      <svg
        className="absolute overflow-visible text-hero-arrow"
        style={{ left: arrow.box.x, top: arrow.box.y, width: arrow.box.w, height: arrow.box.h }}
        viewBox={`${arrow.box.x} ${arrow.box.y} ${arrow.box.w} ${arrow.box.h}`}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path className="hero-arrow-line" pathLength={1} strokeWidth={2.25} d={arrow.line} />
        {/* A second, thinner pass slightly off the first: the pencil look. */}
        <path className="hero-arrow-line" pathLength={1} strokeWidth={1.1} opacity={0.5} d={arrow.sketch} />
        <path className="hero-arrow-head" pathLength={1} strokeWidth={2.25} d={arrow.head} />
      </svg>
      <p className={cn(caveat.className, NOTE_CLASS, "absolute w-max")} style={{ ...notePlacement(arrow.tail, side, noteAlign), maxWidth: noteWidth }}>
        {text}
      </p>
    </div>
  );
}

/** A handwritten note on its own, without an arrow (e.g. under the phone on small screens). */
export function AnnotationNote({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  return (
    <p
      aria-hidden
      className={cn(caveat.className, NOTE_CLASS, "pointer-events-none", className)}
      style={{ "--annotation-delay": `${delay}s` } as CSSProperties}
    >
      {text}
    </p>
  );
}

function defaultNoteSide(direction: number): NonNullable<AnnotationProps["noteSide"]> {
  const rad = (direction * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "left" : "right";
  return dy > 0 ? "above" : "below";
}

function notePlacement(
  tail: Point,
  side: NonNullable<AnnotationProps["noteSide"]>,
  align: NonNullable<AnnotationProps["noteAlign"]>,
): CSSProperties {
  // For notes above or below the tail: how far the note shifts left of the tail.
  const shiftX = { start: "-16px", center: "-50%", end: "calc(-100% + 16px)" }[align];
  const textAlign = ({ start: "left", center: "center", end: "right" } as const)[align];

  switch (side) {
    case "left":
      return { left: tail.x - NOTE_GAP, top: tail.y, transform: "translate(-100%, -50%)", textAlign: "right" };
    case "right":
      return { left: tail.x + NOTE_GAP, top: tail.y, transform: "translateY(-50%)", textAlign: "left" };
    case "above":
      return { left: tail.x, top: tail.y - NOTE_GAP, transform: `translate(${shiftX}, -100%)`, textAlign };
    case "below":
      return { left: tail.x, top: tail.y + NOTE_GAP, transform: `translateX(${shiftX})`, textAlign };
  }
}

/**
 * The arrow's paths, in px with the tip at (0, 0): a cubic curve from the tail, a slightly
 * offset second pass, and a lopsided arrowhead. `box` is the area they cover.
 */
function drawArrow(direction: number, length: number, curve: number) {
  const rad = (direction * Math.PI) / 180;
  const u = { x: Math.cos(rad), y: Math.sin(rad) }; // along the arrow
  const n = { x: -u.y, y: u.x }; // across it: the right-hand side of travel
  // A point `along` the way from tail (0) to tip (1), pushed `across` (both as shares of the length).
  const at = (along: number, across: number): Point => ({
    x: (u.x * (along - 1) + n.x * across) * length,
    y: (u.y * (along - 1) + n.y * across) * length,
  });
  const nudge = (p: Point, along: number, across: number): Point => ({
    x: p.x + u.x * along + n.x * across,
    y: p.y + u.y * along + n.y * across,
  });

  const tail = at(0, 0);
  const tip = { x: 0, y: 0 };
  const c1 = at(0.3, curve);
  const c2 = at(0.78, curve * 0.6);
  const line: Cubic = [tail, c1, c2, tip];
  const sketch: Cubic = [nudge(tail, 3, 1.5), nudge(c1, 0, 2), nudge(c2, 0, -1.5), nudge(tip, -3, 0.5)];

  // The head follows the direction the curve arrives from.
  const back = normalize({ x: c2.x - tip.x, y: c2.y - tip.y });
  const barbA = scale(rotate(back, 26), 12);
  const barbB = scale(rotate(back, -30), 10.5);

  const covered = [...sampleCubic(line), ...sampleCubic(sketch), barbA, barbB];
  const pad = 4;
  const minX = Math.min(...covered.map((p) => p.x)) - pad;
  const minY = Math.min(...covered.map((p) => p.y)) - pad;
  const maxX = Math.max(...covered.map((p) => p.x)) + pad;
  const maxY = Math.max(...covered.map((p) => p.y)) + pad;

  return {
    tail,
    line: cubicPath(line),
    sketch: cubicPath(sketch),
    head: `M${fmt(barbA)} L0 0 L${fmt(barbB)}`,
    box: { x: round(minX), y: round(minY), w: round(maxX - minX), h: round(maxY - minY) },
  };
}

function cubicPath([a, b, c, d]: Cubic) {
  return `M${fmt(a)} C${fmt(b)} ${fmt(c)} ${fmt(d)}`;
}

function sampleCubic([a, b, c, d]: Cubic): Point[] {
  return Array.from({ length: 25 }, (_, i) => {
    const t = i / 24;
    const s = 1 - t;
    const k = [s * s * s, 3 * s * s * t, 3 * s * t * t, t * t * t] as const;
    return {
      x: k[0] * a.x + k[1] * b.x + k[2] * c.x + k[3] * d.x,
      y: k[0] * a.y + k[1] * b.y + k[2] * c.y + k[3] * d.y,
    };
  });
}

function normalize(p: Point): Point {
  const len = Math.hypot(p.x, p.y) || 1;
  return { x: p.x / len, y: p.y / len };
}

function rotate(p: Point, degrees: number): Point {
  const r = (degrees * Math.PI) / 180;
  return { x: p.x * Math.cos(r) - p.y * Math.sin(r), y: p.x * Math.sin(r) + p.y * Math.cos(r) };
}

function scale(p: Point, by: number): Point {
  return { x: p.x * by, y: p.y * by };
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

function fmt(p: Point) {
  return `${round(p.x)} ${round(p.y)}`;
}
