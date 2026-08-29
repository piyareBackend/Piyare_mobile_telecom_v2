# PMT v5.2 backend migration

The website changes are backward-compatible with the existing v5.1 backend, but the new CMS features and Apps Script caching require the two patch files in this folder.

## Apps Script
1. Open the existing Piyare Mobile Telecom Apps Script project.
2. Keep the current `Code.gs` unchanged.
3. Add the contents of `Code_v52_patch.gs` as a new `.gs` file.
4. Add the contents of `Code_v52_routes.gs` as another `.gs` file.
5. Save the project.
6. Test the owner login and one read-only CMS page.
7. Deploy → Manage deployments → edit the existing Web App deployment → select **New version** → Deploy. Keep the same Web App URL.

The patch adds:
- server-side short-lived caching for Products/Orders/Dashboard reads
- product variants with price/stock/colour
- rich product fields and per-product SEO fields
- image order/main-image metadata
- archive/restore instead of destructive product deletion
- inventory endpoint
- order detail endpoint
- customer profile endpoint with order/repair history
- monthly report endpoint
- variant-aware order validation

Do not delete the existing spreadsheet, Drive folders, Users sheet, or current deployment.
