@AGENTS.md

## Claude Code specifics

- A local release-checklist hook reminds on `git push` / `gh pr create`
  when no version or changelog change is present on the branch. It is a
  reminder, not a gate — a docs-only or infra-only PR has nothing to bump,
  so acknowledge it and carry on.
