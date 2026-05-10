// Edit these emails to match the actual Workspace addresses if different.
export const DIRECTORS = [
  { name: "Dicky Lewis",   email: "dicky@white-red.co.uk" },
  { name: "Joe Haire",     email: "joe@white-red.co.uk"   },
  { name: "Jesus Jimenez", email: "jesus@white-red.co.uk" },
];

export function getDirectorByEmail(email: string) {
  return DIRECTORS.find(d => d.email.toLowerCase() === email.toLowerCase()) ?? null;
}
