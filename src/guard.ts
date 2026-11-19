import type { Triage } from "./schema.js";

/**
 * The issue text is written by strangers, so treat the model's answer as untrusted too.
 * Code, not the prompt, decides what is allowed:
 *  - only labels that already exist in the repo (the model can't invent or add "approved" etc.)
 *  - at most 3 labels plus the priority label
 *  - the comment is built from a fixed template, never free text from the model
 */
export function safeLabels(triage: Triage, repoLabels: string[]): string[] {
  const allowed = new Map(repoLabels.map((l) => [l.toLowerCase(), l]));
  const picked = triage.labels
    .map((l) => allowed.get(l.trim().toLowerCase()))
    .filter((l): l is string => Boolean(l));
  const unique = [...new Set(picked)].slice(0, 3);
  const priority = allowed.get(triage.priority);
  return priority ? [...unique, priority] : unique;
}

const clean = (s: string) =>
  s
    .replace(/@/g, "@​") // never ping anyone
    .replace(/[<>]/g, "") // no HTML
    .replace(/\]\(|https?:\/\//gi, "") // no links
    .slice(0, 300);

export function renderComment(triage: Triage, costLine: string): string {
  const missing = triage.missing_info.slice(0, 5).map((m) => `- ${clean(m)}`);
  const ask = missing.length
    ? `To help us fix this faster, could you add:\n${missing.join("\n")}`
    : "Thanks, this has everything we need to look into it.";
  return `**Auto-triage** · priority \`${triage.priority}\`

> ${clean(triage.summary)}

${ask}

<sub>Triaged by an AI workflow · ${costLine} · a maintainer will review.</sub>`;
}
