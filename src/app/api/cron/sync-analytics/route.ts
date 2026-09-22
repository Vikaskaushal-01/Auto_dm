import { syncAllLiveInstagramAccounts } from "@/lib/analytics/real-sync";

/**
 * Daily analytics sync — call once a day (Vercel Cron, GitHub Actions schedule,
 * cron-job.org, or Windows Task Scheduler hitting this URL) to record one real
 * FollowerSnapshot + per-post ContentMetric row per live Instagram account,
 * straight from the Meta Graph API. This is the only supported way analytics
 * history should be written — never hand-run a script that invents numbers.
 *
 * Protected by CRON_SECRET so it can't be triggered by anyone who finds the URL.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expected = process.env.CRON_SECRET;

  if (!expected) {
    return Response.json({ ok: false, error: "CRON_SECRET is not configured." }, { status: 500 });
  }
  if (authHeader !== `Bearer ${expected}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const results = await syncAllLiveInstagramAccounts();
  return Response.json({ ok: true, syncedAccounts: results.length, results });
}
