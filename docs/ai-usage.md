# AI Usage

How AI tools were used on this project, and — the part that matters — **where they were wrong
and how it was caught.**

Tools: Claude (design and review), Claude Code (implementation).
`CLAUDE.md` in the repository root is the standing instruction set given to Claude Code:
architecture rules, domain invariants, testing and commit conventions, and an explicit
out-of-scope list. It exists because an unconstrained agent will happily build the wrong thing
well.

---

## How the work was split

| Phase | Approach |
|---|---|
| Requirements and domain design | Conversation with Claude. No code generated. The output was `docs/requirements.md` and `docs/data-model.md`, committed **before** the first line of code. |
| Domain layer | TDD by hand with Claude Code: failing test first, then implementation, commit on green. |
| Infrastructure, HTTP, UI | Claude Code generating against the rules in `CLAUDE.md`, every diff read before committing. |
| Review | Code pasted back to Claude for critique against the invariants in `docs/data-model.md`. |

---

## Where the AI was wrong

### 1. `CORRECTION` proposed as a `change_reason`

**Suggested:** an enum of `HIRE | MERIT | PROMOTION | MARKET_ADJUSTMENT | CORRECTION`, so a
corrected salary record carries `change_reason = 'CORRECTION'`.

**Why it's wrong:** it conflates two orthogonal facts — *why pay changed* and *whether this
record fixes an earlier one*. Recording the second destroys the first. A promotion that gets
corrected stops being a promotion, so `COUNT(*) WHERE change_reason = 'PROMOTION'` silently
under-reports. That is a reporting bug in the product's primary feature.

**Fixed by:** removing `CORRECTION` from the enum. A correction copies the original record's
`change_reason`; the `superseded_by_id` link is what identifies it as a correction, and the
human explanation lives in `note`. A record is a correction if some other row points at it —
no flag required, and the timeline query already returns every row, so it resolves in memory.

*(ADR-005)*

---

### 2. Closing the open period only works forwards

**Suggested:** record a salary change as `UPDATE ... SET effective_to = newFrom - 1 WHERE
effective_to IS NULL`, then insert the new record.

**Why it's wrong:** correct only when `newFrom` is later than the open period's start. Given
an open period beginning 2026-04-01 and a change dated 2025-06-01, it writes
`effective_to = 2025-05-31` onto a row starting 2026-04-01 — a period ending ten months before
it begins. Two consequences, both silent: the current-salary query stops matching the real
current record and returns the older, lower amount (an accidental pay cut), and the new record
now overlaps a closed one, so "what was she paid in January 2026?" has two answers and no way
to tell which is right.

**Fixed by:** rejecting any change whose `effective_from` is not strictly after the latest live
record's `effective_from`. Genuine historical fixes go through the correction flow, which is
what it is for. The fully general alternative — locate the covering period, split it, bound the
new record by the next period's start — is correct but carries five extra edge cases; it is
recorded as the rejected option in ADR-006.

Additionally the invariant is now enforced in the schema rather than only in code, via a
`gist` exclusion constraint on `(employee_id, daterange(effective_from, effective_to))`. The
inverted range the buggy update produced cannot even be constructed — Postgres rejects it.

*(ADR-006)*

---

<!--
Template for further entries — add them as they happen, not at the end.

### N. <one-line summary>

**Suggested:** what the tool produced.

**Why it's wrong:** the concrete failure. Inputs → wrong output. Not "it's bad practice".

**Fixed by:** what replaced it, and the test that now covers it.
-->
