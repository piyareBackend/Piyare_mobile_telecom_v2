# Backend Fix — Consolidated Code.gs

## What was wrong
Your Apps Script project had **5 separate files** (Code.gs, Code_v52_patch.gs,
Code_v52_routes.gs, ZZ_ProductFix.gs, ZZZ_OrderFix.gs), and every one of them
defined its own `doGet` / `doPost`. In Apps Script, when multiple files define
the same function, only the LAST one loaded actually runs — the rest are
silently ignored. This caused:

1. **Revenue counted Pending/Rejected orders** — one of the competing dashboard
   functions summed ALL orders instead of only Confirmed ones.
2. **In-app Accept/Reject didn't restore stock** — the admin app's "Accept/Reject"
   buttons called a different, older function (`updateOrder_`) than the WhatsApp
   link buttons did, and that older function never restored stock or cleared
   the cache.
3. **Stale data after changes** — several actions didn't clear the 45-second
   cache, so the app/website sometimes showed old numbers right after a change.

## The fix
This single `Code.gs` file replaces all 5 files. Key changes:
- **One shared function** (`changeOrderStatus_`) now handles both the WhatsApp
  accept/reject links AND the in-app Accept/Reject/status buttons — so they can
  never behave differently again.
- **Revenue** is now calculated the same way everywhere (dashboard, analytics,
  monthly report) from a single rule: only `Confirmed / Processing / Shipped /
  Delivered / Completed` orders count. Pending, Rejected, and Cancelled never do.
- **Stock is restored automatically** whenever an order moves to Rejected or
  Cancelled — whether that happens from the app or from a WhatsApp link — and
  never restored twice.
- **Cache is cleared on every write** (products, orders, coupons, backups) so
  the dashboard, low-stock count, and order list are always fresh.

## How to deploy
1. Open your Apps Script project (script.google.com) for Piyare Mobile Telecom
2. **Delete** these files entirely: `Code_v52_patch.gs`, `Code_v52_routes.gs`,
   `ZZ_HardDelete.gs`, `ZZ_ProductFix.gs`, `ZZZ_OrderFix.gs`
3. **Replace** the contents of `Code.gs` with this file
4. Save → Deploy → Manage deployments → Edit → New version → Deploy
5. Test: place a test order, accept it from the app, reject one from WhatsApp —
   check that stock updates correctly both ways and revenue only shows
   Confirmed+ orders

No spreadsheet structure changes needed — same sheets, same columns.
