#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { safeLabels, renderComment } from "./guard.js";
import { costUsd } from "./cost.js";
import type { Triage } from "./schema.js";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const eventPath = args.find((a) => !a.startsWith("--")) ?? process.env.GITHUB_EVENT_PATH;
if (!eventPath) throw new Error("No event file. Run inside GitHub Actions or pass one: main.js --dry-run event.json");

const event = JSON.parse(await readFile(eventPath, "utf8"));
const issue = event.issue as { number: number; title: string; body: string | null };
const repo: string = event.repository?.full_name ?? process.env.GITHUB_REPOSITORY;

let repoLabels: string[];
let triage: Triage;
let costLine: string;

if (dryRun) {
  // Free test: saved labels and a saved model answer, nothing is sent anywhere.
  const dir = path.dirname(eventPath);
  repoLabels = JSON.parse(await readFile(path.join(dir, "labels.json"), "utf8"));
  triage = JSON.parse(await readFile(path.join(dir, "sample-triage.json"), "utf8"));
  costLine = "dry run, $0.00";
} else {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("ANTHROPIC_API_KEY is not set; skipping triage.");
    process.exit(0);
  }
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("GITHUB_TOKEN is not set.");
  const { listLabels } = await import("./github.js");
  const { triageIssue } = await import("./triage.js");
  repoLabels = await listLabels(token, repo);
  const result = await triageIssue(issue.title, issue.body ?? "", repoLabels);
  triage = result.triage;
  const cost = costUsd(result.model, result.usage.input_tokens, result.usage.output_tokens);
  costLine = cost === null ? result.model : `$${cost.toFixed(4)}`;
}

const labels = safeLabels(triage, repoLabels);
const body = renderComment(triage, costLine);

if (dryRun) {
  console.log(`Would label #${issue.number}: ${labels.join(", ") || "(none)"}\n\n${body}`);
} else {
  const { addLabels, comment } = await import("./github.js");
  const token = process.env.GITHUB_TOKEN!;
  await addLabels(token, repo, issue.number, labels);
  await comment(token, repo, issue.number, body);
  console.log(`Triaged #${issue.number}: ${labels.join(", ")} · ${costLine}`);
}
