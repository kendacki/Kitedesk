// KiteDesk | public URLs for marketing footer (set NEXT_PUBLIC_GITHUB_REPO_URL when the repo moves)

export const GITHUB_REPO_URL =
  process.env.NEXT_PUBLIC_GITHUB_REPO_URL?.trim() ||
  'https://github.com/kendacki/Kitedesk'

export const githubLicenseUrl = `${GITHUB_REPO_URL}/blob/main/LICENSE.md`
