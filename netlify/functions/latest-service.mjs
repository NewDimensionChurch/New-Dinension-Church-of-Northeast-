
const CHANNEL_ID = "UCB6chkiLb0LJebqn5b_tViA";

export default async () => {
  try {
    const feed = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL_ID}`
    );

    if (!feed.ok) throw new Error("YouTube feed unavailable");

    const xml = await feed.text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)];

    const videos = entries.map((match) => {
      const entry = match[1];
      return {
        id: entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1],
        published: entry.match(/<published>([^<]+)<\/published>/)?.[1]
      };
    }).filter((video) => video.id);

    videos.sort((a, b) =>
      new Date(b.published) - new Date(a.published)
    );

    return new Response(
      JSON.stringify({ videoId: videos[0]?.id ?? null }),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "public, max-age=300"
        }
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ videoId: null, error: "Feed unavailable" }),
      {
        status: 502,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
};
