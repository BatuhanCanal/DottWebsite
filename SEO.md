## Uygulama Durumu — 17 Temmuz 2026

- **Düzeltildi:** `robots.txt`, `sitemap.xml`, tüm genel sayfalarda self-referencing canonical, GitHub Pages için `CNAME`, ana sayfada `Organization` ve `WebSite` JSON-LD.
- **Doğrulandı:** Üretim alan adı `https://gazidott.org/` GitHub Pages üzerinden `200` yanıt veriyor.
- **Güvenlik nedeniyle ertelendi:** JavaScript içeriğini statik ön-render etme, Tailwind CDN'i build-time CSS'e dönüştürme ve eski `server.js` yayın yolunu değiştirme. Bunlar görsel, performans veya dağıtım regresyonu oluşturabilecek geniş kapsamlı değişikliklerdir.
- **Gerçek veri gerektiği için ertelendi:** Test etkinliklerinin kaldırılması, güncel etkinlik yayınlanması ve kalıcı etkinlik detay sayfaları/Event schema. Doğrulanmış etkinlik bilgisi olmadan içerik üretilmedi veya veri silinmedi.

• ## Executive Summary

  - SEO health: 38.9/100 (F) from 37 repository checks. This is a local technical score, not a Google ranking score.
  - Weakest categories: schema 0, technical SEO 37.5, performance 37.5, images 37.5, and content 43.8.
  - Page-level scores range from 59 to 73. Heading structure is healthy, but metadata and indexable content are weak.
  - Highest-impact problems are missing crawl signals, JavaScript-only content/navigation, placeholder event data, absent
    structured data, and runtime Tailwind compilation.

  - Search Console coverage, HTTPS redirects, backlinks, and field Core Web Vitals could not be verified without the
    production domain and analytics access.

  ## Page Scores

   Page         Score    Main weakness
  ━━━━━━━━━━━  ━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Home            73    Short metadata; only 109 static words
  ───────────  ───────  ────────────────────────────────────────────────────
   Events          65    14 static words; event content requires JavaScript
  ───────────  ───────  ────────────────────────────────────────────────────
   Game Jams       66    28 static words; no event detail URLs
  ───────────  ───────  ────────────────────────────────────────────────────
   About           69    Thin content and placeholder team identities
  ───────────  ───────  ────────────────────────────────────────────────────
   Contact         59    Short metadata and limited internal context

  ## Technical Findings

   Issue     No robots.txt or sitemap
   Impact    High
   Evidence  Neither exists in the published root configured by netlify.toml:1
   Fix       Add both files, list only canonical public URLs, and reference the sitemap from robots.txt
   Priority  1
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Issue     No canonical or URL normalization
   Impact    High
   Evidence  Zero canonical tags; no redirect rules distinguish / from /index.html
   Fix       Confirm the production domain, add self-referencing canonicals, and define one URL format
   Priority  1
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Issue     Navigation and content depend on JavaScript
   Impact    High
   Evidence  Navigation is generated in js/common.js:63; events are fetched in js/events.js:50
   Fix       Render navigation and primary content into the initial HTML or pre-render during the build
   Priority  1
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Issue     Hosting targets conflict
   Impact    Conditional High
   Evidence  Netlify publishes the root, while server.js:104 serves a nonexistent public/ directory
   Fix       Choose one production path and ensure it serves the same canonical files and headers
   Priority  2
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Issue     English version has no indexable URL
   Impact    Medium
   Evidence  Language is stored client-side in js/i18n.js:385; <html lang="tr"> never changes
   Fix       Create /en/ URLs with hreflang, or keep English intentionally non-indexable and update lang dynamically
   Priority  3
  ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Issue     Production CSS is compiled in the browser
   Impact    High
   Evidence  Every page loads Tailwind CDN, including index.html:10
   Fix       Compile and purge Tailwind at build time; ship a static minified stylesheet
   Priority  2

  ## On-Page Findings

   Issue                           Impact      Evidence                        Fix                              Priority
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━
   Titles underuse SERP space      Medium      All are 20–43 characters        Add intent modifiers such as     2
                                                                               “Gazi Üniversitesi”, “oyun
                                                                               geliştirme”, “atölye” and
                                                                               “Ankara” where accurate
  ──────────────────────────────  ──────────  ──────────────────────────────  ───────────────────────────────  ──────────
   Meta descriptions are short     Medium      All are 54–111 characters       Write unique 140–160             2
                                                                               character descriptions with
                                                                               audience, activity, location,
                                                                               and action
  ──────────────────────────────  ──────────  ──────────────────────────────  ───────────────────────────────  ──────────
   Social sharing metadata         Medium      No Open Graph or Twitter        Add og:title, og:description,    2
   absent                                      metadata on public pages        og:image, og:url, and Twitter
                                                                               card metadata
  ──────────────────────────────  ──────────  ──────────────────────────────  ───────────────────────────────  ──────────
   Initial internal link graph     Medium      Events, About, and Game Jams    Place crawlable navigation       2
   is weak                                     contain no static links         and contextual links directly
                                               before JavaScript executes      in HTML
  ──────────────────────────────  ──────────  ──────────────────────────────  ───────────────────────────────  ──────────
   Event image alternatives are    Medium      Generated images use alt=""     Use the event title as           3
   empty                                       in js/events.js:208             concise alt text when the
                                                                               image communicates event
                                                                               information
  ──────────────────────────────  ──────────  ──────────────────────────────  ───────────────────────────────  ──────────
   Heading structure is healthy    Positive    Every public page has one H1    Preserve during future           —
                                               and a valid H2/H3 hierarchy     content expansion

  ## Content Findings

   Issue                            Impact    Evidence                         Fix                              Priority
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ━━━━━━━━━━
   Public pages are thin            High      Static word counts range from    Add useful participation,        1
                                              14 to 109                        eligibility, workshop format,
                                                                               tools, venue, history, and
                                                                               outcome information
  ───────────────────────────────  ────────  ───────────────────────────────  ───────────────────────────────  ──────────
   Published data contains test     High      Titles such as asdas remain      Remove test entries and          1
   content                                    in data/events.json:18           publish complete Turkish and
                                                                               English event records
  ───────────────────────────────  ────────  ───────────────────────────────  ───────────────────────────────  ──────────
   No current events                High      Every event is dated March       Publish upcoming events or       1
                                              2026 or earlier                  clearly maintained recaps
                                                                               with dates, outcomes, photos,
                                                                               and project links
  ───────────────────────────────  ────────  ───────────────────────────────  ───────────────────────────────  ──────────
   Team information is              Medium    All organizers are “İsim         Add real organizers, roles,      2
   placeholder content                        Soyisim” in data/team.json:4     photos, and relevant
                                                                               experience
  ───────────────────────────────  ────────  ───────────────────────────────  ───────────────────────────────  ──────────
   Trust documentation is           Medium    “Code of Conduct” links to       Publish actual conduct and       3
   incomplete                                 About in js/common.js:155; no    privacy pages
                                              privacy page exists
  ───────────────────────────────  ────────  ───────────────────────────────  ───────────────────────────────  ──────────
   No indexable event detail        High      Events exist only as cards       Generate one permanent URL       2
   pages                                      loaded from JSON                 per event with descriptive
                                                                               content and valid Event JSON-
                                                                               LD

  ## Keyword Map

   Page         Recommended primary target
  ━━━━━━━━━━━  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Home         Gazi Üniversitesi dijital oyun tasarımı topluluğu
  ───────────  ──────────────────────────────────────────────────────
   Events       Gazi DOTT oyun geliştirme etkinlikleri ve atölyeleri
  ───────────  ──────────────────────────────────────────────────────
   Game Jams    Gazi DOTT game jam / Ankara öğrenci game jam
  ───────────  ──────────────────────────────────────────────────────
   About        Gazi DOTT hakkında ve topluluk faaliyetleri
  ───────────  ──────────────────────────────────────────────────────
   Contact      Gazi DOTT iletişim

  No major cannibalization exists yet. Keep Home focused on the entity and About focused on mission, history, and
  organization.

  ## Prioritized Action Plan

  1. Foundation: Confirm the production domain and hosting path; add canonicals, redirects, robots.txt, and sitemap.xml.
  2. Content integrity: Remove test events and placeholder team records before indexing.
  3. Crawlability: Render navigation and core event content in initial HTML; create dedicated event URLs.
  4. Metadata: Expand titles/descriptions and add Open Graph sharing metadata.
  5. Structured data: Add Organization and WebSite JSON-LD globally, then Event schema on genuine event pages.
  6. Performance: Replace Tailwind CDN with compiled CSS; optimize the hero and logo with local WebP/AVIF variants and
     responsive sizing.

  7. Trust: Add real organizer information, privacy policy, and an actual code of conduct.
  8. Measurement: Connect Search Console, submit the sitemap, and collect field LCP/INP/CLS data against the good
     thresholds of 2.5s, 200ms, and 0.1.
