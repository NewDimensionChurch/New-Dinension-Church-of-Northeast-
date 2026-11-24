const CHANNEL_ID = "UCB6chkiLb0LJebqn5b_tViA";
const FALLBACK_ID = "WELtFH_vkyc";
let lastGood = { videoId: FALLBACK_ID, startedAt: "2026-11-22T17:08:15+00:00" };
let checkedAt = 0;
export function completedService(html, id, now = Date.now()) {
  const raw = html.match(/"liveBroadcastDetails"\s*:\s*(\{[^}]+\})/);
  if (!raw || !html.includes('"channelId":"' + CHANNEL_ID + '"')) return null;
  const live = JSON.parse(raw[1]);
  const start = Date.parse(live.startTimestamp);
  const end = Date.parse(live.endTimestamp);
  if (live.isLiveNow !== false || !Number.isFinite(start) || !Number.isFinite(end) || end > now || end - start < 20 * 60 * 1000) return null;
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "short", hour: "numeric", hourCycle: "h23" }).formatToParts(new Date(start));
  const day = parts.find(p => p.type === "weekday")?.value;
  const hour = Number(parts.find(p => p.type === "hour")?.value);
  if (!((day === "Sun" && hour >= 11 && hour <= 15) || (day === "Wed" && hour >= 17 && hour <= 22))) return null;
  if (/"isPrivate"\s*:\s*true/.test(html) || /"playableInEmbed"\s*:\s*false/.test(html)) return null;
  return { videoId: id, startedAt: live.startTimestamp };
}
async function getText(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error("YouTube unavailable");
  return response.text();
}
export default async () => {
  if (Date.now() - checkedAt > 300000) {
    try {
      const xml = await getText('https://www.youtube.com/feeds/videos.xml?channel_id=' + CHANNEL_ID);
      const ids = [...new Set([...xml.matchAll(/<yt:videoId>([A-Za-z0-9_-]{11})<\/yt:videoId>/g)].map(m => m[1]))].slice(0, 15);
      const results = await Promise.allSettled(ids.map(async id => completedService(await getText('https://www.youtube.com/watch?v=' + id), id)));
      const candidates = results.filter(r => r.status === "fulfilled" && r.value).map(r => r.value);
      candidates.push(lastGood);
      candidates.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
      lastGood = candidates[0];
      checkedAt = Date.now();
    } catch {
      // Keep a known recording when YouTube is temporarily unavailable.
    }
  }
  return new Response(JSON.stringify(lastGood), { headers: { "Content-Type": "application/json", "Cache-Control": "public, max-age=300" } });
};
