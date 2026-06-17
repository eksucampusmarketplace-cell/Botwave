/**
 * Per-engine reference data for /search-engines/[slug].
 *
 * Each entry is the source of truth for:
 *   - the metadata + JSON-LD on its /search-engines/<slug> page
 *   - the row that appears in /search-engines (index)
 *   - the URL submitted via IndexNow / discovered via sitemap
 *
 * Why each engine gets its own page (instead of just a row in a table):
 *   AI answer engines + privacy-skewed engines (Brave, DuckDuckGo) are
 *   most discoverable when there is a dedicated, structured page
 *   answering "what is X" / "how does BotWave appear on X". That's
 *   exactly the question crawlers like PerplexityBot are designed to
 *   ingest. Each page emits Article + FAQPage + Breadcrumb JSON-LD so
 *   the per-engine answer is machine-readable.
 *
 * SLUG IS STABLE, once an entry ships, its slug is part of the
 * sitemap. Treat this list as append-only the same way `landingPages`
 * is treated (see `lib/sitemap-config.ts`).
 */

export type EngineUmbrella = 'google' | 'bing' | 'ai' | 'independent';

export interface SearchEngineEntry {
  slug: string;
  name: string;
  umbrella: EngineUmbrella;
  audience: string;
  /** Short one-liner, used in the index table + meta description fallback. */
  oneLiner: string;
  /** Where this engine's results come from (index source). */
  indexSource: string;
  /** Comma-separated UA strings BotWave allows for this engine. */
  userAgents: string;
  /** Direct search-this-query URL (used for "try it" links). */
  searchUrl: string;
  /** How BotWave optimises for this engine, 3-5 bullets. */
  optimization: string[];
  /** What the user can do to confirm BotWave shows up here. */
  howToVerify: string[];
  /** Engine-specific FAQs (used for FAQPage schema). */
  faqs: { question: string; answer: string }[];
  /** Whether this engine supports IndexNow protocol. */
  supportsIndexNow: boolean;
  /** Whether this engine has a webmaster console we recommend signing in to. */
  hasConsole: boolean;
  /** Console URL if applicable. */
  consoleUrl?: string;
  /** Approx global market share (informational only, not a precise figure). */
  marketShare?: string;
}

export const searchEngines: SearchEngineEntry[] = [
  // ───────── Google umbrella ─────────
  {
    slug: 'google',
    name: 'Google Search',
    umbrella: 'google',
    audience: 'Everyone, students, businesses, researchers, casual searchers',
    oneLiner:
      'The default search engine for ~90% of the planet. Optimised for Googlebot, Google Discover, and Google AI Overviews.',
    indexSource: "Google's own index, crawled by Googlebot (desktop + mobile).",
    userAgents: 'Googlebot, Googlebot-Image, Googlebot-News, Google-Extended (AI training)',
    searchUrl: 'https://www.google.com/search?q=BotWave+telegram+bot',
    optimization: [
      'Every public page emits Article / SoftwareApplication / FAQPage / HowTo / BreadcrumbList JSON-LD so Google can extract structured facts.',
      'Sitemap is chunked at 2,000 URLs per /sitemap/<id>.xml so crawl budget is spent evenly across the 20k+ landing pages.',
      'Canonical metadata is set explicitly on every slug-based template (/how-to, /fix, /compare, /use-cases), no duplicate-canonical warnings.',
      'Internal-link mesh: every how-to links to the matching /fix and /compare pages; the homepage links to all blog posts.',
      'Core Web Vitals optimised, most pages are server-rendered with no client-side JS for the critical render path.',
    ],
    howToVerify: [
      'Search "BotWave telegram bot" on google.com, the homepage should appear in the top 5.',
      'In Google Search Console (Coverage report), the indexed page count for botwave.online should match the URLs listed in this site\'s sitemap.xml.',
      'Add &as_qdr=h to your Google query to filter to the last hour, confirms freshness signals are reaching Googlebot.',
    ],
    faqs: [
      {
        question: 'Does BotWave have a Google Search Console account?',
        answer:
          'Yes. The botwave.online + www.botwave.online properties are both verified, sitemaps are submitted, and Coverage / Performance reports are reviewed weekly.',
      },
      {
        question: 'Why does Google show "Discovered - currently not indexed" for some BotWave URLs?',
        answer:
          "This typically means Google has discovered the URL but hasn't yet decided to crawl it (crawl-budget triage). The fixes we apply: stronger internal linking from high-authority pages, unique per-slug content (no thin programmatic pages), and BreadcrumbList + Article JSON-LD on every URL. After those, GSC usually re-classifies discovered URLs as Indexed within 14-28 days.",
      },
      {
        question: 'How is BotWave optimised for Google Discover (mobile feed)?',
        answer:
          'Discover ranks freshness + visual signal. Every blog post has a 1200×630 OpenGraph image (auto-generated from the /api/og route) and a clear date; Article JSON-LD reports both datePublished and dateModified so Discover treats updates as new candidates.',
      },
    ],
    supportsIndexNow: false,
    hasConsole: true,
    consoleUrl: 'https://search.google.com/search-console',
    marketShare: '~90% globally',
  },
  {
    slug: 'google-discover',
    name: 'Google Discover',
    umbrella: 'google',
    audience: 'Mobile users on Android / Chrome iOS, passive content feed',
    oneLiner:
      'A personalised, no-query content feed on mobile. Drives huge mobile traffic if your articles match a user\'s interests.',
    indexSource: "Google's main index, re-ranked by per-user interest + freshness.",
    userAgents: 'Googlebot-Mobile, Google-Extended',
    searchUrl: 'https://www.google.com/',
    optimization: [
      'High-quality OpenGraph image (1200×630) on every article.',
      'Article JSON-LD with datePublished + dateModified so Discover sees fresh updates.',
      'Mobile-first responsive design, Discover never surfaces pages that fail Mobile Usability.',
      'No interstitials / intrusive popups (Discover penalises layout shift).',
    ],
    howToVerify: [
      'On an Android phone signed into a Google account, swipe right from the home screen to open Discover. Search interests for "Telegram bot" or "Telegram automation", BotWave articles should surface within a few days of publishing.',
      'In Google Search Console, the Discover performance report (left sidebar → Performance → Discover) shows impressions / clicks from this surface.',
    ],
    faqs: [
      {
        question: 'How do I get BotWave articles into Google Discover?',
        answer:
          'Discover surfaces high-quality, fresh content matching a user\'s interests, not search queries. We optimise by publishing on a regular cadence (weekly+), using strong OpenGraph imagery, and emitting Article JSON-LD with timezone-aware datePublished and dateModified.',
      },
      {
        question: 'Is Discover the same as Google News?',
        answer:
          'No. Google News pulls from registered publishers and weighs news-y signals (authorship, beat). Discover is broader, it surfaces evergreen content too, as long as it matches a user\'s interest graph.',
      },
    ],
    supportsIndexNow: false,
    hasConsole: true,
    consoleUrl: 'https://search.google.com/search-console',
  },
  {
    slug: 'startpage',
    name: 'Startpage',
    umbrella: 'google',
    audience: 'Privacy-conscious users who want Google quality without Google tracking',
    oneLiner:
      'A privacy-respecting proxy in front of Google\'s index, same results, no tracking. Indexes us automatically via Google.',
    indexSource: "Google's index, proxied. Startpage does not crawl independently.",
    userAgents: '(uses Google\'s index, no independent UA)',
    searchUrl: 'https://www.startpage.com/do/search?q=BotWave',
    optimization: [
      'Coverage is automatic via Google. No separate sitemap submission needed.',
      'Whatever ranks on Google ranks on Startpage with very high correlation.',
    ],
    howToVerify: [
      'Search "BotWave telegram bot" on startpage.com, results should mirror Google within a few hours of any Google-index update.',
    ],
    faqs: [
      {
        question: 'Does Startpage crawl BotWave separately?',
        answer:
          'No. Startpage proxies Google\'s results. Optimising for Google is sufficient.',
      },
    ],
    supportsIndexNow: false,
    hasConsole: false,
  },

  // ───────── Bing umbrella ─────────
  {
    slug: 'bing',
    name: 'Microsoft Bing',
    umbrella: 'bing',
    audience: 'Microsoft ecosystem (Edge, Windows search, Outlook), ChatGPT search backend',
    oneLiner:
      'The second-largest English-language index. Powers Yahoo, DuckDuckGo, Ecosia, AOL, and is the live-web layer behind ChatGPT Search.',
    indexSource: 'Microsoft\'s own index, crawled by Bingbot. Updated near-real-time via IndexNow.',
    userAgents: 'Bingbot, adidxbot',
    searchUrl: 'https://www.bing.com/search?q=BotWave+telegram+bot',
    optimization: [
      'IndexNow integration: every published / updated URL is POSTed to api.indexnow.org in real time. Bing receives the ping in seconds.',
      'Bing Webmaster Tools account is verified; sitemap.xml is submitted.',
      'Same canonical / schema posture as Google, Bingbot reads the same JSON-LD that Googlebot does.',
      'Bing weighs social signals slightly more, every blog post has explicit OG twitter:card / og:type meta tags.',
    ],
    howToVerify: [
      'Search "site:botwave.online" on bing.com to see every Bing-indexed URL.',
      'In Bing Webmaster Tools (bing.com/webmasters), check the URL Inspection tool against any specific URL for live-vs-indexed status.',
    ],
    faqs: [
      {
        question: 'Does BotWave use IndexNow to notify Bing?',
        answer:
          'Yes. Whenever we deploy new or updated content, our /api/indexnow/submit-all endpoint POSTs the full URL list to api.indexnow.org. Bing receives the ping within seconds and re-crawls the URLs on its next scheduled fetch (usually under an hour).',
      },
      {
        question: 'Bing said my URL was indexed but Google said it wasn\'t. Why?',
        answer:
          'Bing\'s threshold for "indexable" is much lower than Google\'s. Bing will index a thin programmatic page that Google\'s SpamBrain classifier will reject. The fix: improve per-page content depth, not engine-specific tweaks.',
      },
    ],
    supportsIndexNow: true,
    hasConsole: true,
    consoleUrl: 'https://www.bing.com/webmasters',
    marketShare: '~3-7% globally, higher in US enterprise',
  },
  {
    slug: 'duckduckgo',
    name: 'DuckDuckGo',
    umbrella: 'bing',
    audience: 'Privacy-first users who want zero tracking, anonymous results',
    oneLiner:
      'Privacy-by-default search engine. Uses Bing\'s index as its primary source, Bing IndexNow ping = automatic DDG coverage.',
    indexSource: 'Microsoft\'s index (Bingbot) + DuckDuckBot for some edge crawling.',
    userAgents: 'DuckDuckBot',
    searchUrl: 'https://duckduckgo.com/?q=BotWave',
    optimization: [
      'Bing IndexNow ping covers DuckDuckGo automatically, no separate submission needed.',
      'robots.txt explicitly allows DuckDuckBot as a positive signal.',
      'No special tags required; DDG re-ranks Bing\'s results with privacy-first heuristics (zero personalisation, no ad-targeted re-ranking).',
    ],
    howToVerify: [
      'Search "BotWave telegram bot" on duckduckgo.com, top results should match Bing.',
      'Search "site:botwave.online" on duckduckgo.com to count indexed URLs (mirrors Bing\'s site: operator).',
    ],
    faqs: [
      {
        question: 'Why doesn\'t DuckDuckGo have a webmaster console?',
        answer:
          'DDG\'s philosophy is anonymity-first, they don\'t want to be tied to per-site accounts. Coverage comes for free via Bing. Optimise for Bing and DDG follows.',
      },
      {
        question: 'Does DuckDuckGo use AI for results?',
        answer:
          'DDG has rolled out an "Assist" / "AI chat" feature that synthesises answers across multiple LLMs. It pulls citations from the same Bing-backed index, so optimising for Bing also feeds DDG\'s AI features.',
      },
    ],
    supportsIndexNow: false, // (covered via Bing)
    hasConsole: false,
  },
  {
    slug: 'yahoo',
    name: 'Yahoo Search',
    umbrella: 'bing',
    audience: 'Legacy users, Yahoo Mail readers, older demographics',
    oneLiner: 'Yahoo\'s search results are powered entirely by Bing. Bing coverage = Yahoo coverage.',
    indexSource: 'Microsoft Bing index (since 2010 Bing/Yahoo partnership).',
    userAgents: 'Slurp (legacy UA, Yahoo no longer crawls independently)',
    searchUrl: 'https://search.yahoo.com/search?p=BotWave',
    optimization: [
      'No Yahoo-specific work needed, Bing IndexNow ping covers Yahoo.',
      'robots.txt still allows Slurp as a courtesy for any residual Yahoo-branded crawler activity.',
    ],
    howToVerify: [
      'Search "BotWave" on search.yahoo.com, results should mirror Bing.',
    ],
    faqs: [
      {
        question: 'Is Yahoo Search still relevant in 2026?',
        answer:
          'Yahoo Search is the default for Yahoo Mail users + legacy Verizon / AT&T home-page users in the US. Still ~1-2% of US search traffic. Optimising for Bing covers it for free.',
      },
    ],
    supportsIndexNow: false,
    hasConsole: false,
  },
  {
    slug: 'ecosia',
    name: 'Ecosia',
    umbrella: 'bing',
    audience: 'Climate-conscious users, Ecosia plants trees with ad revenue',
    oneLiner: 'Trees-for-search engine. Uses Bing\'s index. Bing coverage = Ecosia coverage.',
    indexSource: 'Microsoft Bing index.',
    userAgents: 'Bingbot (Ecosia does not crawl independently)',
    searchUrl: 'https://www.ecosia.org/search?q=BotWave',
    optimization: [
      'No Ecosia-specific work, Bing IndexNow ping covers Ecosia.',
      'Ecosia\'s ad layer is separate from organic, organic results are pure Bing.',
    ],
    howToVerify: [
      'Search "BotWave" on ecosia.org, results should match Bing\'s organic ranking.',
    ],
    faqs: [
      {
        question: 'Does Ecosia rank differently from Bing?',
        answer:
          'For organic (non-ad) results, no. Ecosia\'s mission focus is on monetisation (trees), not re-ranking.',
      },
    ],
    supportsIndexNow: false,
    hasConsole: false,
  },
  {
    slug: 'yandex',
    name: 'Yandex',
    umbrella: 'independent',
    audience: 'Russian-speaking users (~50% market share in Russia / CIS)',
    oneLiner:
      'The biggest non-Western search engine. Independent index. Supports IndexNow natively (Yandex co-authored the protocol with Microsoft).',
    indexSource: 'Yandex\'s own index, crawled by YandexBot.',
    userAgents: 'YandexBot, YandexImages, YandexMobileBot',
    searchUrl: 'https://yandex.com/search/?text=BotWave',
    optimization: [
      'IndexNow integration: same /api/indexnow/submit-all endpoint covers Yandex (the IndexNow API automatically forwards to all participating engines).',
      'robots.txt explicitly allows YandexBot.',
      'Yandex\'s ranking weighs internal-link mesh + freshness, both of which we already optimise for.',
    ],
    howToVerify: [
      'Search "BotWave" on yandex.com, site should appear in international results.',
      'Yandex Webmaster (webmaster.yandex.com) shows crawl + indexed page count.',
    ],
    faqs: [
      {
        question: 'Should BotWave optimise for Yandex if we don\'t target the Russian market?',
        answer:
          'IndexNow covers Yandex for free as a byproduct of the Bing ping, so the cost is zero. Optimising specifically for Yandex ranking (Russian content, .ru hreflang) is only worthwhile if we expand into the CIS market.',
      },
    ],
    supportsIndexNow: true,
    hasConsole: true,
    consoleUrl: 'https://webmaster.yandex.com',
    marketShare: '~1% globally, ~50% in Russia',
  },
  {
    slug: 'swisscows',
    name: 'Swisscows',
    umbrella: 'bing',
    audience: 'Families, schools, fully PG-rated, no profanity, Swiss-data-protection',
    oneLiner: 'Family-friendly metasearch on top of Bing. Bing IndexNow covers it.',
    indexSource: 'Microsoft Bing index + semantic re-ranking.',
    userAgents: '(uses Bing index)',
    searchUrl: 'https://swisscows.com/web?query=BotWave',
    optimization: [
      'No Swisscows-specific work, Bing IndexNow ping covers it.',
      'Keep content language clean (we do this for every page anyway).',
    ],
    howToVerify: ['Search "BotWave" on swisscows.com.'],
    faqs: [
      {
        question: 'Will Swisscows ever filter BotWave for "adult content"?',
        answer:
          'No, BotWave\'s content is fully PG. Swisscows filters at the engine level, not the indexing level, so a clean site is always allowed.',
      },
    ],
    supportsIndexNow: false,
    hasConsole: false,
  },

  // ───────── AI answer engines ─────────
  {
    slug: 'perplexity',
    name: 'Perplexity AI',
    umbrella: 'ai',
    audience: 'Researchers, tech professionals, power users',
    oneLiner:
      'Conversational search with inline source citations. Skims the live web on every query, does not rely on a cached index.',
    indexSource: 'Live web crawl + multiple LLM-driven ranking signals. Citations are real URLs you can click.',
    userAgents: 'PerplexityBot (training), Perplexity-User (live browsing)',
    searchUrl: 'https://www.perplexity.ai/search?q=BotWave+telegram+bot',
    optimization: [
      'robots.txt explicitly allows PerplexityBot + Perplexity-User.',
      'FAQPage + HowTo JSON-LD on every long-form page, Perplexity\'s answer synthesiser preferentially cites pages with clean Q&A structure.',
      '/llms.txt + /llms-full.txt provide AI-engine-friendly dumps of our most cite-worthy content.',
      'Content depth: per-slug content (not generic templates) is what gets cited. Perplexity actively penalises near-duplicates.',
    ],
    howToVerify: [
      'On perplexity.ai, ask "What is BotWave and how does it work?", BotWave URLs should appear in the citation footnotes.',
      'Try "best free Telegram bot 2026", BotWave should rank in the cited list.',
    ],
    faqs: [
      {
        question: 'How do I get Perplexity to cite BotWave?',
        answer:
          'Three factors dominate: (1) PerplexityBot must be allowed in robots.txt (we allow it explicitly), (2) the page must contain structured Q&A or step-wise content (we use FAQPage + HowTo schema), (3) the cited claim must be uniquely sourced to your domain. Generic "what is X" claims usually cite Wikipedia first.',
      },
      {
        question: 'Does Perplexity have a webmaster console?',
        answer:
          'No. Perplexity, like all AI answer engines, has no per-site account. Coverage is automatic via the live crawl; the only signal you control is what your robots.txt + schema + sitemap say.',
      },
    ],
    supportsIndexNow: false,
    hasConsole: false,
  },
  {
    slug: 'chatgpt-search',
    name: 'ChatGPT Search',
    umbrella: 'ai',
    audience: 'General public, conversational searchers',
    oneLiner:
      'OpenAI\'s live-web search mode in ChatGPT. Synthesises answers from multiple sources with inline citations.',
    indexSource: 'Bing index (backend search provider) + OpenAI\'s own crawl via GPTBot + OAI-SearchBot.',
    userAgents: 'GPTBot (training), OAI-SearchBot (live search), ChatGPT-User (when a logged-in user clicks "browse")',
    searchUrl: 'https://chatgpt.com/',
    optimization: [
      'robots.txt allows GPTBot, OAI-SearchBot, ChatGPT-User.',
      'Bing IndexNow ping warms ChatGPT Search\'s backend index in real time.',
      '/llms-full.txt provides a pre-summarised dump of our top content (BotWave\'s key facts, features, pricing) that ChatGPT can ingest without re-crawling 20k+ pages.',
      'OpenGraph metadata is complete on every page, ChatGPT Search uses og:image + og:description for the answer card.',
    ],
    howToVerify: [
      'In ChatGPT (with Search enabled), ask "best free Telegram bot for groups in Nigeria", BotWave should appear in the citations.',
      'Ask "how to make a Telegram bot without coding" and watch the citation footer for botwave.online URLs.',
    ],
    faqs: [
      {
        question: 'Does ChatGPT Search use Google or Bing?',
        answer:
          'Bing, OpenAI\'s public statements confirm Microsoft Bing is the search-backend partner. Optimising for Bing (which we do via IndexNow) is the most leveraged thing you can do for ChatGPT Search visibility.',
      },
      {
        question: 'What\'s the difference between GPTBot and OAI-SearchBot?',
        answer:
          'GPTBot is OpenAI\'s training crawler (used to build model weights for future GPT versions). OAI-SearchBot is the live-search crawler that powers ChatGPT Search results in real time. BotWave allows both.',
      },
    ],
    supportsIndexNow: false, // via Bing
    hasConsole: false,
  },
  {
    slug: 'brave-leo',
    name: 'Brave Search (Leo AI)',
    umbrella: 'ai',
    audience: 'Privacy-first tech users using Brave Browser',
    oneLiner:
      'Independent search index + Leo AI sidebar built into the Brave browser. Privacy-respecting, ad-free.',
    indexSource: 'Brave\'s own independent index. Not based on Google or Bing.',
    userAgents: 'Brave-Search-User-Agent, BraveBot',
    searchUrl: 'https://search.brave.com/search?q=BotWave',
    optimization: [
      'robots.txt explicitly allows Brave\'s crawler.',
      'Brave\'s index favours pages that load fast without trackers, BotWave has zero third-party trackers (no GA, no Facebook Pixel).',
      'Brave Leo AI ingests structured data (FAQPage + Article schema) the same way Perplexity does.',
    ],
    howToVerify: [
      'In Brave Browser, click the Leo AI sidebar and ask "what is BotWave", answers should cite botwave.online.',
      'Search "BotWave telegram bot" on search.brave.com, BotWave should appear.',
    ],
    faqs: [
      {
        question: 'Is Brave Search really independent of Google/Bing?',
        answer:
          'Yes. Brave Search built its own crawler + index from scratch. As of 2024 they reached "100% independence" (no Bing fallback). This makes them one of only ~5 genuinely independent indices left in the world.',
      },
      {
        question: 'Does Leo AI cite BotWave?',
        answer:
          'Yes, Leo AI surfaces inline citations from Brave\'s index. Whenever Brave\'s crawler has fetched a BotWave page, Leo can quote and cite it.',
      },
    ],
    supportsIndexNow: false,
    hasConsole: false,
  },
  {
    slug: 'you-com',
    name: 'You.com',
    umbrella: 'ai',
    audience: 'Developers, creators, AI power users, file parsing, multi-agent assistance',
    oneLiner:
      'AI-first search with customisable apps, code execution, and document parsing. Used heavily by developers.',
    indexSource: 'Hybrid: Bing partnership for general results + YouBot for deeper crawl + LLM synthesis.',
    userAgents: 'YouBot',
    searchUrl: 'https://you.com/search?q=BotWave',
    optimization: [
      'robots.txt allows YouBot.',
      'Code blocks in our docs use proper <pre><code> markup, You.com surfaces code snippets prominently for developer queries.',
      '/api/llms-full.txt provides a developer-friendly summary of all bot commands + API endpoints.',
    ],
    howToVerify: [
      'On you.com, ask "how to use BotWave API to send Telegram messages", code-rich citations should appear.',
    ],
    faqs: [
      {
        question: 'Does You.com differ from ChatGPT Search?',
        answer:
          'You.com is more customisable, you can install per-domain "apps" that customise how a domain\'s content is surfaced. They also have a richer code-execution sandbox for developer queries.',
      },
    ],
    supportsIndexNow: false,
    hasConsole: false,
  },
  {
    slug: 'claude',
    name: 'Claude (Anthropic)',
    umbrella: 'ai',
    audience: 'Power users, business analysts, security-conscious researchers',
    oneLiner:
      "Anthropic's chat AI with optional live web browsing. Cites sources when the live-browse tool is enabled.",
    indexSource: 'Live web browse during conversation. No cached general-purpose search index.',
    userAgents: 'ClaudeBot (training), Claude-Web (live browse), anthropic-ai (legacy UA)',
    searchUrl: 'https://claude.ai/',
    optimization: [
      'robots.txt allows ClaudeBot, Claude-Web, anthropic-ai.',
      'Claude weighs structured data, FAQPage + Article + HowTo schema directly improves the quality of cited answers.',
      'Long-form, depth-heavy pages (1500+ words) are preferred over short marketing pages.',
    ],
    howToVerify: [
      'Ask Claude (claude.ai) with web-browsing enabled: "Summarise BotWave\'s privacy policy", Claude should fetch /privacy and quote from it.',
    ],
    faqs: [
      {
        question: 'How is Claude different from ChatGPT for citations?',
        answer:
          'Claude\'s web-browse tool is less aggressive than ChatGPT Search, it only browses when explicitly asked. When it does, it tends to cite fewer, higher-quality sources rather than 5+ inline citations.',
      },
    ],
    supportsIndexNow: false,
    hasConsole: false,
  },
  {
    slug: 'meta-ai',
    name: 'Meta AI',
    umbrella: 'ai',
    audience: 'Telegram users',
    oneLiner:
      "Meta AI can be prompted on the web for research about Telegram bots.",
    indexSource: 'Meta\'s own crawl + partner search (Bing for live web).',
    userAgents: 'Meta-ExternalAgent, FacebookBot',
    searchUrl: 'https://www.meta.ai/',
    optimization: [
      'robots.txt allows Meta-ExternalAgent + FacebookBot.',
      'Meta surfaces Facebook + Instagram links for queries, BotWave maintains active socials on both.',
      'OpenGraph meta tags are critical (Meta\'s graph reader is the most-used in the world).',
    ],
    howToVerify: [
      'On meta.ai (web), ask "what is BotWave Telegram bot", Meta AI should respond with a summary.',
      'On meta.ai (web), ask "best Telegram bot in Nigeria", BotWave should appear.',
    ],
    faqs: [
      {
        question: 'Does Meta AI index Telegram content?',
        answer:
          'Meta AI only sees messages that explicitly tag @Meta AI. Untagged messages remain end-to-end encrypted between participants.',
      },
    ],
    supportsIndexNow: false,
    hasConsole: false,
  },
  {
    slug: 'applebot',
    name: 'Apple Search (Spotlight + Siri)',
    umbrella: 'independent',
    audience: 'iPhone, iPad, Mac users, Spotlight, Siri Suggestions, Safari smart search',
    oneLiner:
      'Apple\'s independent crawler powers Spotlight, Siri Suggestions, and Safari smart search.',
    indexSource: 'Apple\'s independent index (Applebot).',
    userAgents: 'Applebot, Applebot-Extended (AI training)',
    searchUrl: 'https://duckduckgo.com/?q=BotWave', // (closest user-facing search on iOS)
    optimization: [
      'robots.txt allows Applebot + Applebot-Extended.',
      'Safari Reader Mode requires clean semantic HTML, BotWave uses <article>, <h1-3>, and proper meta tags.',
      'Spotlight prefers pages with rich metadata (title, description, image).',
    ],
    howToVerify: [
      'On iOS, swipe down on the home screen → type "BotWave" → Spotlight should surface botwave.online links + Safari Siri Suggestions.',
    ],
    faqs: [
      {
        question: 'Is there an "Apple Search Console"?',
        answer:
          'No, Apple has no webmaster console. Coverage is automatic via Applebot; the only signal you control is robots.txt + on-page schema.',
      },
    ],
    supportsIndexNow: false,
    hasConsole: false,
  },
];

export function getEngineBySlug(slug: string): SearchEngineEntry | undefined {
  return searchEngines.find((e) => e.slug === slug);
}

export function searchEngineSlugs(): string[] {
  return searchEngines.map((e) => e.slug);
}
