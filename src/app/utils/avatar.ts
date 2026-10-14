/** Initiales à partir de nomComplet (ex. « Amina Tombo » → « AT »). */
export function initialsOf(name?: string | null): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts.slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}
