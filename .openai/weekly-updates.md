# Weekly official announcement updates

Scope: Melbourne Fine Arts and Music PhD, Monash MADA PhD, UNSW Art Design & Media PhD, RMIT Art/Design PhD, Sydney SCA/Arts and Social Sciences PhD (and Design Lab alternative), UniSC creative arts PhD. Focus on 2028 H2; retain H1 opportunities.

## Access and baseline

1. Use Sites `get_site` for this linked project's exact ID. Confirm live publication and owner-private access: selected user is owner, only the owner is allowed, no groups or external visitors, not public/workspace_all. Stop and report if access changed. This private dispatch boundary authorizes the shared official-data endpoint, which stores no applicant personal records.
2. Obtain the existing `siwc_bypass_bearer_token` from that response. Never put tokens in source, files, prompts, URLs, command arguments, or output. Pass it only via hidden stdin/session memory to the verified `current_live_url`, as `OAI-Sites-Authorization: Bearer <token>`. This access does not establish a signed-in visitor; do not use `/api/workspace`.
3. GET `/api/official`. Keep complete `data` and `revision`. This returns current effective school records and official links. Before first run the baseline was checked on 2026-10-13. Existing announcements are the duplicate-detection history.
4. The source repository includes `scripts/official-sync.py`, a hidden-stdin HTTP helper. Open current source using the Sites skill source helper when needed. Launch Python with a PTY; after "Ready for official update JSON (input hidden).", send one newline-terminated JSON containing `{url: current_live_url, token: freshly-read-token, action:"GET"}`. For updates use `action:"PUT", revision:<baseline-revision>, data:<complete-merged-official-data>`. Only request this current Site. Print only non-secret responses.

## Research and decide

Search primary official university pages for new or changed PhD entry requirements, IELTS Academic and other accepted language tests, 2028 admission periods/deadlines, international scholarship rounds, funding commencement/deferral rules. Follow the returned course/apply/language/source links, and search for relevant new official announcements. Use only supported changes. Distinguish publication dates from event/deadline dates. Do not extrapolate 2027 into 2028 or silently resolve conflicting school/faculty pages. Melbourne Fine Arts and Music is not Faculty of Arts; Monash MADA is not Arts. UNSW school versus faculty intake discrepancies require explicit confirmation.

Compare against `effectiveSchools`, overrides and announcement history. A new page alone is not a meaningful update when its actual requirements are unchanged. Identify a meaningful change by school, topic, published data and source. Do not notify repeatedly for the same change. If official sources are inaccessible, retain existing facts and do not mark that part as verified.

## Write and verify

Merge changes into `data.schools[school-id]` using ONLY these optional text fields: course, unit, fit, ielts, intake, defer, note; and official HTTPS link fields: url, apply, language, source. Do not modify other schools unnecessarily. Append unique records to `data.announcements`: `{id,school,title,summary,source,publishedAt,detectedAt,kind}`. `publishedAt` is YYYY-MM-DD or empty when the page does not state it; `detectedAt` is the actual Asia/Taipei date. `kind` is application, scholarship, language, entry, or intake. Keep the most recent 150 records if needed, and check duplicate IDs/content.

Include precise dates and explain impact on 2028 H1/H2 in the summary. Use the current Asia/Taipei date in `data.checkedOn` and actual ISO timestamp in `data.checkedAt` after a completed check. Retain all previous metadata and notices. PUT `{revision,data}` to `/api/official` using current private service access. A 409 means reread latest data and merge; never overwrite a newer version. GET again and verify changed fields/announcement IDs and revision. Routine updates do not require source changes, publishing, migrations, or a new Site. Never modify personal tasks, completion ticks, professor notes, user-set dates or material links. Announcements and school metadata are separate from these records.

## Notify

Only after a verified meaningful update, notify the user in Traditional Chinese with school, what changed, actual deadline, effect on preparation, official source and the workstation link. No meaningful new announcement means no notification. Do not send email/messages to other people, connect accounts, submit applications or claim unavailable access worked. If checking/writing fails, report the specific failure and do not claim a successful update.
