const GITHUB_RESERVED_PATHS = new Set([
  "about",
  "codespaces",
  "collections",
  "contact",
  "customer-stories",
  "enterprise",
  "events",
  "explore",
  "features",
  "gist",
  "github-copilot",
  "issues",
  "login",
  "marketplace",
  "new",
  "notifications",
  "organizations",
  "orgs",
  "pricing",
  "pulls",
  "search",
  "security",
  "settings",
  "signup",
  "site",
  "sponsors",
  "team",
  "teams",
  "topics",
  "trending",
]);

const USERNAME_PATTERN = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function parseGitHubUsername(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;

  const direct = raw.replace(/^@+/, "");
  if (USERNAME_PATTERN.test(direct)) {
    return direct;
  }

  const normalizedUrl = raw.startsWith("http://") || raw.startsWith("https://")
    ? raw
    : `https://${raw}`;

  try {
    const url = new URL(normalizedUrl);
    if (!url.hostname.endsWith("github.com")) {
      return null;
    }

    const firstSegment = url.pathname.split("/").filter(Boolean)[0] ?? "";
    const candidate = firstSegment.replace(/^@+/, "");
    if (!candidate) {
      return null;
    }

    if (GITHUB_RESERVED_PATHS.has(candidate.toLowerCase())) {
      return null;
    }

    return USERNAME_PATTERN.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}
