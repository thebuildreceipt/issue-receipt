import { test } from "node:test";
import assert from "node:assert/strict";
import { safeLabels, renderComment } from "../src/guard.js";
import { buildPrompt } from "../src/triage.js";
import { costUsd } from "../src/cost.js";
import type { Triage } from "../src/schema.js";

const repoLabels = ["bug", "enhancement", "Checkout", "p0", "p1", "p2", "p3"];
const base: Triage = { labels: [], priority: "p2", summary: "s", missing_info: [] };

test("keeps only labels that exist in the repo, case-insensitively", () => {
  const out = safeLabels({ ...base, labels: ["bug", "checkout", "approved", "wontfix"] }, repoLabels);
  assert.deepEqual(out, ["bug", "Checkout", "p2"]);
});

test("caps at 3 labels plus priority and removes duplicates", () => {
  const out = safeLabels({ ...base, labels: ["bug", "BUG", "enhancement", "checkout", "p0"] }, repoLabels);
  assert.deepEqual(out, ["bug", "enhancement", "Checkout", "p2"]);
});

test("comment cannot ping people, add links or HTML", () => {
  const body = renderComment(
    { ...base, summary: "Hi @everyone <script>x</script> see [here](https://evil.example)", missing_info: ["@admin please"] },
    "$0.0012",
  );
  assert.ok(!body.includes("@everyone"));
  assert.ok(!body.includes("@admin"));
  assert.ok(!body.includes("<script>"));
  assert.ok(!body.includes("https://"));
});

test("asks for missing info only when something is missing", () => {
  assert.ok(renderComment({ ...base, missing_info: ["Version"] }, "$0").includes("could you add"));
  assert.ok(renderComment(base, "$0").includes("has everything"));
});

test("wraps untrusted issue text in tags and truncates huge bodies", () => {
  const prompt = buildPrompt("t", "x".repeat(20_000), ["bug"]);
  assert.ok(prompt.includes("<issue>"));
  assert.ok(prompt.length < 9_000);
});

test("computes a per-issue cost", () => {
  assert.equal(costUsd("claude-opus-5-5", 1_000, 200), 0.008);
});
