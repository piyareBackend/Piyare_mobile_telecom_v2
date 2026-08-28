# SEO implementation notes

This file documents the safe SEO scope for the existing production architecture.

- Keep the existing CMS/API/auth architecture unchanged.
- Keep `/admin/` blocked from crawling.
- Keep the existing sitemap and canonical host consistent with the deployed workers.dev origin.
- Business profile data should be edited through the existing CMS data flow, not scraped from Justdial.
- Never store Google, Apps Script, Cloudflare, or other credentials in public frontend files.
- LocalBusiness structured data must use only verified business information.
