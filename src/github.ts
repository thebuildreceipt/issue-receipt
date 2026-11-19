/** Minimal GitHub REST calls using the Actions-provided GITHUB_TOKEN. */
const API = "https://api.github.com";

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  };
}

async function call(token: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, { method, headers: headers(token), body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) throw new Error(`GitHub ${method} ${path} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function listLabels(token: string, repo: string): Promise<string[]> {
  const labels = (await call(token, "GET", `/repos/${repo}/labels?per_page=100`)) as { name: string }[];
  return labels.map((l) => l.name);
}

export async function addLabels(token: string, repo: string, issue: number, labels: string[]) {
  if (labels.length) await call(token, "POST", `/repos/${repo}/issues/${issue}/labels`, { labels });
}

export async function comment(token: string, repo: string, issue: number, body: string) {
  await call(token, "POST", `/repos/${repo}/issues/${issue}/comments`, { body });
}
