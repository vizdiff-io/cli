/**
 * Auto-detection of CI environment metadata.
 *
 * When the CLI runs inside a CI provider, the commit SHA, branch, base branch,
 * base commit, and pull/merge request number are usually exposed as predefined
 * environment variables. Reading these is more reliable than inferring them from
 * the local `git` checkout, which on CI is often a shallow/detached clone.
 *
 * Each value is only populated when the provider exposes it. Empty strings are
 * treated as "not set" so a blank predefined variable does not override a value
 * resolved from a flag or local git.
 */
export type CiMetadata = {
  commitSha?: string
  branch?: string
  baseBranch?: string
  baseCommitSha?: string
  prNumber?: number
}

type Env = Record<string, string | undefined>

/**
 * Resolve CI metadata from predefined environment variables. Returns an empty
 * object when no supported CI provider is detected.
 */
export function detectCiMetadata(env: Env = process.env): CiMetadata {
  if (isGitLabCi(env)) {
    return detectGitLabCi(env)
  }
  return {}
}

/** Returns true when running inside GitLab CI/CD. */
export function isGitLabCi(env: Env = process.env): boolean {
  return firstNonEmpty(env.GITLAB_CI) != undefined
}

/**
 * Resolve metadata from GitLab CI/CD predefined variables.
 *
 * @see https://docs.gitlab.com/ci/variables/predefined_variables/
 */
function detectGitLabCi(env: Env): CiMetadata {
  // In a merge request pipeline, CI_COMMIT_REF_NAME points at the source branch
  // and CI_MERGE_REQUEST_* variables describe the target. In a branch (push)
  // pipeline, only the CI_COMMIT_* and CI_DEFAULT_BRANCH variables are present.
  return {
    commitSha: firstNonEmpty(env.CI_COMMIT_SHA),
    branch: firstNonEmpty(env.CI_COMMIT_REF_NAME, env.CI_COMMIT_BRANCH),
    prNumber: parsePrNumber(env.CI_MERGE_REQUEST_IID),
    baseBranch: firstNonEmpty(env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME, env.CI_DEFAULT_BRANCH),
    baseCommitSha: firstNonEmpty(
      env.CI_MERGE_REQUEST_TARGET_BRANCH_SHA,
      env.CI_MERGE_REQUEST_DIFF_BASE_SHA,
    ),
  }
}

/** Returns the first argument that is a non-empty string, otherwise undefined. */
function firstNonEmpty(...values: (string | undefined)[]): string | undefined {
  for (const value of values) {
    if (value != undefined && value.trim() !== "") {
      return value
    }
  }
  return undefined
}

/** Parses a pull/merge request number, returning undefined when invalid. */
function parsePrNumber(value: string | undefined): number | undefined {
  if (value == undefined || value.trim() === "") {
    return undefined
  }
  const prNumber = parseInt(value, 10)
  if (isNaN(prNumber) || prNumber < 1) {
    return undefined
  }
  return prNumber
}
