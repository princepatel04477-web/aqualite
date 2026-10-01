# Aqualite Storefront & Seller Hub — 10-Minute Client Walkthrough (`DEMO_CHECKLIST.md`)

This checklist guides a 10-minute live walkthrough of the **Aqualite** D2C storefront and Seller Hub following the R01–R05 recovery.

---

## 0. Pre-Demo Setup (2 minutes before the call)

1. **Seed realistic 30-day order & Seller Hub telemetry:**
   ```bash
   npm run demo:orders
   ```
   *(Seeds 15 orders across the last 30 days — `paid`, `cod_confirmed`, `shipped`, `delivered`, `return_requested` — plus 1 return request and 2 open buyer message threads into `.data/store.json`.)*
   - To reset back to a blank order state at any time: `npm run demo:reset`

2. **Test Credentials & Coupons Ready to Paste:**
   - **Seller Hub / Admin Login (`/login`):** `admin@aqualite.in` (prototype 6-digit OTP is displayed inline on screen after clicking **Send code**).
   - **Customer Test Pincodes:**
     - `110001` (New Delhi — Standard 2–4 days, Express available, COD eligible)
     - `400001` (Mumbai — Standard 2–4 days, Express available, COD eligible)
     - `790001` (Arunachal Pradesh — Prepaid only, no COD)
   - **Active Coupon Codes:**
     - `WELCOME10` — 10% off orders ₹999+ (capped at ₹300)
     - `MONSOON150` — Flat ₹150 off orders ₹1,299+
     - *(Automatic promo)* **Monsoon Twin-Pack** — 5% off automatically when 2+ pairs are in the bag
   - **Razorpay Test Mode:**
     - When `RAZORPAY_KEY_ID` is not set or uses `rzp_test_*` in prototype mode, clicking **Pay online** simulates an authenticated HMAC-verified test capture and redirects to `/order/<number>?t=<token>`.
     - When live Razorpay test modal is enabled (`rzp_test_*`), use UPI `success@razorpay` or Visa `4111 1111 1111 1111` (expiry `12/29`, CVV `111`).

---

## Minute 0–2 · Brand Direction & Hero Stage (`/`)

- [ ] **Open `/` at `1440×900` (Desktop):**
  - Point out the **Ivory & Red** (`--paper #FAF8F4`, `--porcelain #F1EEE8`, `--ink #141210`, `--crimson #D8272E`) editorial palette — replacing the old dark-water theme.
  - Note the header: clean announcement bar, **Men / Women / Collections / Story** navigation (0-product `Kids` category is automatically hidden until inventory is stocked), and the **Bag** pill with count badge hidden when `0`.
- [ ] **Walk through the 5 Hero Slides (`Tide Slide`, `Pearl Slide`, `Cove Clog`, `Harbour Clog`, `Reef Flip`):**
  - Show that the editorial headline (left, columns 1–6) and lead + CTAs never collide with the floating product studio stage (right, columns 7–12).
  - Click through the **5-thumb rail** at the bottom-left; point out the full product names, crimson active progress bar, and the single `01 / 05` counter + `Pause` toggle at the bottom-right.
  - Click **Quick add +** on the floating product card, select **UK 8**, and show the slide-over **Bag Drawer** opening immediately with the item added.

---

## Minute 2–4 · Browse, Faceted Filtering & Product Detail (`/shop` → `/product/[slug]`)

- [ ] **Navigate to `/shop` (or `/shop/men`):**
  - Demonstrate multi-select **Size (UK)**, **Colour**, **Category**, **Feature**, and **Price range** filters, plus **Sort** (`Featured`, `Newest`, `Price: low to high`, `Price: high to low`).
  - Point out that every filter updates the URL query string (`?size=8&color=blue&sort=price-asc`) so filtered views are shareable and bookmarkable.
- [ ] **Open `/product/tide-slide?color=midnight`:**
  - Click through the **4-angle studio gallery** (3/4 hero, top footbed view, hydro-grip outsole view, heel cushion macro) and click the main stage to open the **Lightbox Zoom** modal.
  - Switch colourway pills (`Midnight / Aqua` ↔ `Warm Sand`) and show URL `?color=sand` and gallery updating in place.
  - Show the **Size Guard**: click **Add to bag** before selecting a size (if none selected) or click a **Sold out** size (`UK 11` on `Midnight / Aqua`) to show the **Notify me when UK 11 is back** inline email capture.
  - Enter pincode `110001` in the **Delivery & Pincode Check** box and click **Check** to display the estimated delivery date and COD eligibility.
  - Expand the **Description & Materials**, **Care Instructions**, and **Legal Declarations** accordions (`<details>`).
  - Scroll to **Customer Reviews** to show verified purchase badges and human-readable fit notes (`True to size`, `Runs small`, `Runs large`).

---

## Minute 4–7 · Bag, Promotions & Checkout (`/bag` → `/checkout` → `/order/[number]`)

- [ ] **Review the Bag Drawer & `/bag`:**
  - Increment quantity to `2` pairs and point out the **Free shipping unlocked** progress bar (`≥ ₹999`) and the automatic **Monsoon Twin-Pack (5% off)** promotion line.
  - Apply coupon code `WELCOME10` in the promo field to show server-calculated paise discount and GST breakdown.
- [ ] **Complete Checkout (`/checkout`):**
  - Fill in shipping details (`Aarav Mehta`, `aarav@example.in`, `9820112233`, Pincode `400001`, `14 Marine Drive`, `Mumbai`, `Maharashtra`).
  - Toggle between **Pay online (UPI / Card / NetBanking)** and **Cash on Delivery (+₹49)** to show live total recalculation on the right summary rail.
  - Click **Place COD order** (or **Pay ₹…** for online test payment):
    - Point out button disable + idempotency key protection against double-clicks.
- [ ] **Order Confirmation (`/order/[number]?t=<token>`):**
  - Show the confirmed order number (`AQ-YYYYMMDD-NNN`), payment status badge, itemised GST summary, shipping address, and **Print / Save Tax Invoice** button.

---

## Minute 7–9 · Seller Hub Operations (`/seller` & `/seller/orders`)

- [ ] **Sign in to Seller Hub (`/login` → `admin@aqualite.in` → `/seller`):**
  - Show the **Seller Hub Home (`/seller`)** populated with live IST metrics:
    - **Sales:** Today / Last 7 days / Last 30 days revenue, units, orders, AOV, and 30-day sparkline.
    - **Orders:** Pending payment, Unshipped, and COD to confirm counts linking directly to filtered views.
    - **Action Required:** Returns awaiting authorisation (`1`) and Open buyer messages (`2`).
    - **Inventory:** Out-of-stock SKUs (`9`) and Low-stock SKUs.
- [ ] **Confirm Shipment in `/seller/orders`:**
  - Filter by **Unshipped** to locate the newly placed order (or seeded order `AQ-20261001-101`).
  - In the inline fulfilment row, select carrier **`Delhivery`**, enter tracking number **`DLV99887766`**, and click **Confirm shipment**.
  - Show the order status immediately transitioning to **`shipped`** with carrier + AWB badge.
  - Refresh the customer's `/order/[number]?t=<token>` tab to show the live **`Shipped`** status and tracking number reflected on the storefront.

---

## Minute 9–10 · Merchandising Controls & Client Handoff (`/admin/hero` & `docs/CLIENT_ASSETS.md`)

- [ ] **Hero Slide Editor (`/admin/hero`):**
  - Show how merchandising staff can reorder the 5 hero slides, edit eyebrows/headlines/CTAs, adjust focal points, and link slides to active products/colourways with Zod validation.
- [ ] **Client Assets Handoff (`docs/CLIENT_ASSETS.md`):**
  - Walk through `docs/CLIENT_ASSETS.md` listing the studio photography angles, Kids catalogue data, and CA/legal fields (`GSTIN`, registered address, grievance officer) needed from the Aqualite team before production cutover.

---

## Verification Matrix (R01–R05)

| Check | Target | Result |
|---|---|---|
| TypeScript (`npm run typecheck`) | `0` errors | PASS |
| ESLint (`npm run lint`) | `0` errors | PASS |
| Design Tokens (`npm run tokens:check`) | `0` raw hex outside `styles/tokens.css` | PASS |
| Unit Tests (`npm test`) | `12/12` suites (`131/131` tests) | PASS |
| Next.js Production Build (`npm run build`) | All routes compile cleanly | PASS |
| OpenNext Cloudflare Build (`npx opennextjs-cloudflare build`) | `.open-next/worker.js` generated | PASS |
| Purchase Path E2E (`tests/e2e/purchase-path.spec.ts`) | Desktop `1440×900` + Mobile `390×844`, Online + COD + Seller Hub | `8/8` PASS |
| Hero Section E2E (`tests/e2e/hero-r03.spec.ts`) | 5 slides × 5 viewports (`1024`, `1280`, `1440`, `1920`, `390`), 0 overlap | `10/10` PASS |
| Data & Gallery E2E (`tests/e2e/data-r04.spec.ts`) | `brokenImages === 0`, `>= 4` PDP gallery views, `demo:orders` Seller Hub | `2/2` PASS |
