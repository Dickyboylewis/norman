/**
 * Studio floor data for the White Red office view.
 *
 * Plan coordinates: `x` runs across the studio, `y` runs down it.
 * One unit is one desk width. Nothing here knows about pixels or isometry —
 * the drawing layer owns all of that.
 */

export type PersonStatus = "desk" | "zoom" | "site" | "holiday" | "sick" | "wfh";

/** The direction the seated person looks — also the side the monitor sits on. */
export type Facing = "n" | "e" | "s" | "w";

/** Quarter-turns applied on top of `facing`, clockwise on the plan. */
export type DeskRotation = 0 | 90 | 180 | 270;

export interface Desk {
  id: string;
  x: number;
  y: number;
  zone: "studio" | "directors" | "hotdesk";
  facing: Facing;
  rotation?: DeskRotation;
}

export interface Person {
  id: string;
  name: string;
  fullName: string;
  deskId: string;
  status: PersonStatus;
  photo: string | null;
}

/*
 * x runs west to east across the plan, y runs north to south down it, and one
 * unit is one desk width. Facing is the direction the seated person looks, so
 * the monitor sits on that edge of the desk and the seat on the opposite one.
 *
 * Desks that share a coordinate step of 1.0 (or 0.7 across a bench spine) are
 * meant to touch; the drawing layer renders each footprint slightly under size
 * so a hairline seam shows instead of the blocks merging.
 */
export const DESKS: Desk[] = [
  { id: "kit", x: 0, y: 0, zone: "studio", facing: "s", rotation: 270 },
  { id: "alice", x: 1, y: 0, zone: "studio", facing: "s", rotation: 90 },
  { id: "dani", x: 0, y: 0.7, zone: "studio", facing: "n", rotation: 90 },
  { id: "josh", x: 1, y: 0.7, zone: "studio", facing: "n", rotation: 270 },
  { id: "jess", x: 3.4, y: 0, zone: "studio", facing: "s", rotation: 270 },
  { id: "euan", x: 4.4, y: 0, zone: "studio", facing: "s", rotation: 90 },
  { id: "tino", x: 3.4, y: 0.7, zone: "studio", facing: "n", rotation: 90 },
  { id: "jasmine", x: 4.4, y: 0.7, zone: "studio", facing: "n", rotation: 270 },
  { id: "francesc", x: 6.8, y: 0, zone: "studio", facing: "s", rotation: 270 },
  { id: "jules", x: 7.8, y: 0, zone: "studio", facing: "s", rotation: 90 },
  { id: "dilan", x: 6.8, y: 0.7, zone: "studio", facing: "n", rotation: 90 },
  { id: "miles", x: 7.8, y: 0.7, zone: "studio", facing: "n", rotation: 270 },
  { id: "hope", x: 10.2, y: 0, zone: "studio", facing: "s", rotation: 270 },
  { id: "riley", x: 11.2, y: 0, zone: "studio", facing: "s", rotation: 90 },
  { id: "jonathan", x: 10.2, y: 0.7, zone: "studio", facing: "n", rotation: 90 },
  { id: "michael", x: 11.2, y: 0.7, zone: "studio", facing: "n", rotation: 270 },
  { id: "paloma", x: 13.6, y: 0, zone: "studio", facing: "e" },
  { id: "james", x: 13.6, y: 1.5, zone: "studio", facing: "e" },
  { id: "joe", x: 13.6, y: 3, zone: "studio", facing: "e" },
  { id: "artem", x: 0, y: 4.6, zone: "studio", facing: "n", rotation: 180 },
  { id: "josephine", x: 1, y: 4.6, zone: "studio", facing: "n", rotation: 180 },
  { id: "katy", x: 2, y: 4.6, zone: "studio", facing: "n", rotation: 180 },
  { id: "dicky", x: 6.2, y: 5.6, zone: "directors", facing: "n", rotation: 90 },
  { id: "jesus", x: 7.2, y: 5.6, zone: "directors", facing: "n", rotation: 270 },
  { id: "hotdesk", x: 10.2, y: 5.2, zone: "hotdesk", facing: "w", rotation: 270 },
];

export const PEOPLE: Person[] = [
  { id: "kit", name: "Kit", fullName: "Kit Gunaratne", deskId: "kit", status: "wfh", photo: null },
  { id: "alice", name: "Alice", fullName: "Alice", deskId: "alice", status: "desk", photo: null },
  { id: "dani", name: "Dani", fullName: "Dani", deskId: "dani", status: "desk", photo: null },
  { id: "josh", name: "Josh", fullName: "Josh", deskId: "josh", status: "desk", photo: null },

  { id: "jess", name: "Jess", fullName: "Jess", deskId: "jess", status: "desk", photo: null },
  { id: "euan", name: "Euan", fullName: "Euan", deskId: "euan", status: "desk", photo: null },
  { id: "tino", name: "Tino", fullName: "Tino Baranda", deskId: "tino", status: "desk", photo: null },
  { id: "jasmine", name: "Jasmine", fullName: "Jasmine", deskId: "jasmine", status: "desk", photo: null },

  { id: "francesc", name: "Francesc", fullName: "Francesc Montosa", deskId: "francesc", status: "sick", photo: null },
  { id: "jules", name: "Jules", fullName: "Jules", deskId: "jules", status: "desk", photo: null },
  { id: "dilan", name: "Dilan", fullName: "Dilan", deskId: "dilan", status: "desk", photo: null },
  { id: "miles", name: "Miles", fullName: "Miles", deskId: "miles", status: "desk", photo: null },

  { id: "hope", name: "Hope", fullName: "Hope", deskId: "hope", status: "desk", photo: null },
  { id: "riley", name: "Riley", fullName: "Riley", deskId: "riley", status: "desk", photo: null },
  { id: "jonathan", name: "Jonathan", fullName: "Jonathan Spratt", deskId: "jonathan", status: "desk", photo: null },
  { id: "michael", name: "Michael", fullName: "Michael", deskId: "michael", status: "desk", photo: null },

  { id: "paloma", name: "Paloma", fullName: "Paloma Quintana", deskId: "paloma", status: "holiday", photo: null },
  { id: "james", name: "James", fullName: "James", deskId: "james", status: "desk", photo: null },
  { id: "joe", name: "Joe", fullName: "Joe Haire", deskId: "joe", status: "desk", photo: "/joe.png" },

  { id: "artem", name: "Artem", fullName: "Artem", deskId: "artem", status: "desk", photo: null },
  { id: "josephine", name: "Josephine", fullName: "Josephine", deskId: "josephine", status: "desk", photo: null },
  { id: "katy", name: "Katy", fullName: "Katy", deskId: "katy", status: "desk", photo: null },

  { id: "dicky", name: "Dicky", fullName: "Dicky Lewis", deskId: "dicky", status: "zoom", photo: "/dicky.png" },
  { id: "jesus", name: "Jesus", fullName: "Jesus Jimenez", deskId: "jesus", status: "site", photo: "/jesus.png" },
];
