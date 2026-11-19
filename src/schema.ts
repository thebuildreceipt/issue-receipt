import { z } from "zod";

export const TriageSchema = z.object({
  labels: z.array(z.string()).describe("Labels to apply. Use ONLY names from the provided label list."),
  priority: z.enum(["p0", "p1", "p2", "p3"]).describe("p0 = broken for everyone, p3 = nice to have"),
  summary: z.string().describe("One sentence describing the issue for maintainers"),
  missing_info: z
    .array(z.string())
    .describe("Information a maintainer would need but the issue lacks (versions, steps, logs). Empty if complete."),
});

export type Triage = z.infer<typeof TriageSchema>;
