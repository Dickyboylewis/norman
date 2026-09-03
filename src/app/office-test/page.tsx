"use client";

/**
 * Studio — live view.
 *
 * A standalone, full-viewport infinite canvas. Everything on the board is
 * generated from `office-data.ts` through the shared drawing functions below;
 * nothing is hand-placed per person.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { RefreshCw, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  DESKS,
  PEOPLE,
  type Desk,
  type DeskRotation,
  type Facing,
  type Person,
  type PersonStatus,
} from "@/lib/office-data";
import { fallbackProjectColor } from "@/lib/project-colors";
import {
  CellInfoLines,
  buildCellInfo,
  offDays,
  weekTotal,
  type ResourcingCellInfo,
} from "@/components/dashboard/resourcing/resourcing-tooltip";
import resourcingFixture from "@/lib/fixtures/resourcing.json";
import { filterWeek } from "@/lib/resourcing-math";
import { buildSeedLayout, type OfficeLayout } from "@/lib/office-layout";
import { HeadshotDialog } from "@/components/office/headshot-dialog";
import type { OfficeStatus } from "@/lib/office-status/parser";
import type { ResourcingData, ResourcingWeek } from "@/lib/resourcing-types";

/* ------------------------------------------------------------------ */
/* Tokens — every colour, size and spacing lives here                  */
/* ------------------------------------------------------------------ */

/* Palette */
const C_PAGE_BG = "#f7f5f2";
const C_GRID_DOT = "#d9d5ce";
const C_RED = "#DC2626";
const C_RED_LIGHT = "#EF4444";
const C_RED_DARK = "#B91C1C";
const C_INK = "#35322e";
const C_INK_SOFT = "#6f6a63";
const C_WHITE = "#ffffff";

const C_PLATE_TOP = "#ecebe7";
const C_PLATE_LEFT = "#dcd9d3";
const C_PLATE_RIGHT = "#cfccc5";

const C_DESK_TOP = "#eadbb4";
const C_DESK_LEFT = "#dbc79a";
const C_DESK_RIGHT = "#cab488";
const C_LEG = "#4a453f";

const C_SCREEN = "#ffffff";
const C_SCREEN_TEXT = "#cdc9c2";
const C_SCREEN_BACK = "#d7d3cc";
const C_SCREEN_BACK_INSET = "#c6c1b9";
const C_STAND = "#3f3b36";

const C_BODY = "#6f6a63";
const C_BODY_ACCENT = "#DC2626";
const C_STOOL = "#3a3733";

const C_POT = "#c97b54";
const C_POT_RIM = "#d98a62";
const C_LEAF = "#6e8f5e";
const C_LEAF_LIGHT = "#83a56f";

const C_SUN = "#F5B93B";

/* People rendered in the accent body colour */
const ACCENT_PEOPLE = new Set(["dicky", "joe", "jesus"]);

/* Isometric projection — 2:1 ratio */
const ISO_X = 46;
const ISO_Y = ISO_X / 2;

/* Floor plate */
/** Wide enough that the southernmost name pills still land inside the trim beam. */
const PLATE_MARGIN = 1.35;
const PLATE_THICK = 15;
const PLATE_SHADOW_DROP = 42;
const PLATE_SHADOW_BLUR = 22;
const TRIM_DEPTH = 0.09;
const TRIM_HEIGHT = 8;

/**
 * Desk block. The footprint is 0.96 x 0.66 on a grid where touching desks are
 * a whole unit (or 0.7 across a bench spine) apart, so neighbours show a
 * hairline seam instead of merging into one slab.
 */
const DESK_W = 0.96;
const DESK_D = 0.66;
const DESK_HALF_W = DESK_W / 2;
const DESK_HALF_D = DESK_D / 2;
/** Screen distance from a desk's centre down to its near foot — facing-independent. */
const DESK_FOOT_DROP = (DESK_HALF_W + DESK_HALF_D) * ISO_Y;
const DESK_TOP_Z = 26;
const DESK_SLAB = 5;
const LEG_HALF = 0.035;
const LEG_INSET = 0.06;
const MUG_EVERY = 3;
const MUG_SIDE = 0.3;
const MUG_TOWARD_SEAT = 0.08;

/* Monitor */
const MON_W = 0.62;
const MON_H = 24;
const MON_BAR = 3;
const MON_STAND = 7;
const MON_EDGE_INSET = 0.06;
const MON_TOP_Z = DESK_TOP_Z + MON_STAND + MON_H;

/* Figure */
const FIG_OFFSET = 0.55;
const FIG_STOOL_RX = 12;
const FIG_STOOL_RY = 5.5;
const FIG_SEAT_Y = -10;
const FIG_BODY_HW = 10.5;
const FIG_BODY_TOP = -36;
const FIG_HEAD_CY = -46;
const FIG_HEAD_R = 9.5;

/* Resourcing mini-bar above the head bubble */
const RES_BAR_W = 10;
const RES_BAR_H = 36;
const RES_BAR_BOTTOM = -60;
const RES_BAR_CAP_PCT = 118;
const RES_TIP_W = 240;
const RES_TIP_H = 170;
const C_RES_EMPTY = "#CBD5E1";

/* Live status icon above each head */
const HEAD_ICON_Y = -114;
const BOB_SECONDS = 3;
const BOB_TRAVEL = 3;

/* Labels */
const PILL_H = 10.5;
const PILL_CHAR_W = 4;
const PILL_PAD = 11;
const PILL_FONT = 5.6;
const PILL_FOOT_GAP = 3;
/** Hangs the pill just under the desk's near foot, identically for every desk. */
const PILL_DROP = DESK_FOOT_DROP + PILL_H / 2 + PILL_FOOT_GAP;
const CLUSTER_PILL_H = 26;
const CLUSTER_PILL_CHAR_W = 8.2;
const CLUSTER_PILL_PAD = 26;
const CLUSTER_PILL_FONT = 11;

/* Level of detail — name pills fade away once the board is zoomed out */
const LABEL_LOD_SCALE = 0.85;
const LABEL_FADE_MS = 200;

/* Cluster signs — parked in the clear plate margin beside their zone */
const DIRECTORS_SIGN = { x: 4.1, y: 5.1, lift: 10 };
const HOTDESK_SIGN = { x: 11.6, y: 5.9, lift: 10 };

/* Interaction */
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.5;
const ZOOM_WHEEL_SENSITIVITY = 0.0016;
const ZOOM_BUTTON_STEP = 1.25;
const FIT_PADDING = 72;
const FIT_MS = 450;
const HOVER_LIFT = 6;

/* Hover hit shapes */
const HIT_DESK_RX = (DESK_HALF_W + DESK_HALF_D) * ISO_X;
const HIT_DESK_RY = 32;
const HIT_DESK_DY = -13;
const HIT_FIGURE_R = 16;
const HIT_FIGURE_DY = -28;

/* Board */
const GRID_SPACING = 24;
const GRID_DOT_R = 0.75;
const GRID_EXTENT = 6000;

/* Plants, in plan coordinates relative to the plate corners — clear of the trim */
const PLANT_INSET = 0.9;

/* Tooltip copy */
const NEXT_UP_PLACEHOLDER = "Next: Planning review 14:00";

const OFFICE_STATUS_LABEL: Record<OfficeStatus | "none", string> = {
  holiday: "On holiday",
  sick: "Off sick",
  home: "Working from home",
  site: "On site",
  meeting: "In a meeting",
  none: "At desk",
};

const STATUS_LABEL: Record<PersonStatus, string> = {
  desk: "At desk",
  zoom: "On a Zoom call",
  site: "On site",
  holiday: "On holiday",
  sick: "Off sick",
  wfh: "Working from home",
};

const LEGEND: { status: PersonStatus; label: string }[] = [
  { status: "desk", label: "Desk" },
  { status: "zoom", label: "Zoom" },
  { status: "site", label: "Site" },
  { status: "holiday", label: "Holiday" },
  { status: "sick", label: "Sick" },
  { status: "wfh", label: "Home" },
];

type LabelMode = "auto" | "on" | "off";

const LABEL_MODE_NEXT: Record<LabelMode, LabelMode> = {
  auto: "on",
  on: "off",
  off: "auto",
};

/* Desk context menu */
const MENU_W = 178;
const MENU_H = 104;
const PERSON_MENU_H = 123;
const MENU_EDGE_PAD = 8;
const COPY_FEEDBACK_MS = 1600;

/* Slack deep link */
const SLACK_APP_WAIT_MS = 1500;
const TOAST_MS = 3600;
/** A click that travelled further than this is a pan, not a click. */
const CLICK_SLOP_PX = 4;

/* ------------------------------------------------------------------ */
/* Projection — the single place plan coordinates become screen ones   */
/* ------------------------------------------------------------------ */

interface ScreenPoint {
  sx: number;
  sy: number;
}

function iso(x: number, y: number, z: number): ScreenPoint {
  return { sx: (x - y) * ISO_X, sy: (x + y) * ISO_Y - z };
}

function isoStr(x: number, y: number, z: number): string {
  const p = iso(x, y, z);
  return `${p.sx.toFixed(2)},${p.sy.toFixed(2)}`;
}

/** Scene depth: larger means nearer the camera, so it draws later. */
function depthOf(x: number, y: number): number {
  return x + y;
}

/* ------------------------------------------------------------------ */
/* Facing — the one place a compass direction becomes plan geometry    */
/* ------------------------------------------------------------------ */

const FACE_VEC: Record<Facing, { dx: number; dy: number }> = {
  n: { dx: 0, dy: -1 },
  e: { dx: 1, dy: 0 },
  s: { dx: 0, dy: 1 },
  w: { dx: -1, dy: 0 },
};

const FACING_ORDER: Facing[] = ["n", "e", "s", "w"];

function facingAfter(facing: Facing, rotation: DeskRotation): Facing {
  return FACING_ORDER[(FACING_ORDER.indexOf(facing) + rotation / 90) % 4];
}

function turnBy(rotation: DeskRotation, quarters: number): DeskRotation {
  const steps = (((rotation / 90 + quarters) % 4) + 4) % 4;
  return (steps * 90) as DeskRotation;
}

function rotatedDesk(desk: Desk, rotation: DeskRotation): Desk {
  return rotation === 0 ? desk : { ...desk, facing: facingAfter(desk.facing, rotation), rotation };
}

function serialiseDesk(desk: Desk, rotation: DeskRotation): string {
  const rot = rotation === 0 ? "" : `, rotation: ${rotation}`;
  return `{ id: "${desk.id}", x: ${desk.x}, y: ${desk.y}, zone: "${desk.zone}", facing: "${desk.facing}"${rot} },`;
}

function serialiseDesks(desks: Desk[], rotations: Record<string, DeskRotation>): string {
  const body = desks
    .map((desk) => `  ${serialiseDesk(desk, rotations[desk.id] ?? desk.rotation ?? 0)}`)
    .join("\n");
  return `export const DESKS: Desk[] = [\n${body}\n];\n`;
}

/** Half-extents of the desk footprint, with the long edge across the facing. */
function footprint(facing: Facing): { hx: number; hy: number } {
  return facing === "n" || facing === "s"
    ? { hx: DESK_HALF_W, hy: DESK_HALF_D }
    : { hx: DESK_HALF_D, hy: DESK_HALF_W };
}

/** Where the occupant sits: the desk centre pushed back against the facing. */
function seatOf(desk: Desk): { x: number; y: number } {
  const f = FACE_VEC[desk.facing];
  return { x: desk.x - f.dx * FIG_OFFSET, y: desk.y - f.dy * FIG_OFFSET };
}

/** The mug, always on the camera-facing half of the desktop. */
function mugOf(desk: Desk): { x: number; y: number } {
  const f = FACE_VEC[desk.facing];
  let px = -f.dy;
  let py = f.dx;
  if (px + py < 0) {
    px = -px;
    py = -py;
  }
  return {
    x: desk.x + px * MUG_SIDE - f.dx * MUG_TOWARD_SEAT,
    y: desk.y + py * MUG_SIDE - f.dy * MUG_TOWARD_SEAT,
  };
}

/** Anchor of the monitor's screen plane, at the facing edge of the desktop. */
function monitorOf(desk: Desk): { x: number; y: number } {
  const f = FACE_VEC[desk.facing];
  const fp = footprint(desk.facing);
  return {
    x: desk.x + f.dx * (fp.hx - MON_EDGE_INSET),
    y: desk.y + f.dy * (fp.hy - MON_EDGE_INSET),
  };
}

/**
 * True when the occupant sits further from the camera than the desktop, so the
 * figure has to be painted before the desk block that partly hides it.
 */
function seatIsBehindDesk(facing: Facing): boolean {
  return facing === "s" || facing === "e";
}

/** The camera sees the screen face only when it points back toward +x or +y. */
function screenFacesCamera(facing: Facing): boolean {
  return facing === "n" || facing === "w";
}

/* ------------------------------------------------------------------ */
/* Derived geometry                                                    */
/* ------------------------------------------------------------------ */

const DESK_MIN_X = Math.min(...DESKS.map((d) => d.x - footprint(d.facing).hx));
const DESK_MAX_X = Math.max(...DESKS.map((d) => d.x + footprint(d.facing).hx));
const DESK_MIN_Y = Math.min(...DESKS.map((d) => d.y - footprint(d.facing).hy));
const DESK_MAX_Y = Math.max(...DESKS.map((d) => d.y + footprint(d.facing).hy));

const PLATE_X0 = DESK_MIN_X - PLATE_MARGIN;
const PLATE_X1 = DESK_MAX_X + PLATE_MARGIN;
const PLATE_Y0 = DESK_MIN_Y - PLATE_MARGIN;
const PLATE_Y1 = DESK_MAX_Y + PLATE_MARGIN;

const PLAN_CX = (PLATE_X0 + PLATE_X1) / 2;
const PLAN_CY = (PLATE_Y0 + PLATE_Y1) / 2;
const PLATE_HW0 = (PLATE_X1 - PLATE_X0) / 2;
const PLATE_HD0 = (PLATE_Y1 - PLATE_Y0) / 2;
const WORLD_PIVOT = { sx: (PLAN_CX - PLAN_CY) * ISO_X, sy: (PLAN_CX + PLAN_CY) * ISO_Y };
const ORIENT_VECS = [
  { x: -1, y: 0 },
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
];
const ROTATE_STEP_PX = 80;

/** Rotate a plan point k quarter-turns about the island centre (view only). */
function orientPoint(x: number, y: number, k: number): { x: number; y: number } {
  let dx = x - PLAN_CX;
  let dy = y - PLAN_CY;
  for (let i = 0; i < ((k % 4) + 4) % 4; i++) {
    const t = dx;
    dx = -dy;
    dy = t;
  }
  return { x: PLAN_CX + dx, y: PLAN_CY + dy };
}

function orientFacing(f: Facing, k: number): Facing {
  return FACING_ORDER[(FACING_ORDER.indexOf(f) + ((k % 4) + 4) % 4) % 4];
}

/** Screen-space bounds of the island for a given view orientation. */
function islandBounds(k: number) {
  const hw = k % 2 ? PLATE_HD0 : PLATE_HW0;
  const hd = k % 2 ? PLATE_HW0 : PLATE_HD0;
  const x0 = PLAN_CX - hw;
  const x1 = PLAN_CX + hw;
  const y0 = PLAN_CY - hd;
  const y1 = PLAN_CY + hd;
  return {
    minX: (x0 - y1) * ISO_X - 40,
    maxX: (x1 - y0) * ISO_X + 40,
    minY: (x0 + y0) * ISO_Y - 40,
    maxY: (x1 + y1) * ISO_Y + PLATE_THICK + PLATE_SHADOW_DROP,
  };
}

const PERSON_BY_ID = new Map<string, Person>(PEOPLE.map((p) => [p.id, p]));

const SEED_LAYOUT = buildSeedLayout();

const PLANTS: { x: number; y: number; tint: number }[] = [
  { x: PLATE_X0 + PLANT_INSET, y: PLATE_Y1 - PLANT_INSET, tint: 0 },
  { x: PLATE_X1 - PLANT_INSET, y: PLATE_Y0 + PLANT_INSET, tint: 1 },
  { x: PLATE_X1 - PLANT_INSET, y: PLATE_Y1 - PLANT_INSET, tint: 0 },
];

function initialsOf(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/* ------------------------------------------------------------------ */
/* Shared drawing functions                                            */
/* ------------------------------------------------------------------ */

interface IsoBoxProps {
  cx: number;
  cy: number;
  hw: number;
  hd: number;
  z: number;
  h: number;
  top: string;
  left: string;
  right: string;
}

/** An axis-aligned isometric box: two visible side faces plus the top. */
function IsoBox({ cx, cy, hw, hd, z, h, top, left, right }: IsoBoxProps) {
  const zt = z + h;
  const A = isoStr(cx - hw, cy - hd, zt);
  const B = isoStr(cx + hw, cy - hd, zt);
  const C = isoStr(cx + hw, cy + hd, zt);
  const D = isoStr(cx - hw, cy + hd, zt);
  const B0 = isoStr(cx + hw, cy - hd, z);
  const C0 = isoStr(cx + hw, cy + hd, z);
  const D0 = isoStr(cx - hw, cy + hd, z);
  return (
    <>
      <polygon points={`${D} ${C} ${C0} ${D0}`} fill={left} />
      <polygon points={`${C} ${B} ${B0} ${C0}`} fill={right} />
      <polygon points={`${A} ${B} ${C} ${D}`} fill={top} />
    </>
  );
}

/**
 * A monitor standing on the facing edge of a desk.
 *
 * The screen is a plane in the desk's lateral axis, so its local frame is a
 * matrix built straight from the projection: `u` runs along that axis in plan
 * units, `v` runs straight down the screen in pixels. Desks facing east or
 * south present the monitor's back to the camera, which is what you would
 * actually see from here.
 */
function Monitor({ desk }: { desk: Desk }) {
  const anchor = monitorOf(desk);
  const spansY = desk.facing === "e" || desk.facing === "w";
  const originX = spansY ? anchor.x : anchor.x - MON_W / 2;
  const originY = spansY ? anchor.y - MON_W / 2 : anchor.y;
  const o = iso(originX, originY, MON_TOP_Z);
  const ax = spansY ? -ISO_X : ISO_X;
  const frame = `matrix(${ax},${ISO_Y},0,1,${o.sx.toFixed(2)},${o.sy.toFixed(2)})`;
  return (
    <g transform={frame}>
      <rect x={MON_W / 2 - 0.11} y={MON_H + MON_STAND - 1.6} width={0.22} height={1.6} fill={C_STAND} />
      <rect x={MON_W / 2 - 0.028} y={MON_H} width={0.056} height={MON_STAND} fill={C_STAND} />
      {screenFacesCamera(desk.facing) ? (
        <>
          <rect x={0} y={0} width={MON_W} height={MON_H} fill={C_SCREEN} />
          <rect x={0} y={0} width={MON_W} height={MON_BAR} fill={C_RED} />
          <rect x={0.07} y={MON_BAR + 5} width={0.3} height={2.2} fill={C_SCREEN_TEXT} />
          <rect x={0.07} y={MON_BAR + 10} width={0.44} height={2.2} fill={C_SCREEN_TEXT} />
        </>
      ) : (
        <>
          <rect x={0} y={0} width={MON_W} height={MON_H} fill={C_SCREEN_BACK} />
          <rect x={0.09} y={3.5} width={MON_W - 0.18} height={MON_H - 9} fill={C_SCREEN_BACK_INSET} />
        </>
      )}
    </g>
  );
}

/** A tiny red mug sitting on the desk top. */
function Mug({ desk }: { desk: Desk }) {
  const m = mugOf(desk);
  const p = iso(m.x, m.y, DESK_TOP_Z);
  return (
    <g transform={`translate(${p.sx.toFixed(2)},${p.sy.toFixed(2)})`}>
      <g className="norman-bill">
      <path
        d="M4.4,-5.4 a2.6,2.6 0 0 1 0,3.4"
        fill="none"
        stroke={C_RED_DARK}
        strokeWidth={1.3}
        strokeLinecap="round"
      />
      <path d="M-4.4,-6 L-4.4,-1.4 A4.4,2.3 0 0 0 4.4,-1.4 L4.4,-6 Z" fill={C_RED} />
      <ellipse cx={0} cy={-6} rx={4.4} ry={2.3} fill={C_RED_LIGHT} />
      </g>
    </g>
  );
}

/** The desk block itself: timber top, slim dark legs, monitor, optional mug. */
function DeskBlock({ desk, index }: { desk: Desk; index: number }) {
  const fp = footprint(desk.facing);
  const legZ = DESK_TOP_Z - DESK_SLAB;
  const lx = fp.hx - LEG_INSET;
  const ly = fp.hy - LEG_INSET;
  const legs: [number, number][] = [
    [-lx, -ly],
    [lx, -ly],
    [-lx, ly],
    [lx, ly],
  ];

  // Things resting on the desktop always draw after the block, but among
  // themselves they still have to respect scene depth.
  const mon = monitorOf(desk);
  const mug = mugOf(desk);
  const onTop: { d: number; node: ReactNode }[] = [
    { d: depthOf(mon.x, mon.y), node: <Monitor desk={desk} /> },
  ];
  if (index % MUG_EVERY === 0) {
    onTop.push({ d: depthOf(mug.x, mug.y), node: <Mug desk={desk} /> });
  }
  onTop.sort((a, b) => a.d - b.d);

  return (
    <>
      {legs.map(([dx, dy], i) => (
        <IsoBox
          key={`leg-${i}`}
          cx={desk.x + dx}
          cy={desk.y + dy}
          hw={LEG_HALF}
          hd={LEG_HALF}
          z={0}
          h={legZ}
          top={C_LEG}
          left={C_LEG}
          right="#3b3730"
        />
      ))}
      <IsoBox
        cx={desk.x}
        cy={desk.y}
        hw={fp.hx}
        hd={fp.hy}
        z={legZ}
        h={DESK_SLAB}
        top={C_DESK_TOP}
        left={C_DESK_LEFT}
        right={C_DESK_RIGHT}
      />
      {onTop.map((part, i) => (
        <g key={`top-${i}`}>{part.node}</g>
      ))}
    </>
  );
}

interface ResourcingHover {
  show: (info: ResourcingCellInfo, x: number, y: number) => void;
  move: (x: number, y: number) => void;
  hide: () => void;
  toggle: (info: ResourcingCellInfo, x: number, y: number) => void;
}

/** The condensed current-week allocation bar drawn above a figure's head. */
function ResourceBarShape({ week }: { week: ResourcingWeek }) {
  const total = weekTotal(week);
  const off = offDays(week);
  const offPct = (off / 5) * 100;
  const overall = total + offPct;
  const scaleF = overall > RES_BAR_CAP_PCT ? RES_BAR_CAP_PCT / overall : 1;
  const pxPerPct = (RES_BAR_H / 100) * scaleF;
  const x0 = -RES_BAR_W / 2;

  if (total === 0 && off === 0) {
    return (
      <rect
        x={x0}
        y={RES_BAR_BOTTOM - RES_BAR_H}
        width={RES_BAR_W}
        height={RES_BAR_H}
        fill="none"
        stroke={C_RES_EMPTY}
        strokeWidth={1}
        strokeDasharray="2,2"
        opacity={0.8}
      />
    );
  }

  const segments: { key: string; y: number; h: number; fill: string }[] = [];
  let cursor = RES_BAR_BOTTOM;
  for (const p of week.projects) {
    const h = p.percentage * pxPerPct;
    cursor -= h;
    segments.push({
      key: `${p.projectCode}-${p.projectTitle}`,
      y: cursor,
      h,
      fill: p.color ?? fallbackProjectColor(p.projectCode),
    });
  }
  let offSeg: { y: number; h: number } | null = null;
  if (off > 0) {
    const h = offPct * pxPerPct;
    cursor -= h;
    offSeg = { y: cursor, h };
  }

  return (
    <>
      {segments.map(s => (
        <rect key={s.key} x={x0} y={s.y} width={RES_BAR_W} height={s.h} fill={s.fill} />
      ))}
      {offSeg && (
        <rect x={x0} y={offSeg.y} width={RES_BAR_W} height={offSeg.h} fill="url(#norman-timeoff)" />
      )}
      {total > 100 && <rect x={x0} y={cursor - 2} width={RES_BAR_W} height={2} fill={C_RED} />}
    </>
  );
}

/**
 * A person on their seat.
 *
 * Stool, body and head are one group under a single translate, so they can
 * never come apart — a head is only ever drawn as part of this whole. Facing
 * changes where the group stands on the floor, never how it is built.
 */
function Figure({
  desk,
  person,
  week,
  resHover,
  onPersonContextMenu,
  onPersonClick,
  swapActive,
  onSwapPick,
  headshotVersion,
  feedStatus,
}: {
  desk: Desk;
  person: Person;
  week?: ResourcingWeek;
  resHover?: ResourcingHover;
  onPersonContextMenu?: (e: ReactMouseEvent<SVGGElement>) => void;
  onPersonClick?: () => void;
  swapActive?: boolean;
  onSwapPick?: () => void;
  headshotVersion?: number;
  feedStatus?: OfficeStatus | "none";
}) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const [failedHeadshotVersion, setFailedHeadshotVersion] = useState<number | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setHydrated(true), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const remoteUrl = photoFailed ? null : person.photoUrl ?? null;
  const hv = headshotVersion ?? 0;
  const headshotUrl =
    !hydrated || failedHeadshotVersion === hv
      ? null
      : `/headshots/${person.id}.png${hv ? `?v=${hv}` : ""}`;
  const seat = seatOf(desk);
  const p = iso(seat.x, seat.y, 0);
  const body = ACCENT_PEOPLE.has(person.id) ? C_BODY_ACCENT : C_BODY;
  const bodyPath =
    `M ${-FIG_BODY_HW} ${FIG_SEAT_Y + 1}` +
    ` C ${-FIG_BODY_HW} ${FIG_BODY_TOP + 8} ${-FIG_BODY_HW + 3.5} ${FIG_BODY_TOP} 0 ${FIG_BODY_TOP}` +
    ` C ${FIG_BODY_HW - 3.5} ${FIG_BODY_TOP} ${FIG_BODY_HW} ${FIG_BODY_TOP + 8} ${FIG_BODY_HW} ${FIG_SEAT_Y + 1} Z`;

  return (
    <g
      transform={`translate(${p.sx.toFixed(2)},${p.sy.toFixed(2)})`}
      onContextMenu={onPersonContextMenu}
      onClick={e => {
        if (swapActive) {
          if (onSwapPick) {
            e.stopPropagation();
            onSwapPick();
          }
          return;
        }
        if (onPersonClick) {
          e.stopPropagation();
          onPersonClick();
        }
      }}
      style={swapActive || onPersonClick ? { cursor: "pointer" } : undefined}
    >
      <g className="norman-bill">
      {/* stool */}
      <rect x={-1.6} y={FIG_SEAT_Y} width={3.2} height={-FIG_SEAT_Y} fill={C_STOOL} />
      <ellipse cx={0} cy={0} rx={FIG_STOOL_RX * 0.55} ry={FIG_STOOL_RY * 0.45} fill={C_STOOL} />
      <ellipse cx={0} cy={FIG_SEAT_Y} rx={FIG_STOOL_RX} ry={FIG_STOOL_RY} fill={C_STOOL} />

      {/* body */}
      <path d={bodyPath} fill={body} />

      {/* head */}
      {headshotUrl ? (
        <>
          <foreignObject
            x={-FIG_HEAD_R}
            y={FIG_HEAD_CY - FIG_HEAD_R}
            width={FIG_HEAD_R * 2}
            height={FIG_HEAD_R * 2}
          >
            <img
              src={headshotUrl}
              alt={person.fullName}
              loading="lazy"
              draggable={false}
              onError={() => setFailedHeadshotVersion(hv)}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                borderRadius: 9999,
                overflow: "hidden",
                objectFit: "cover",
              }}
            />
          </foreignObject>
          <circle cx={0} cy={FIG_HEAD_CY} r={FIG_HEAD_R} fill="none" stroke={C_WHITE} strokeWidth={1.6} />
        </>
      ) : remoteUrl ? (
        <>
          <foreignObject
            x={-FIG_HEAD_R}
            y={FIG_HEAD_CY - FIG_HEAD_R}
            width={FIG_HEAD_R * 2}
            height={FIG_HEAD_R * 2}
          >
            <img
              src={remoteUrl}
              alt={person.fullName}
              loading="lazy"
              draggable={false}
              onError={() => setPhotoFailed(true)}
              style={{
                width: "100%",
                height: "100%",
                display: "block",
                borderRadius: 9999,
                overflow: "hidden",
                objectFit: "cover",
                objectPosition: person.photoFocus ?? "center 25%",
              }}
            />
          </foreignObject>
          <circle cx={0} cy={FIG_HEAD_CY} r={FIG_HEAD_R} fill="none" stroke={C_WHITE} strokeWidth={1.6} />
        </>
      ) : person.photo ? (
        <>
          <clipPath id={`head-clip-${person.id}`}>
            <circle cx={0} cy={FIG_HEAD_CY} r={FIG_HEAD_R} />
          </clipPath>
          <image
            href={person.photo}
            x={-FIG_HEAD_R}
            y={FIG_HEAD_CY - FIG_HEAD_R}
            width={FIG_HEAD_R * 2}
            height={FIG_HEAD_R * 2}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#head-clip-${person.id})`}
          />
          <circle cx={0} cy={FIG_HEAD_CY} r={FIG_HEAD_R} fill="none" stroke={C_WHITE} strokeWidth={1.6} />
        </>
      ) : (
        <>
          <circle cx={0} cy={FIG_HEAD_CY} r={FIG_HEAD_R} fill={C_INK} />
          <text
            x={0}
            y={FIG_HEAD_CY}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={8}
            fontWeight={600}
            fill={C_WHITE}
            style={{ fontFamily: "var(--font-poppins), sans-serif" }}
          >
            {initialsOf(person.fullName)}
          </text>
        </>
      )}

      {/* headset for anyone on a call */}
      {person.status === "zoom" ? (
        <g>
          <path
            d={`M ${-FIG_HEAD_R - 2} ${FIG_HEAD_CY} A ${FIG_HEAD_R + 2} ${FIG_HEAD_R + 2} 0 0 1 ${FIG_HEAD_R + 2} ${FIG_HEAD_CY}`}
            fill="none"
            stroke={C_WHITE}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <rect x={-FIG_HEAD_R - 4} y={FIG_HEAD_CY - 2.5} width={3.4} height={6} rx={1.6} fill={C_WHITE} />
          <rect x={FIG_HEAD_R + 0.6} y={FIG_HEAD_CY - 2.5} width={3.4} height={6} rx={1.6} fill={C_WHITE} />
          <path
            d={`M ${-FIG_HEAD_R - 2.3} ${FIG_HEAD_CY + 3.5} q 0 5 5 6`}
            fill="none"
            stroke={C_WHITE}
            strokeWidth={1.6}
            strokeLinecap="round"
          />
          <circle cx={-FIG_HEAD_R + 3} cy={FIG_HEAD_CY + 9.6} r={2} fill={C_RED} />
        </g>
      ) : null}

      {/* resourcing mini-bar + head hover zone */}
      {week && resHover ? (
        <g
          onPointerDown={e => e.stopPropagation()}
          onPointerEnter={e => {
            e.stopPropagation();
            resHover.show(buildCellInfo(person.fullName, week), e.clientX, e.clientY);
          }}
          onPointerMove={e => {
            e.stopPropagation();
            resHover.move(e.clientX, e.clientY);
          }}
          onPointerLeave={e => {
            e.stopPropagation();
            resHover.hide();
          }}
          onClick={e => {
            if (swapActive) return;
            e.stopPropagation();
            resHover.toggle(buildCellInfo(person.fullName, week), e.clientX, e.clientY);
          }}
        >
          <rect
            x={-RES_BAR_W / 2 - 3}
            y={RES_BAR_BOTTOM - RES_BAR_H - 8}
            width={RES_BAR_W + 6}
            height={RES_BAR_H + 12}
            fill="transparent"
          />
          <ResourceBarShape week={week} />
          <circle cx={0} cy={FIG_HEAD_CY} r={FIG_HEAD_R + 1.5} fill="transparent" />
        </g>
      ) : null}

      {feedStatus && feedStatus !== "none" ? (
        <g transform={`translate(0, ${HEAD_ICON_Y})`}>
          <HeadStatusIcon status={feedStatus} />
        </g>
      ) : null}
      </g>
    </g>
  );
}

/** Status glyphs, drawn in a shared 24×24 box so board and legend agree. */
function StatusGlyph({ status }: { status: PersonStatus }) {
  switch (status) {
    case "site":
      return (
        <>
          <path d="M12 22.5c5.1-7.2 7.1-10.4 7.1-13.2a7.1 7.1 0 1 0-14.2 0c0 2.8 2 6 7.1 13.2Z" fill={C_RED} />
          <circle cx={12} cy={9.1} r={2.7} fill={C_WHITE} />
        </>
      );
    case "holiday":
      return (
        <>
          <g stroke={C_SUN} strokeWidth={2.1} strokeLinecap="round">
            <line x1={12} y1={1.6} x2={12} y2={4.6} />
            <line x1={12} y1={19.4} x2={12} y2={22.4} />
            <line x1={1.6} y1={12} x2={4.6} y2={12} />
            <line x1={19.4} y1={12} x2={22.4} y2={12} />
            <line x1={4.7} y1={4.7} x2={6.8} y2={6.8} />
            <line x1={17.2} y1={17.2} x2={19.3} y2={19.3} />
            <line x1={4.7} y1={19.3} x2={6.8} y2={17.2} />
            <line x1={17.2} y1={6.8} x2={19.3} y2={4.7} />
          </g>
          <circle cx={12} cy={12} r={5.2} fill={C_SUN} />
        </>
      );
    case "sick":
      return (
        <>
          <rect x={9.4} y={3} width={5.2} height={18} rx={1.9} fill={C_RED} />
          <rect x={3} y={9.4} width={18} height={5.2} rx={1.9} fill={C_RED} />
        </>
      );
    case "wfh":
      return (
        <>
          <polygon points="12,2.6 22,11.4 2,11.4" fill={C_INK} />
          <rect x={5} y={11.4} width={14} height={9.6} rx={1.2} fill={C_WHITE} stroke={C_INK} strokeWidth={1.3} />
          <rect x={10.2} y={14.6} width={3.6} height={6.4} fill={C_RED} />
        </>
      );
    case "zoom":
      return (
        <>
          <circle cx={12} cy={13.4} r={5} fill={C_BODY} />
          <path d="M5.2 12.4a6.8 6.8 0 0 1 13.6 0" fill="none" stroke={C_INK} strokeWidth={2} strokeLinecap="round" />
          <circle cx={5.2} cy={13} r={1.9} fill={C_INK} />
          <circle cx={18.8} cy={13} r={1.9} fill={C_INK} />
          <circle cx={8.6} cy={17.4} r={1.5} fill={C_RED} />
        </>
      );
    case "desk":
    default:
      return (
        <>
          <rect x={2.6} y={12} width={18.8} height={2.9} rx={1.4} fill={C_DESK_RIGHT} />
          <rect x={4.8} y={14.9} width={1.9} height={5.4} fill={C_LEG} />
          <rect x={17.3} y={14.9} width={1.9} height={5.4} fill={C_LEG} />
          <circle cx={12} cy={7.4} r={3.4} fill={C_BODY} />
        </>
      );
  }
}

/** Beach ball for holiday — pure SVG, no emoji fonts. */
function BeachBall() {
  return (
    <g>
      <circle cx={0} cy={0} r={9} fill={C_WHITE} stroke="#d4d0c9" strokeWidth={0.8} />
      <path d="M0,0 L0,-9 A9,9 0 0 1 7.79,-4.5 Z" fill={C_RED} />
      <path d="M0,0 L7.79,4.5 A9,9 0 0 1 0,9 Z" fill={C_SUN} />
      <path d="M0,0 L-7.79,-4.5 A9,9 0 0 1 0,-9 Z" fill="#2563EB" />
      <circle cx={0} cy={0} r={1.6} fill={C_WHITE} stroke="#d4d0c9" strokeWidth={0.6} />
    </g>
  );
}

/** The status icon floating above a person's head, from the live feed. */
function HeadStatusIcon({ status }: { status: OfficeStatus }) {
  if (status === "holiday") return <BeachBall />;
  if (status === "meeting") {
    return (
      <g>
        <circle cx={0} cy={0} r={9} fill={C_RED} />
        <path
          d="M-4.5,1 a4.5,4.5 0 0 1 9,0"
          fill="none"
          stroke={C_WHITE}
          strokeWidth={1.8}
          strokeLinecap="round"
        />
        <rect x={-5.7} y={0.2} width={2.4} height={3.6} rx={1.1} fill={C_WHITE} />
        <rect x={3.3} y={0.2} width={2.4} height={3.6} rx={1.1} fill={C_WHITE} />
      </g>
    );
  }
  const glyph: PersonStatus = status === "sick" ? "sick" : status === "home" ? "wfh" : "site";
  return (
    <g transform="scale(0.85) translate(-12,-12)">
      <StatusGlyph status={glyph} />
    </g>
  );
}

/** A small potted plant. */
function Plant({ x, y, tint }: { x: number; y: number; tint: number }) {
  const p = iso(x, y, 0);
  const leaf = tint === 0 ? C_LEAF : C_LEAF_LIGHT;
  const leafAlt = tint === 0 ? C_LEAF_LIGHT : C_LEAF;
  return (
    <g transform={`translate(${p.sx.toFixed(2)},${p.sy.toFixed(2)})`}>
      <g className="norman-bill">
      <ellipse cx={0} cy={0} rx={12} ry={5.5} fill="rgba(53,50,46,0.10)" />
      <ellipse cx={-7} cy={-22} rx={5} ry={9.5} fill={leafAlt} transform="rotate(-28 -7 -22)" />
      <ellipse cx={7} cy={-21} rx={5} ry={9} fill={leafAlt} transform="rotate(28 7 -21)" />
      <ellipse cx={0} cy={-26} rx={5.6} ry={11} fill={leaf} />
      <path d="M-8,-13 L8,-13 L6,0 L-6,0 Z" fill={C_POT} />
      <rect x={-9} y={-15.5} width={18} height={4} rx={1.6} fill={C_POT_RIM} />
      </g>
    </g>
  );
}

/** The white tag that hangs below a desk, or a larger sign for a zone. */
function NamePill({
  x,
  y,
  lift = 0,
  drop = 0,
  label,
  large = false,
  visible = true,
}: {
  x: number;
  y: number;
  lift?: number;
  drop?: number;
  label: string;
  large?: boolean;
  visible?: boolean;
}) {
  const h = large ? CLUSTER_PILL_H : PILL_H;
  const charW = large ? CLUSTER_PILL_CHAR_W : PILL_CHAR_W;
  const pad = large ? CLUSTER_PILL_PAD : PILL_PAD;
  const font = large ? CLUSTER_PILL_FONT : PILL_FONT;
  const w = label.length * charW + pad;
  const p = iso(x, y, lift);
  return (
    <g
      pointerEvents="none"
      filter="url(#norman-pill-shadow)"
      style={{
        transform: `translate(${p.sx.toFixed(2)}px, ${(p.sy + drop).toFixed(2)}px)`,
        opacity: visible ? 1 : 0,
        transition: `opacity ${LABEL_FADE_MS}ms ease`,
      }}
    >
      <g className="norman-bill">
      <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={h / 2} fill={C_WHITE} />
      <text
        x={0}
        y={0}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={font}
        fontWeight={600}
        fill={C_INK}
        letterSpacing="0.1em"
        style={{ fontFamily: "var(--font-poppins), sans-serif" }}
      >
        {label.toUpperCase()}
      </text>
      </g>
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

interface View {
  x: number;
  y: number;
  k: number;
}

interface Tooltip {
  clientX: number;
  clientY: number;
  title: string;
  status: string | null;
  next: string | null;
}

interface DeskMenu {
  deskId: string;
  clientX: number;
  clientY: number;
}

function fitView(w: number, h: number, orientation: number): View {
  const bounds = islandBounds(orientation);
  const bw = bounds.maxX - bounds.minX;
  const bh = bounds.maxY - bounds.minY;
  const k = clamp(
    Math.min((w - FIT_PADDING * 2) / bw, (h - FIT_PADDING * 2) / bh),
    ZOOM_MIN,
    ZOOM_MAX,
  );
  return {
    k,
    x: w / 2 - k * ((bounds.minX + bounds.maxX) / 2),
    y: h / 2 - k * ((bounds.minY + bounds.maxY) / 2),
  };
}

export default function OfficeTestPage() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const panRef = useRef<{ id: number; sx: number; sy: number; vx: number; vy: number } | null>(null);
  const touchesRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ idA: number; idB: number; d0: number; k0: number; wx: number; wy: number } | null>(null);

  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View>({ x: 0, y: 0, k: 1 });
  const [panning, setPanning] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<Tooltip | null>(null);
  const [labelMode, setLabelMode] = useState<LabelMode>("auto");
  const [rotations, setRotations] = useState<Record<string, DeskRotation>>({});
  const [menu, setMenu] = useState<DeskMenu | null>(null);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [resTip, setResTip] = useState<{
    info: ResourcingCellInfo;
    x: number;
    y: number;
    pinned: boolean;
  } | null>(null);
  const [currentWeekIso, setCurrentWeekIso] = useState<string | null>(null);
  const [personMenu, setPersonMenu] = useState<{
    deskId: string;
    personId: string;
    personName: string;
    clientX: number;
    clientY: number;
  } | null>(null);
  const personMenuRef = useRef<HTMLDivElement | null>(null);
  const [swapSource, setSwapSource] = useState<{ deskId: string; personId: string; name: string } | null>(null);
  const [photoTarget, setPhotoTarget] = useState<{ personId: string; name: string } | null>(null);
  const [headshotVersions, setHeadshotVersions] = useState<Record<string, number>>({});
  const [orientation, setOrientation] = useState(0);
  const [orientAnim, setOrientAnim] = useState<{ dir: 1 | -1; phase: "init" | "run" } | null>(null);
  const [rotateCue, setRotateCue] = useState<{ x: number; y: number } | null>(null);
  const rotateDragRef = useRef<{ id: number; startX: number; applied: number } | null>(null);

  const { data: session } = useSession();
  const signedIn = Boolean(session?.user);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | null>(null);
  const [syncingSlack, setSyncingSlack] = useState(false);
  /** True once the current pointer gesture has travelled far enough to count as a drag. */
  const clickMovedRef = useRef(false);

  const showToast = useCallback((text: string) => {
    setToast(text);
    if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const stepOrientation = useCallback((dir: 1 | -1) => {
    setOrientation(o => (o + dir + 4) % 4);
    setOrientAnim({ dir, phase: "init" });
  }, []);

  useEffect(() => {
    if (!orientAnim) return;
    if (orientAnim.phase === "init") {
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => {
          setOrientAnim(a => (a && a.phase === "init" ? { ...a, phase: "run" } : a));
        });
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    const timer = window.setTimeout(() => setOrientAnim(null), 420);
    return () => window.clearTimeout(timer);
  }, [orientAnim]);
  const queryClient = useQueryClient();

  const { data: layout } = useQuery<OfficeLayout>({
    queryKey: ["office-layout"],
    queryFn: async () => {
      const res = await fetch("/api/office-layout");
      if (!res.ok) throw new Error("Failed to load office layout");
      return res.json();
    },
    initialData: SEED_LAYOUT,
    initialDataUpdatedAt: 0,
  });

  const { data: officeStatusData } = useQuery<{
    source: "live" | "placeholder";
    statuses: { personId: string; status: OfficeStatus | "none" }[];
  }>({
    queryKey: ["office-status"],
    queryFn: async () => {
      const res = await fetch("/api/office-status");
      if (!res.ok) throw new Error("Failed to load office status");
      return res.json();
    },
    refetchInterval: 300_000,
  });

  const statusMap = useMemo(
    () => new Map((officeStatusData?.statuses ?? []).map(s => [s.personId, s.status])),
    [officeStatusData],
  );

  const desks = useMemo<Desk[]>(
    () =>
      layout.desks.map(d => ({
        id: d.id,
        x: d.x,
        y: d.y,
        zone: d.zone,
        facing: d.facing,
        rotation: d.rotation,
      })),
    [layout],
  );

  const personByDesk = useMemo(() => {
    const map = new Map<string, Person>();
    for (const d of layout.desks) {
      if (!d.personId) continue;
      const base = PERSON_BY_ID.get(d.personId);
      if (base) {
        map.set(d.id, { ...base, deskId: d.id });
      } else {
        const lp = layout.people.find(p => p.id === d.personId);
        if (lp) {
          map.set(d.id, {
            id: lp.id,
            name: lp.name,
            fullName: lp.name,
            deskId: d.id,
            status: "desk",
            photo: null,
          });
        }
      }
    }
    return map;
  }, [layout]);

  const { data: resourcing } = useQuery<ResourcingData>({
    queryKey: ["resourcing"],
    queryFn: async () => {
      const res = await fetch("/api/resourcing");
      if (!res.ok) throw new Error("Failed to load resourcing data");
      return res.json();
    },
    initialData: resourcingFixture as ResourcingData,
    initialDataUpdatedAt: 0,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const today = new Date().toISOString().slice(0, 10);
      let match: string | null = null;
      for (const ws of resourcing.weekStarts) {
        if (ws <= today) match = ws;
      }
      if (match) {
        const end = new Date(match + "T00:00:00Z");
        end.setUTCDate(end.getUTCDate() + 7);
        if (today >= end.toISOString().slice(0, 10)) match = null;
      }
      setCurrentWeekIso(match);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [resourcing]);

  const resWeekByFullName = useMemo(() => {
    const map = new Map<string, ResourcingWeek>();
    if (!currentWeekIso || !resourcing) return map;
    for (const rp of resourcing.people) {
      const week = rp.weeks.find(w => w.weekStart === currentWeekIso);
      if (week) map.set(rp.name, filterWeek(week, "confirmed"));
    }
    return map;
  }, [resourcing, currentWeekIso]);

  const resHover: ResourcingHover = {
    show: (info, x, y) => {
      setTooltip(null);
      setResTip(prev => (prev?.pinned ? prev : { info, x, y, pinned: false }));
    },
    move: (x, y) => setResTip(prev => (prev && !prev.pinned ? { ...prev, x, y } : prev)),
    hide: () => setResTip(prev => (prev?.pinned ? prev : null)),
    toggle: (info, x, y) =>
      setResTip(prev =>
        prev?.pinned && prev.info.personName === info.personName
          ? null
          : { info, x, y, pinned: true },
      ),
  };

  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  });

  const didFit = useRef(false);

  /* Measure the viewport */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* First real measurement frames the island */
  useEffect(() => {
    if (didFit.current || size.w === 0 || size.h === 0) return;
    didFit.current = true;
    setView(fitView(size.w, size.h, orientation));
  }, [size, orientation]);

  const animateTo = useCallback((target: View) => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    const start = viewRef.current;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / FIT_MS);
      const e = 1 - Math.pow(1 - p, 3);
      setView({
        x: start.x + (target.x - start.x) * e,
        y: start.y + (target.y - start.y) * e,
        k: start.k + (target.k - start.k) * e,
      });
      if (p < 1) rafRef.current = requestAnimationFrame(step);
      else rafRef.current = null;
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
      if (toastTimer.current !== null) window.clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!menu) return;
    const dismiss = (e: PointerEvent) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return;
      setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  useEffect(() => {
    if (!personMenu) return;
    const dismiss = (e: PointerEvent) => {
      if (personMenuRef.current && e.target instanceof Node && personMenuRef.current.contains(e.target)) return;
      setPersonMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPersonMenu(null);
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onKey);
    };
  }, [personMenu]);

  useEffect(() => {
    if (!swapSource) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSwapSource(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [swapSource]);

  const copyText = useCallback((text: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(text).then(
      () => {
        setCopied(true);
        if (copyTimer.current !== null) window.clearTimeout(copyTimer.current);
        copyTimer.current = window.setTimeout(() => setCopied(false), COPY_FEEDBACK_MS);
      },
      () => setCopied(false),
    );
  }, []);

  /**
   * Try the slack:// deep link through a hidden iframe; if the window is still
   * focused and visible after SLACK_APP_WAIT_MS the app didn't take it, so the
   * web client opens in a new tab instead.
   */
  const openSlackDm = useCallback(
    async (personId: string, personName: string) => {
      const slackId = layout.people.find(p => p.id === personId)?.slackId;
      let teamId: string | null = null;
      try {
        const res = await fetch("/api/slack-team-id");
        if (res.ok) {
          const data: { configured?: boolean; teamId?: string } = await res.json();
          if (data.configured && data.teamId) teamId = data.teamId;
        }
      } catch {
        // treated the same as "not configured" below
      }
      if (!teamId || !slackId) {
        showToast(`Slack isn't set up for ${personName} yet`);
        return;
      }

      const iframe = document.createElement("iframe");
      iframe.style.display = "none";
      let settled = false;
      const cleanup = () => {
        settled = true;
        document.removeEventListener("visibilitychange", onHide);
        window.removeEventListener("blur", onBlur);
        iframe.remove();
      };
      const onHide = () => {
        if (document.hidden) cleanup();
      };
      const onBlur = () => cleanup();
      document.addEventListener("visibilitychange", onHide);
      window.addEventListener("blur", onBlur);
      iframe.src = `slack://user?team=${encodeURIComponent(teamId)}&id=${encodeURIComponent(slackId)}`;
      document.body.appendChild(iframe);
      window.setTimeout(() => {
        if (settled) return;
        cleanup();
        window.open(
          `https://app.slack.com/client/${encodeURIComponent(teamId)}/${encodeURIComponent(slackId)}`,
          "_blank",
          "noopener",
        );
      }, SLACK_APP_WAIT_MS);
    },
    [layout, showToast],
  );

  const syncSlackIds = useCallback(async () => {
    setSyncingSlack(true);
    try {
      const res = await fetch("/api/slack-ids", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        showToast(data?.error ?? "Slack sync failed");
        return;
      }
      if (data?.configured === false) {
        showToast(data.message ?? "Slack is not configured");
        return;
      }
      showToast(
        `Slack sync: ${data.found.length} found, ${data.notFound.length} not found, ${data.skipped.length} skipped`,
      );
      void queryClient.invalidateQueries({ queryKey: ["office-layout"] });
    } catch {
      showToast("Slack sync failed");
    } finally {
      setSyncingSlack(false);
    }
  }, [queryClient, showToast]);

  const handleSwapPick = (targetDeskId: string, targetPersonId: string) => {
    const source = swapSource;
    setSwapSource(null);
    if (!source || source.deskId === targetDeskId) return;
    const newLayout: OfficeLayout = {
      ...layout,
      desks: layout.desks.map(d =>
        d.id === source.deskId
          ? { ...d, personId: targetPersonId }
          : d.id === targetDeskId
            ? { ...d, personId: source.personId }
            : d,
      ),
    };
    queryClient.setQueryData(["office-layout"], newLayout);
    void (async () => {
      try {
        const res = await fetch("/api/office-layout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newLayout),
        });
        if (!res.ok) console.error("Seat swap save failed:", res.status);
      } catch (error) {
        console.error("Seat swap save failed:", error);
      } finally {
        void queryClient.invalidateQueries({ queryKey: ["office-layout"] });
      }
    })();
  };

  const rotateDesk = useCallback(
    (deskId: string, quarters: number) => {
      const base = layout.desks.find(d => d.id === deskId)?.rotation ?? 0;
      setRotations(prev => ({ ...prev, [deskId]: turnBy(prev[deskId] ?? base, quarters) }));
    },
    [layout],
  );

  /* Wheel / trackpad zoom towards the cursor — non-passive so the page never scrolls */
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const rect = el.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const delta = e.deltaY * (e.ctrlKey ? 3 : 1);
      setView((v) => {
        const k = clamp(v.k * Math.exp(-delta * ZOOM_WHEEL_SENSITIVITY), ZOOM_MIN, ZOOM_MAX);
        const ratio = k / v.k;
        return { k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const preventTouch = (e: TouchEvent) => e.preventDefault();
    el.addEventListener("touchmove", preventTouch, { passive: false });
    return () => el.removeEventListener("touchmove", preventTouch);
  }, []);

  const zoomBy = useCallback(
    (factor: number) => {
      const v = viewRef.current;
      const px = size.w / 2;
      const py = size.h / 2;
      const k = clamp(v.k * factor, ZOOM_MIN, ZOOM_MAX);
      const ratio = k / v.k;
      animateTo({ k, x: px - (px - v.x) * ratio, y: py - (py - v.y) * ratio });
    },
    [animateTo, size.w, size.h],
  );

  const stopAnim = () => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    clickMovedRef.current = false;
    if (e.pointerType === "touch") {
      stopAnim();
      e.currentTarget.setPointerCapture(e.pointerId);
      touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      setTooltip(null);
      setResTip(prev => (prev?.pinned ? prev : null));
      if (touchesRef.current.size === 1) {
        panRef.current = {
          id: e.pointerId,
          sx: e.clientX,
          sy: e.clientY,
          vx: viewRef.current.x,
          vy: viewRef.current.y,
        };
        setPanning(true);
      } else if (touchesRef.current.size === 2) {
        const [[idA, a], [idB, b]] = [...touchesRef.current.entries()];
        const rect = e.currentTarget.getBoundingClientRect();
        const v = viewRef.current;
        const mx = (a.x + b.x) / 2 - rect.left;
        const my = (a.y + b.y) / 2 - rect.top;
        pinchRef.current = {
          idA,
          idB,
          d0: Math.hypot(a.x - b.x, a.y - b.y) || 1,
          k0: v.k,
          wx: (mx - v.x) / v.k,
          wy: (my - v.y) / v.k,
        };
        panRef.current = null;
        setPanning(true);
      }
      return;
    }
    if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
      e.preventDefault();
      stopAnim();
      e.currentTarget.setPointerCapture(e.pointerId);
      rotateDragRef.current = { id: e.pointerId, startX: e.clientX, applied: 0 };
      clickMovedRef.current = true;
      setRotateCue({ x: e.clientX, y: e.clientY });
      setTooltip(null);
      setResTip(prev => (prev?.pinned ? prev : null));
      return;
    }
    if (e.button !== 0) return;
    stopAnim();
    e.currentTarget.setPointerCapture(e.pointerId);
    panRef.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, vx: view.x, vy: view.y };
    setPanning(true);
    setTooltip(null);
    setResTip(null);
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch" && touchesRef.current.has(e.pointerId)) {
      touchesRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const pinch = pinchRef.current;
      if (pinch) {
        const a = touchesRef.current.get(pinch.idA);
        const b = touchesRef.current.get(pinch.idB);
        if (!a || !b) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const mx = (a.x + b.x) / 2 - rect.left;
        const my = (a.y + b.y) / 2 - rect.top;
        const k = clamp(pinch.k0 * (d / pinch.d0), ZOOM_MIN, ZOOM_MAX);
        clickMovedRef.current = true;
        setView({ k, x: mx - pinch.wx * k, y: my - pinch.wy * k });
        return;
      }
    }
    const rot = rotateDragRef.current;
    if (rot && rot.id === e.pointerId) {
      const steps = Math.trunc((e.clientX - rot.startX) / ROTATE_STEP_PX);
      while (steps > rot.applied) {
        rot.applied++;
        stepOrientation(1);
      }
      while (steps < rot.applied) {
        rot.applied--;
        stepOrientation(-1);
      }
      setRotateCue({ x: e.clientX, y: e.clientY });
      return;
    }
    const pan = panRef.current;
    if (!pan || pan.id !== e.pointerId) return;
    if (Math.hypot(e.clientX - pan.sx, e.clientY - pan.sy) > CLICK_SLOP_PX) {
      clickMovedRef.current = true;
    }
    setView((v) => ({ ...v, x: pan.vx + (e.clientX - pan.sx), y: pan.vy + (e.clientY - pan.sy) }));
  };

  const endPan = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (e.pointerType === "touch") {
      touchesRef.current.delete(e.pointerId);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      const pinch = pinchRef.current;
      if (pinch && (pinch.idA === e.pointerId || pinch.idB === e.pointerId)) {
        pinchRef.current = null;
        const remaining = [...touchesRef.current.entries()][0];
        if (remaining) {
          panRef.current = {
            id: remaining[0],
            sx: remaining[1].x,
            sy: remaining[1].y,
            vx: viewRef.current.x,
            vy: viewRef.current.y,
          };
        }
      } else if (panRef.current?.id === e.pointerId) {
        panRef.current = null;
      }
      if (touchesRef.current.size === 0) {
        panRef.current = null;
        setPanning(false);
      }
      return;
    }
    if (rotateDragRef.current?.id === e.pointerId) {
      rotateDragRef.current = null;
      setRotateCue(null);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      return;
    }
    const pan = panRef.current;
    if (!pan || pan.id !== e.pointerId) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    panRef.current = null;
    setPanning(false);
  };

  /* Painter's order — nearer desks (greater scene depth) draw last */
  const ordered = useMemo(
    () =>
      desks
        .map(d => {
          const p = orientPoint(d.x, d.y, orientation);
          return { ...d, x: p.x, y: p.y };
        })
        .sort((a, b) => depthOf(a.x, a.y) - depthOf(b.x, b.y)),
    [desks, orientation],
  );

  /* Level of detail, overridable from the Labels button */
  const labelsVisible =
    labelMode === "on" ? true : labelMode === "off" ? false : view.k >= LABEL_LOD_SCALE;

  const showTooltip = (desk: Desk, e: ReactPointerEvent) => {
    if (panRef.current || menu) return;
    const person = personByDesk.get(desk.id);
    if (person) {
      setTooltip({
        clientX: e.clientX,
        clientY: e.clientY,
        title: person.fullName,
        status: OFFICE_STATUS_LABEL[statusMap.get(person.id) ?? "none"],
        next: NEXT_UP_PLACEHOLDER,
      });
    } else {
      setTooltip({
        clientX: e.clientX,
        clientY: e.clientY,
        title: desk.zone === "hotdesk" ? "Hot desk" : "Empty desk",
        status: null,
        next: null,
      });
    }
  };

  const oPlateHW = orientation % 2 ? PLATE_HD0 : PLATE_HW0;
  const oPlateHD = orientation % 2 ? PLATE_HW0 : PLATE_HD0;
  const trimVec = ORIENT_VECS[orientation];
  const trimCx = PLAN_CX + trimVec.x * (oPlateHW - TRIM_DEPTH);
  const trimCy = PLAN_CY + trimVec.y * (oPlateHD - TRIM_DEPTH);
  const trimHw = trimVec.x !== 0 ? TRIM_DEPTH : oPlateHW;
  const trimHd = trimVec.y !== 0 ? TRIM_DEPTH : oPlateHD;

  const pivot = `translate(${WORLD_PIVOT.sx}px, ${WORLD_PIVOT.sy}px)`;
  const unpivot = `translate(${-WORLD_PIVOT.sx}px, ${-WORLD_PIVOT.sy}px)`;
  let worldTransform = "none";
  let worldTransition = "transform 200ms ease";
  if (orientAnim) {
    if (orientAnim.phase === "init") {
      const deg = orientAnim.dir === 1 ? -90 : 90;
      worldTransform = `${pivot} rotate(${deg}deg) scale(0.5, 2) ${unpivot}`;
      worldTransition = "none";
    } else {
      worldTransform = "none";
      worldTransition = "transform 400ms ease-in-out";
    }
  } else if (rotateCue) {
    worldTransform = `${pivot} scale(0.96) ${unpivot}`;
  }
  const billStyle = orientAnim
    ? orientAnim.phase === "init"
      ? `transform: scale(2, 0.5) rotate(${orientAnim.dir === 1 ? 90 : -90}deg); transition: none;`
      : "transform: none; transition: transform 400ms ease-in-out;"
    : "transform: none; transition: none;";

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 overflow-hidden select-none"
      style={{ background: C_PAGE_BG, fontFamily: "var(--font-poppins), sans-serif", touchAction: "none" }}
    >
      <style>{`
        @keyframes norman-bob {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-${BOB_TRAVEL}px); }
        }
        .norman-bob { animation: norman-bob ${BOB_SECONDS}s ease-in-out infinite; }
        .norman-menu-item { color: ${C_INK}; transition: color 120ms ease, background 120ms ease; }
        .norman-bill { ${billStyle} }
        .norman-menu-item:hover { color: ${C_RED}; background: rgba(220,38,38,0.07); }
      `}</style>

      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        className="block h-full w-full"
        style={{ cursor: panning ? "grabbing" : "grab", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onMouseDown={e => {
          if (e.button === 1) e.preventDefault();
        }}
        onContextMenu={e => {
          if (rotateDragRef.current) e.preventDefault();
        }}
      >
        <defs>
          <pattern id="norman-dots" width={GRID_SPACING} height={GRID_SPACING} patternUnits="userSpaceOnUse">
            <circle cx={GRID_SPACING / 2} cy={GRID_SPACING / 2} r={GRID_DOT_R} fill={C_GRID_DOT} />
          </pattern>
          <filter id="norman-island-shadow" x="-30%" y="-30%" width="160%" height="180%">
            <feGaussianBlur stdDeviation={PLATE_SHADOW_BLUR} />
          </filter>
          <filter id="norman-pill-shadow" x="-40%" y="-60%" width="180%" height="240%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.4" floodColor="#35322e" floodOpacity="0.18" />
          </filter>
          <pattern
            id="norman-timeoff"
            patternUnits="userSpaceOnUse"
            width={6}
            height={6}
            patternTransform="rotate(45)"
          >
            <rect width={6} height={6} fill="#E2E8F0" />
            <rect width={3} height={6} fill="#94A3B8" />
          </pattern>
        </defs>

        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          {/* Infinite board */}
          <rect
            x={-GRID_EXTENT}
            y={-GRID_EXTENT}
            width={GRID_EXTENT * 2}
            height={GRID_EXTENT * 2}
            fill="url(#norman-dots)"
          />

          <g style={{ transform: worldTransform, transition: worldTransition }}>

          {/* Soft shadow so the island floats */}
          <ellipse
            cx={((PLATE_X0 + PLATE_X1) / 2 - (PLATE_Y0 + PLATE_Y1) / 2) * ISO_X}
            cy={((PLATE_X0 + PLATE_X1) / 2 + (PLATE_Y0 + PLATE_Y1) / 2) * ISO_Y + PLATE_THICK + PLATE_SHADOW_DROP}
            rx={((PLATE_X1 - PLATE_X0 + PLATE_Y1 - PLATE_Y0) * ISO_X) / 2 - 20}
            ry={((PLATE_X1 - PLATE_X0 + PLATE_Y1 - PLATE_Y0) * ISO_Y) / 2 - 20}
            fill="rgba(53,50,46,0.16)"
            filter="url(#norman-island-shadow)"
          />

          {/* Floor plate */}
          <IsoBox
            cx={PLAN_CX}
            cy={PLAN_CY}
            hw={oPlateHW}
            hd={oPlateHD}
            z={-PLATE_THICK}
            h={PLATE_THICK}
            top={C_PLATE_TOP}
            left={C_PLATE_LEFT}
            right={C_PLATE_RIGHT}
          />

          {/* Red steel trim on the brick-wall edge, tracking the view orientation */}
          <IsoBox
            cx={trimCx}
            cy={trimCy}
            hw={trimHw}
            hd={trimHd}
            z={0}
            h={TRIM_HEIGHT}
            top={C_RED_LIGHT}
            left={C_RED}
            right={C_RED_DARK}
          />

          {/* Desks, figures, plants — painter's order */}
          {(() => {
            const items: { key: string; sort: number; node: ReactNode }[] = [];

            PLANTS.forEach((plant, i) => {
              const pos = orientPoint(plant.x, plant.y, orientation);
              items.push({
                key: `plant-${i}`,
                sort: depthOf(pos.x, pos.y),
                node: <Plant x={pos.x} y={pos.y} tint={plant.tint} />,
              });
            });

            ordered.forEach((baseDesk, i) => {
              const rotated = rotatedDesk(baseDesk, rotations[baseDesk.id] ?? baseDesk.rotation ?? 0);
              const desk =
                orientation === 0 ? rotated : { ...rotated, facing: orientFacing(rotated.facing, orientation) };
              const person = personByDesk.get(desk.id);
              const isHovered = hovered === desk.id;
              const anchor = iso(desk.x, desk.y, 0);
              const seat = seatOf(desk);
              const seatAnchor = iso(seat.x, seat.y, 0);
              const figure =
                person ? (
                  <Figure
                    desk={desk}
                    person={person}
                    week={resWeekByFullName.get(person.fullName)}
                    resHover={resHover}
                    headshotVersion={headshotVersions[person.id]}
                    feedStatus={statusMap.get(person.id) ?? "none"}
                    swapActive={swapSource !== null}
                    onSwapPick={() => handleSwapPick(desk.id, person.id)}
                    onPersonClick={() => {
                      if (clickMovedRef.current || rotateDragRef.current) return;
                      void openSlackDm(person.id, person.fullName);
                    }}
                    onPersonContextMenu={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (rotateDragRef.current) return;
                      setTooltip(null);
                      setMenu(null);
                      setPersonMenu({
                        deskId: desk.id,
                        personId: person.id,
                        personName: person.fullName,
                        clientX: e.clientX,
                        clientY: e.clientY,
                      });
                    }}
                  />
                ) : null;
              const behind = seatIsBehindDesk(desk.facing);

              items.push({
                key: `desk-${desk.id}`,
                sort: depthOf(desk.x, desk.y) + 0.001,
                node: (
                  <g
                    style={{
                      transform: isHovered ? `translateY(${-HOVER_LIFT}px)` : "translateY(0px)",
                      transition: "transform 150ms ease",
                    }}
                    onPointerEnter={(e) => {
                      setHovered(desk.id);
                      showTooltip(desk, e);
                    }}
                    onPointerMove={(e) => showTooltip(desk, e)}
                    onPointerLeave={() => {
                      setHovered((h) => (h === desk.id ? null : h));
                      setTooltip(null);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (rotateDragRef.current) return;
                      setTooltip(null);
                      setMenu({ deskId: desk.id, clientX: e.clientX, clientY: e.clientY });
                    }}
                  >
                    {/* hit shapes, kept close to the artwork so neighbours stay reachable */}
                    <ellipse
                      cx={anchor.sx}
                      cy={anchor.sy + HIT_DESK_DY}
                      rx={HIT_DESK_RX}
                      ry={HIT_DESK_RY}
                      fill="transparent"
                    />
                    {figure ? (
                      <circle
                        cx={seatAnchor.sx}
                        cy={seatAnchor.sy + HIT_FIGURE_DY}
                        r={HIT_FIGURE_R}
                        fill="transparent"
                      />
                    ) : null}
                    {behind ? figure : null}
                    <DeskBlock desk={desk} index={i} />
                    {behind ? null : figure}
                    {person ? (
                      <NamePill
                        x={desk.x}
                        y={desk.y}
                        drop={PILL_DROP}
                        label={person.name}
                        visible={labelsVisible}
                      />
                    ) : null}
                  </g>
                ),
              });
            });

            return items
              .sort((a, b) => a.sort - b.sort)
              .map((item) => <g key={item.key}>{item.node}</g>);
          })()}

          {/* Zone signs stay legible at every zoom level */}
          <g pointerEvents="none">
            <NamePill
              x={orientPoint(DIRECTORS_SIGN.x, DIRECTORS_SIGN.y, orientation).x}
              y={orientPoint(DIRECTORS_SIGN.x, DIRECTORS_SIGN.y, orientation).y}
              lift={DIRECTORS_SIGN.lift}
              label="Directors"
              large
            />
            <NamePill
              x={orientPoint(HOTDESK_SIGN.x, HOTDESK_SIGN.y, orientation).x}
              y={orientPoint(HOTDESK_SIGN.x, HOTDESK_SIGN.y, orientation).y}
              lift={HOTDESK_SIGN.lift}
              label="Hot desk"
              large
            />
          </g>

          </g>
        </g>
      </svg>

      {/* Fixed overlay: exit button */}
      <Link
        href="/dashboard"
        aria-label="Close and return to dashboard"
        className="fixed left-6 top-6 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white transition-colors hover:bg-[#FEF2F2]"
        style={{ boxShadow: "0 2px 10px rgba(53,50,46,0.14)" }}
      >
        <X className="h-6 w-6" strokeWidth={3} style={{ color: C_RED }} />
      </Link>

      {/* Fixed overlay: identity + legend */}
      <div className="pointer-events-none fixed left-6 top-20 z-10">
        <div className="text-[22px] font-bold leading-none tracking-tight" style={{ color: C_INK }}>
          WHITE RED
        </div>
        <div className="mt-1.5 text-[10px] font-medium tracking-[0.22em]" style={{ color: C_INK_SOFT }}>
          STUDIO — LIVE VIEW
        </div>
        <div
          className="mt-4 inline-flex flex-col gap-1.5 rounded-2xl px-3 py-2.5"
          style={{ background: "rgba(255,255,255,0.82)", boxShadow: "0 2px 10px rgba(53,50,46,0.10)" }}
        >
          {LEGEND.map((entry) => (
            <div key={entry.status} className="flex items-center gap-2">
              <svg viewBox="0 0 24 24" width={15} height={15} aria-hidden>
                <StatusGlyph status={entry.status} />
              </svg>
              <span
                className="text-[9px] font-semibold tracking-[0.14em]"
                style={{ color: C_INK }}
              >
                {entry.label.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {officeStatusData?.source === "placeholder" ? (
        <div className="pointer-events-none fixed bottom-6 left-6 z-10 rounded-full bg-gray-200/90 px-3 py-1 text-[10px] font-medium tracking-wide text-gray-600">
          Status: sample data
        </div>
      ) : null}

      {/* Fixed overlay: zoom controls */}
      <div className="fixed bottom-6 right-6 z-10 flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => zoomBy(1 / ZOOM_BUTTON_STEP)}
          aria-label="Zoom out"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg font-medium transition hover:bg-neutral-100"
          style={{ color: C_INK, boxShadow: "0 2px 10px rgba(53,50,46,0.14)" }}
        >
          −
        </button>
        <button
          type="button"
          onClick={() => zoomBy(ZOOM_BUTTON_STEP)}
          aria-label="Zoom in"
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg font-medium transition hover:bg-neutral-100"
          style={{ color: C_INK, boxShadow: "0 2px 10px rgba(53,50,46,0.14)" }}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => animateTo(fitView(size.w, size.h, orientation))}
          className="flex h-9 items-center justify-center rounded-xl bg-white px-3.5 text-[10px] font-semibold tracking-[0.14em] transition hover:bg-neutral-100"
          style={{ color: C_INK, boxShadow: "0 2px 10px rgba(53,50,46,0.14)" }}
        >
          FIT
        </button>
        <button
          type="button"
          onClick={() => setLabelMode((m) => LABEL_MODE_NEXT[m])}
          aria-label={`Labels: ${labelMode}`}
          className="flex h-9 items-center justify-center rounded-xl bg-white px-3.5 text-[10px] font-semibold tracking-[0.14em] transition hover:bg-neutral-100"
          style={{ color: C_INK, boxShadow: "0 2px 10px rgba(53,50,46,0.14)" }}
        >
          {`LABELS ${labelMode.toUpperCase()}`}
        </button>
        <button
          type="button"
          onClick={() => copyText(serialiseDesks(desks, rotations))}
          className="flex h-9 items-center justify-center rounded-xl bg-white px-3.5 text-[10px] font-semibold tracking-[0.14em] transition hover:bg-neutral-100"
          style={{ color: copied ? C_RED : C_INK, boxShadow: "0 2px 10px rgba(53,50,46,0.14)" }}
        >
          {copied ? "COPIED" : "COPY LAYOUT"}
        </button>
        {signedIn ? (
          <button
            type="button"
            onClick={() => void syncSlackIds()}
            disabled={syncingSlack}
            className="flex h-9 items-center justify-center rounded-xl bg-white px-3.5 text-[10px] font-semibold tracking-[0.14em] transition hover:bg-neutral-100 disabled:opacity-60"
            style={{ color: C_INK, boxShadow: "0 2px 10px rgba(53,50,46,0.14)" }}
          >
            {syncingSlack ? "SYNCING…" : "SYNC SLACK IDS"}
          </button>
        ) : null}
      </div>

      {menu ? (
        <div
          ref={menuRef}
          className="fixed z-30 overflow-hidden rounded-xl bg-white py-1"
          style={{
            left: Math.max(MENU_EDGE_PAD, Math.min(menu.clientX, size.w - MENU_W - MENU_EDGE_PAD)),
            top: Math.max(MENU_EDGE_PAD, Math.min(menu.clientY, size.h - MENU_H - MENU_EDGE_PAD)),
            width: MENU_W,
            boxShadow: "0 6px 24px rgba(53,50,46,0.18)",
            fontFamily: "var(--font-roboto), sans-serif",
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <button
            type="button"
            className="norman-menu-item block w-full px-3 py-1.5 text-left text-[11px]"
            onClick={() => {
              rotateDesk(menu.deskId, 1);
              setMenu(null);
            }}
          >
            Rotate right 90°
          </button>
          <button
            type="button"
            className="norman-menu-item block w-full px-3 py-1.5 text-left text-[11px]"
            onClick={() => {
              rotateDesk(menu.deskId, -1);
              setMenu(null);
            }}
          >
            Rotate left 90°
          </button>
          <button
            type="button"
            className="norman-menu-item block w-full px-3 py-1.5 text-left text-[11px]"
            onClick={() => {
              const target = desks.find((d) => d.id === menu.deskId);
              if (target) copyText(serialiseDesk(target, rotations[target.id] ?? target.rotation ?? 0));
              setMenu(null);
            }}
          >
            Copy this desk&rsquo;s data
          </button>
        </div>
      ) : null}

      {personMenu ? (
        <div
          ref={personMenuRef}
          className="fixed z-30 overflow-hidden rounded-xl bg-white py-1"
          style={{
            left: Math.max(MENU_EDGE_PAD, Math.min(personMenu.clientX, size.w - MENU_W - MENU_EDGE_PAD)),
            top: Math.max(MENU_EDGE_PAD, Math.min(personMenu.clientY, size.h - PERSON_MENU_H - MENU_EDGE_PAD)),
            width: MENU_W,
            boxShadow: "0 6px 24px rgba(53,50,46,0.18)",
            fontFamily: "var(--font-roboto), sans-serif",
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <p className="px-3 pb-0.5 pt-1 text-[10px] uppercase tracking-wide text-gray-400">
            {personMenu.personName}
          </p>
          <button
            type="button"
            className="norman-menu-item block w-full px-3 py-1.5 text-left text-[11px]"
            onClick={e => {
              e.stopPropagation();
              const { personId, personName } = personMenu;
              setPersonMenu(null);
              void openSlackDm(personId, personName);
            }}
          >
            Message on Slack
          </button>
          <button
            type="button"
            className="norman-menu-item block w-full px-3 py-1.5 text-left text-[11px]"
            onClick={() => {
              setSwapSource({
                deskId: personMenu.deskId,
                personId: personMenu.personId,
                name: personMenu.personName,
              });
              setPersonMenu(null);
            }}
          >
            Swap seat&hellip;
          </button>
          <button
            type="button"
            className="norman-menu-item block w-full px-3 py-1.5 text-left text-[11px]"
            onClick={() => {
              setPhotoTarget({ personId: personMenu.personId, name: personMenu.personName });
              setPersonMenu(null);
            }}
          >
            Add photo&hellip;
          </button>
        </div>
      ) : null}

      <HeadshotDialog
        open={photoTarget !== null}
        onOpenChange={open => {
          if (!open) setPhotoTarget(null);
        }}
        personId={photoTarget?.personId ?? ""}
        personName={photoTarget?.name ?? ""}
        onUploaded={() => {
          const id = photoTarget?.personId;
          if (id) setHeadshotVersions(prev => ({ ...prev, [id]: Date.now() }));
        }}
      />

      {swapSource ? (
        <div
          className="pointer-events-none fixed left-1/2 top-6 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-xs font-semibold"
          style={{ color: C_INK, boxShadow: "0 4px 18px rgba(53,50,46,0.18)" }}
        >
          Click the person to swap with (Esc to cancel)
        </div>
      ) : null}

      {/* Resourcing tooltip — near the head, clamped to the viewport */}
      {resTip ? (
        <div
          className="pointer-events-none fixed z-20 rounded-xl bg-white px-3 py-2"
          style={{
            left: Math.max(8, Math.min(resTip.x + 14, size.w - RES_TIP_W)),
            top: Math.max(8, Math.min(resTip.y + 14, size.h - RES_TIP_H)),
            boxShadow: "0 4px 18px rgba(53,50,46,0.18)",
          }}
        >
          <CellInfoLines info={resTip.info} />
        </div>
      ) : null}

      {/* Toast — small transient notice, bottom centre */}
      {toast ? (
        <div
          className="pointer-events-none fixed bottom-6 left-1/2 z-40 -translate-x-1/2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-xs font-semibold"
          style={{ color: C_INK, boxShadow: "0 4px 18px rgba(53,50,46,0.18)" }}
          role="status"
        >
          {toast}
        </div>
      ) : null}

      {/* Rotate-mode cursor cue */}
      {rotateCue ? (
        <div
          className="pointer-events-none fixed z-30 flex h-8 w-8 items-center justify-center rounded-full bg-white"
          style={{
            left: rotateCue.x + 14,
            top: rotateCue.y + 14,
            boxShadow: "0 2px 10px rgba(53,50,46,0.2)",
          }}
        >
          <RefreshCw className="h-4 w-4" style={{ color: C_RED }} />
        </div>
      ) : null}

      {/* Hover tooltip */}
      {tooltip && !panning ? (
        <div
          className="pointer-events-none fixed z-20 rounded-xl bg-white px-3 py-2"
          style={{
            left: tooltip.clientX + 14,
            top: tooltip.clientY + 14,
            boxShadow: "0 4px 18px rgba(53,50,46,0.18)",
          }}
        >
          <div className="text-[12px] font-semibold leading-tight" style={{ color: C_INK }}>
            {tooltip.title}
          </div>
          {tooltip.status ? (
            <div className="mt-0.5 text-[11px] leading-tight" style={{ color: C_INK_SOFT }}>
              {tooltip.status}
            </div>
          ) : null}
          {tooltip.next ? (
            <div className="mt-1 text-[10px] leading-tight" style={{ color: C_INK_SOFT }}>
              {tooltip.next}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
