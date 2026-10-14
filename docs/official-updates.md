# Weekly official announcement updates

Instructions for the weekly research routine. The routine researches official
university pages, and when something meaningful changed it edits
`app/official-data.json` and opens a pull request. The owner reviews and merges;
merging to `main` deploys the site.

Scope: Melbourne Fine Arts and Music PhD, Monash MADA PhD, UNSW Art Design & Media
PhD, RMIT Art/Design PhD, Sydney SCA/Arts and Social Sciences PhD (and Design Lab
alternative), UniSC creative arts PhD. Focus on 2028 H2 intake; retain H1
opportunities. Also note the Taiwan Ministry of Education 116 公費留學 announcement
if published.

## Baseline

1. Work from the latest `main`. Read `app/official-data.json` (current overrides,
   announcement history) and `app/data.ts` (`universities`: seed course, intake,
   IELTS and official links per school). Effective school data is the seed with
   the overrides from `official-data.json` applied on top.
2. Existing announcements are the duplicate-detection history. Before starting,
   check open pull requests whose title starts with `官方公告更新` so you do not
   report the same change twice.

## Research and decide

Search primary official university pages for new or changed PhD entry
requirements, IELTS Academic and other accepted language tests, 2028 admission
periods/deadlines, international scholarship rounds, and funding
commencement/deferral rules. Follow the course/apply/language/source links in
`app/data.ts` and search for relevant new official announcements. Use only changes
supported by an official page. Distinguish publication dates from event/deadline
dates. Do not extrapolate 2027 into 2028 or silently resolve conflicting
school/faculty pages; describe the conflict instead. Melbourne Fine Arts and Music
is not Faculty of Arts; Monash MADA is not Arts. UNSW school versus faculty intake
discrepancies require explicit confirmation.

A new page alone is not a meaningful update when its actual requirements are
unchanged. Identify a meaningful change by school, topic, published data and
source. If official sources are inaccessible, keep existing facts and say in the
run summary which parts could not be checked; do not mark them as verified.

Some university sites (currently www.monash.edu and the unimelb.edu.au sites)
answer cloud machines with a Cloudflare bot challenge (HTTP 403). Do not try to
get around the challenge. For those schools, use WebSearch restricted to the
school's official domain (`allowed_domains`). A change found this way may be
included only when the search result attributes it to a specific official page
URL; mark it in the announcement summary and the PR body with
「（經搜尋取得，請點來源連結人工確認）」 so the owner verifies it before merging.

## Edit

Only edit `app/official-data.json`:

- `schools[school-id]` may hold ONLY these optional text fields: course, unit,
  fit, ielts, intake, defer, note; and official HTTPS link fields: url, apply,
  language, source. Do not touch schools that did not change.
- Append unique records to `announcements`:
  `{id,school,title,summary,source,publishedAt,detectedAt,kind}`. `publishedAt`
  is YYYY-MM-DD or empty when the page does not state it; `detectedAt` is the
  actual Asia/Taipei date. `kind` is application, scholarship, language, entry, or
  intake. Keep at most the 150 most recent records; ids must be unique.
- Write `title` and `summary` in Traditional Chinese. Include precise dates and
  explain the impact on 2028 H1/H2 preparation.
- After a completed check set `checkedOn` (Asia/Taipei date) and `checkedAt`
  (ISO timestamp), even when nothing else changed.
- `source` and link fields must be on the official university domains accepted
  by `app/official.ts`. Never edit personal data, tasks, or other files.

Then run `pnpm install --frozen-lockfile`, `pnpm exec tsc --noEmit` and
`node scripts/test-workspace.mjs`; all must pass.

## Publish and report

- Meaningful change: commit only `app/official-data.json`, push a branch and open
  a pull request to `main` titled `官方公告更新 YYYY-MM-DD`. In the body, in
  Traditional Chinese, list per school: what changed, the actual deadline, the
  effect on preparation, and the official source link.
- No meaningful change: do not open a pull request. Finish with a one-line
  summary that nothing changed (and which sources could not be reached, if any).
- Never merge the pull request, contact other people, submit applications, or
  claim a source was checked when it was not.
