// Waits for Vercel to report success for this commit, then prints the PR's Preview URL (from the Vercel bot comment).
// Read-only: uses the workflow's GITHUB_TOKEN with statuses/pull-requests read permission.
const { GITHUB_TOKEN, GITHUB_REPOSITORY, SHA, PR } = process.env;
const api = (path) => fetch(`https://api.github.com/repos/${GITHUB_REPOSITORY}${path}`, { headers: { authorization: `Bearer ${GITHUB_TOKEN}`, accept: "application/vnd.github+json" } }).then((r) => r.json());
const deadline = Date.now() + 15 * 60_000;
for (;;) {
  const status = await api(`/commits/${SHA}/status`);
  const vercel = (status.statuses ?? []).find((s) => s.context === "Vercel");
  if (vercel?.state === "success") break;
  if (vercel?.state === "failure" || vercel?.state === "error") { console.error(`Vercel deployment ${vercel.state}`); process.exit(1); }
  if (Date.now() > deadline) { console.error("Timed out waiting for the Vercel Preview"); process.exit(1); }
  await new Promise((r) => setTimeout(r, 20_000));
}
const comments = await api(`/issues/${PR}/comments?per_page=100`);
const bot = [...comments].reverse().find((c) => c.user?.login === "vercel[bot]");
const url = bot?.body.match(/\[Preview\]\((https:\/\/[a-z0-9-]+\.vercel\.app)\)/)?.[1];
if (!url) { console.error("No Preview URL in the Vercel bot comment"); process.exit(1); }
console.log(url);
