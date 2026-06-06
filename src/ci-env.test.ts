/**
 * Tests for CI environment auto-detection. We pass a synthetic `env` object so
 * the resolver can be exercised without touching the real process environment.
 */

import { describe, expect, it } from "vitest"

import { detectCiMetadata, isGitLabCi } from "./ci-env"

describe("ci-env", () => {
  describe("isGitLabCi", () => {
    it("returns true when GITLAB_CI is set", () => {
      expect(isGitLabCi({ GITLAB_CI: "true" })).toBe(true)
    })

    it("returns false when GITLAB_CI is empty or unset", () => {
      expect(isGitLabCi({})).toBe(false)
      expect(isGitLabCi({ GITLAB_CI: "" })).toBe(false)
    })
  })

  describe("detectCiMetadata", () => {
    it("returns an empty object outside of a supported CI provider", () => {
      expect(detectCiMetadata({})).toEqual({})
    })

    it("resolves metadata for a GitLab branch (push) pipeline", () => {
      const env = {
        GITLAB_CI: "true",
        CI_COMMIT_SHA: "a".repeat(40),
        CI_COMMIT_REF_NAME: "main",
        CI_COMMIT_BRANCH: "main",
        CI_DEFAULT_BRANCH: "main",
      }
      expect(detectCiMetadata(env)).toEqual({
        commitSha: "a".repeat(40),
        branch: "main",
        baseBranch: "main",
        baseCommitSha: undefined,
        prNumber: undefined,
      })
    })

    it("resolves metadata for a GitLab merge request pipeline", () => {
      const env = {
        GITLAB_CI: "true",
        CI_COMMIT_SHA: "a".repeat(40),
        CI_COMMIT_REF_NAME: "feature/new-button",
        CI_MERGE_REQUEST_IID: "42",
        CI_MERGE_REQUEST_TARGET_BRANCH_NAME: "main",
        CI_MERGE_REQUEST_TARGET_BRANCH_SHA: "b".repeat(40),
        CI_MERGE_REQUEST_DIFF_BASE_SHA: "c".repeat(40),
        CI_DEFAULT_BRANCH: "main",
      }
      expect(detectCiMetadata(env)).toEqual({
        commitSha: "a".repeat(40),
        branch: "feature/new-button",
        baseBranch: "main",
        baseCommitSha: "b".repeat(40),
        prNumber: 42,
      })
    })

    it("prefers CI_COMMIT_BRANCH when CI_COMMIT_REF_NAME is absent", () => {
      const env = {
        GITLAB_CI: "true",
        CI_COMMIT_SHA: "a".repeat(40),
        CI_COMMIT_BRANCH: "develop",
      }
      expect(detectCiMetadata(env).branch).toBe("develop")
    })

    it("falls back to CI_DEFAULT_BRANCH when no merge request target branch is set", () => {
      const env = {
        GITLAB_CI: "true",
        CI_COMMIT_SHA: "a".repeat(40),
        CI_COMMIT_REF_NAME: "develop",
        CI_DEFAULT_BRANCH: "main",
      }
      expect(detectCiMetadata(env).baseBranch).toBe("main")
    })

    it("falls back to CI_MERGE_REQUEST_DIFF_BASE_SHA for the base commit", () => {
      const env = {
        GITLAB_CI: "true",
        CI_COMMIT_SHA: "a".repeat(40),
        CI_COMMIT_REF_NAME: "feature/x",
        CI_MERGE_REQUEST_IID: "7",
        CI_MERGE_REQUEST_TARGET_BRANCH_NAME: "main",
        CI_MERGE_REQUEST_DIFF_BASE_SHA: "d".repeat(40),
      }
      expect(detectCiMetadata(env).baseCommitSha).toBe("d".repeat(40))
    })

    it("ignores empty predefined variables", () => {
      const env = {
        GITLAB_CI: "true",
        CI_COMMIT_SHA: "a".repeat(40),
        CI_COMMIT_REF_NAME: "",
        CI_COMMIT_BRANCH: "",
        CI_MERGE_REQUEST_IID: "",
      }
      const meta = detectCiMetadata(env)
      expect(meta.branch).toBeUndefined()
      expect(meta.prNumber).toBeUndefined()
    })

    it("ignores invalid merge request IIDs", () => {
      const env = {
        GITLAB_CI: "true",
        CI_COMMIT_SHA: "a".repeat(40),
        CI_MERGE_REQUEST_IID: "not-a-number",
      }
      expect(detectCiMetadata(env).prNumber).toBeUndefined()
    })
  })
})
