import Parser from "rss-parser";
import { isRelevant, type NewsSource } from "./news-sources";

const parser = new Parser({
  timeout: 8000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
});

export type NewsItem = {
  source_code: string;
  source_name: string;
  tier: string;
  region: string;
  title_original: string;
  link: string;
  published_at: string | null;
};

function cleanTitle(t: string): string {
  return t
    .replace(/<!\[CDATA\[/g, "")
    .replace(/\]\]>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export async function fetchSource(src: NewsSource): Promise<NewsItem[]> {
  const feed = await parser.parseURL(src.url);
  const out: NewsItem[] = [];
  for (const item of feed.items ?? []) {
    if (!item.title || !item.link) continue;
    const title = cleanTitle(item.title);
    if (!title) continue;
    if (!isRelevant(title, src)) continue;
    out.push({
      source_code: src.code,
      source_name: src.name,
      tier: src.tier,
      region: src.region,
      title_original: title,
      link: item.link,
      published_at: item.isoDate || item.pubDate || null,
    });
  }
  return out;
}
