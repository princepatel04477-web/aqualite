# Aqualite Seller Hub guide

The Seller Hub is the single-brand operations console at `/seller`. It is designed for keyboard and mouse on desktop; on mobile it keeps read and ship actions available without making dense tables unusable.

## Add a product

1. Open **Catalog → Add product**.
2. Complete identity, images, variations, inventory and quality checks.
3. Save the draft at each step. Review price, GST/HSN, size and alt text.
4. Publish only after the quality score is complete. The storefront reads the published record, not the draft.

Screenshot: capture `/seller/catalog/add` after the final quality check and save it as `docs/screenshots/add-product.png` during the release walkthrough.

## Run a sale

1. Open **Pricing → Manage** and select the affected variants.
2. Enter the sale price and its start/end window. The server validates MRP and ownership.
3. Review the preview, save, then verify the price on a product page and checkout.
4. The price log and audit entry are the source of truth.

## Ship today's orders

1. Open **Orders**, filter to paid/unfulfilled orders, and open an order.
2. Verify the address, carrier and tracking number.
3. Confirm **Ship** once. Inventory and the order timeline update atomically.
4. Use the tracking link for customer support; never paste payment secrets into notes.

## Handle a return

1. Open **Returns** and review the reason and window.
2. Approve or reject with a note. When received, record the inspection result.
3. Refund through the payment action. Refunds over ₹5,000 require re-authentication.
4. Confirm the audit diff and customer notification.

## Read payments

Open **Payments** for settlement state, mismatches and refunds. Finance and owner roles can act; viewers can read but the API and row-level security reject mutations.

## Invite a packer

Open **Settings → Users & permissions**, invite the team member by email and choose **Packer**. Packer access is limited to shipping actions. Owner, manager and finance members must enrol MFA before Seller Hub access.

## Release screenshots

The screenshot set for the handover is captured at 1440px and 390px from the current production build: styleguide tabs, storefront home/PLP/PDP, Seller Hub home/inventory/orders/order detail. Store captures under `docs/screenshots/` and attach them to the release review; screenshots are intentionally not generated from mock data.
