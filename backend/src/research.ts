import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { summarizeContent } from "./ai";
import type { ResearchSpec, SearchResultItem } from "./types";

puppeteer.use(StealthPlugin());

// Helper to perform Puppeteer search (DuckDuckGo site: search)
async function searchWithPuppeteer(query: string, source: string): Promise<SearchResultItem[]> {
  const siteMap: Record<string, string> = {
    frontiers: "frontiersin.org",
    hackaday: "hackaday.com",
    ieee_spectrum: "spectrum.ieee.org",
    mit_tech_review: "technologyreview.com",
    phys_org: "phys.org",
    reddit: "reddit.com",
    sciencedaily: "sciencedaily.com",
  };

  let site = siteMap[source];

  if (!site) {
    if (source.includes(".")) {
      site = source;
    } else {
      site = `${source.replace("_", ".")}.com`;
    }
  }

  const fullQuery = `site:${site} ${query}`;

  let browser: any;

  try {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      headless: true,
      timeout: 60000,
    });
    const page = await browser.newPage();

    await page.setViewport({ height: 768, width: 1366 });
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    await page.goto(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(fullQuery)}`, {
      timeout: 30000,
      waitUntil: "domcontentloaded",
    });

    const results = await page.evaluate(() => {
      const items: any[] = [];
      const resultElements = document.querySelectorAll(".result");

      resultElements.forEach((el) => {
        const titleEl = el.querySelector(".result__a");
        const snippetEl = el.querySelector(".result__snippet");

        if (titleEl && (titleEl as HTMLAnchorElement).href) {
          let url = (titleEl as HTMLAnchorElement).href;

          try {
            const urlObj = new URL(url);

            if (urlObj.hostname.includes("duckduckgo.com") && urlObj.searchParams.has("uddg")) {
              url = urlObj.searchParams.get("uddg") || url;
            }
          } catch (_e) {}
          items.push({
            snippet: snippetEl ? (snippetEl as HTMLElement).innerText : "",
            title: (titleEl as HTMLElement).innerText,
            url: url,
          });
        }
      });

      return items.slice(0, 5);
    });

    return results;
  } catch (error) {
    console.error("Puppeteer search failed:", error);

    return [];
  } finally {
    if (browser) await browser.close();
  }
}

export async function getResearchCandidates(spec: ResearchSpec): Promise<SearchResultItem[]> {
  const query = spec.keywords.join(" ");

  try {
    switch (spec.source) {
      case "openalex": {
        const res = await fetch(
          `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=5`,
        );

        if (!res.ok) throw new Error(`OpenAlex API error: ${res.status}`);
        const data = (await res.json()) as any;

        return data.results.map((item: any) => ({
          publishedDate: item.publication_date,
          snippet: item.abstract_inverted_index ? "Abstract available via API" : "No abstract",
          title: item.display_name,
          url: item.doi || item.id,
        }));
      }

      case "semantic_scholar": {
        const res = await fetch(
          `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=5&fields=title,url,abstract,year`,
        );

        if (!res.ok) throw new Error(`Semantic Scholar API error: ${res.status}`);
        const data = (await res.json()) as any;

        return (data.data || []).map((item: any) => ({
          publishedDate: item.year ? String(item.year) : undefined,
          snippet: item.abstract || "(No abstract)",
          title: item.title,
          url: item.url,
        }));
      }

      case "wikipedia": {
        const res = await fetch(
          `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&utf8=`,
        );

        if (!res.ok) throw new Error(`Wikipedia API error: ${res.status}`);
        const data = (await res.json()) as any;

        return (data.query?.search || []).map((item: any) => ({
          snippet: item.snippet ? item.snippet.replace(/<[^>]+>/g, "") : "", // Remove HTML tags
          title: item.title,
          url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, "_"))}`,
        }));
      }

      case "arxiv": {
        const res = await fetch(
          `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&start=0&max_results=5`,
        );

        if (!res.ok) throw new Error(`ArXiv API error: ${res.status}`);
        const text = await res.text();
        // Simple regex parsing for Atom feed
        const entries = text.split("<entry>");
        const results: SearchResultItem[] = [];

        for (let i = 1; i < entries.length; i++) {
          const entry = entries[i];
          const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
          const idMatch = entry.match(/<id>(.*?)<\/id>/);
          const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);

          if (titleMatch && idMatch) {
            results.push({
              snippet: summaryMatch
                ? `${summaryMatch[1].replace(/\n/g, " ").slice(0, 200)}...`
                : "",
              title: titleMatch[1].replace(/\n/g, " ").trim(),
              url: idMatch[1].trim(),
            });
          }
        }

        return results;
      }

      case "pubmed": {
        // Step 1: ESearch to get IDs
        const searchRes = await fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmode=json&retmax=5`,
        );

        if (!searchRes.ok) throw new Error("PubMed ESearch error");
        const searchData = (await searchRes.json()) as any;
        const ids = searchData.esearchresult?.idlist || [];

        if (ids.length === 0) return [];

        // Step 2: ESummary to get details
        const summaryRes = await fetch(
          `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json`,
        );

        if (!summaryRes.ok) throw new Error("PubMed ESummary error");
        const summaryData = (await summaryRes.json()) as any;

        return ids.map((id: string) => {
          const doc = summaryData.result[id];

          return {
            publishedDate: doc.pubdate,
            snippet: doc.source || "",
            title: doc.title,
            url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          };
        });
      }

      default:
        // Fallback to Puppeteer for other sources
        return searchWithPuppeteer(query, spec.source);
    }
  } catch (error) {
    console.error("Research API failed:", error);

    return [];
  }
}

export async function executeResearch(url: string): Promise<string> {
  let browser: any;

  try {
    browser = await puppeteer.launch({
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
      headless: true,
    });
    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    await page.goto(url, { timeout: 60000, waitUntil: "networkidle2" });

    const content = await page.evaluate(() => {
      // Remove scripts, styles, navs to get clean text
      const scripts = document.querySelectorAll("script, style, nav, footer, header, aside");

      scripts.forEach((s) => {
        s.remove();
      });

      return document.body.innerText;
    });

    return await summarizeContent(content);
  } catch (error) {
    console.error("Research execution failed:", error);

    return `Failed to execute research on ${url}. Error: ${(error as Error).message}`;
  } finally {
    if (browser) await browser.close();
  }
}
