-- Hero showcase seed (Supabase cutover). The local engine's mirror lives in
-- content/hero.ts. DRAFT COPY — editable in /admin/hero; only client-approved
-- claims ship. Deterministic UUIDs keep this seed idempotent alongside
-- 0002_hero_slides.sql.
--
-- product_id / colorway_id resolve by the catalogue's natural keys, so this
-- file can run on any environment. Prices are NOT seeded: they are read live
-- from product_variants at render time.

insert into hero_slides (
  id, sort, is_active, product_id, colorway_id,
  eyebrow, headline_before, headline_italic, headline_after, lead,
  glow_hex, image_desktop_path, image_mobile_path, image_alt,
  focal_x, focal_y, shoe_mask_path,
  cta_primary_label, cta_primary_href, cta_secondary_label, cta_secondary_href,
  starts_at, ends_at
)
select rows.*
from (values
  (
    '00000000-0000-4000-9000-000000000001'::uuid, 10, true,
    (select id from products where slug = 'tide-slide'),
    (select c.id from product_colorways c where c.product_id = (select id from products where slug = 'tide-slide') and c.slug = 'midnight'),
    'Monsoon ''26',
    'Light on land.',
    'At home',
    ' in water.',
    'A cushioned EVA sole, a quiet strap, and a grip that stays honest in the rain. Comfort, waterproofing, and almost no weight — the claims we are allowed to make, and the ones the sole has to keep.',
    '#1E7F78',
    '/catalog/hero-tide-slide.jpg',
    '/catalog/hero/tide-slide/hero-mobile',
    'Aqualite Tide Slide in midnight with an aqua strap, floating over dark still water',
    0.580, 0.420, null::text,
    'Shop men', '/shop/men',
    'Shop women', '/shop/women',
    null::timestamptz, null::timestamptz
  ),
  (
    '00000000-0000-4000-9000-000000000002'::uuid, 20, true,
    (select id from products where slug = 'pearl-slide'),
    (select c.id from product_colorways c where c.product_id = (select id from products where slug = 'pearl-slide') and c.slug = 'blush'),
    'Monsoon ''26',
    'Soft underfoot.',
    'Quiet',
    ' on the street.',
    'A contoured footbed and a rounded strap that stays soft through a wet commute. Light enough to forget, finished enough to wear out.',
    '#B9828C',
    '/catalog/hero/pearl-slide/hero-desktop',
    '/catalog/hero/pearl-slide/hero-mobile',
    'Aqualite Pearl Slide in blush pink, floating over dark still water',
    0.500, 0.450, null::text,
    'Shop Pearl', '/product/pearl-slide?color=blush',
    'All slides', '/collections/everyday-slides',
    null::timestamptz, null::timestamptz
  ),
  (
    '00000000-0000-4000-9000-000000000003'::uuid, 30, true,
    (select id from products where slug = 'cove-clog'),
    (select c.id from product_colorways c where c.product_id = (select id from products where slug = 'cove-clog') and c.slug = 'sage'),
    'Monsoon ''26',
    'Closed toe.',
    'Open',
    ' to rain.',
    'A one-piece EVA shell that drains, dries and keeps its shape. For puddles, gardens and every step in between.',
    '#6F9A82',
    '/catalog/hero/cove-clog/hero-desktop',
    '/catalog/hero/cove-clog/hero-mobile',
    'Aqualite Cove Clog in sage green, floating over dark still water',
    0.500, 0.450, null::text,
    'Shop Cove', '/product/cove-clog?color=sage',
    'All clogs', '/shop?category=clogs',
    null::timestamptz, null::timestamptz
  ),
  (
    '00000000-0000-4000-9000-000000000004'::uuid, 40, true,
    (select id from products where slug = 'harbour-clog'),
    (select c.id from product_colorways c where c.product_id = (select id from products where slug = 'harbour-clog') and c.slug = 'navy'),
    'Monsoon ''26',
    'Made for puddles.',
    'Worn',
    ' long after.',
    'A deeper heel cup and a grip that holds wet stone. The clog you stop taking off at the door.',
    '#2E4F7F',
    '/catalog/hero/harbour-clog/hero-desktop',
    '/catalog/hero/harbour-clog/hero-mobile',
    'Aqualite Harbour Clog in navy, floating over dark still water',
    0.500, 0.450, null::text,
    'Shop Harbour', '/product/harbour-clog?color=navy',
    'All clogs', '/shop?category=clogs',
    null::timestamptz, null::timestamptz
  ),
  (
    '00000000-0000-4000-9000-000000000005'::uuid, 50, true,
    (select id from products where slug = 'reef-flip'),
    (select c.id from product_colorways c where c.product_id = (select id from products where slug = 'reef-flip') and c.slug = 'porcelain'),
    'Monsoon ''26',
    'One strap.',
    'Nothing',
    ' else.',
    'The lightest pair we make. A soft toe post, a textured sole, and nothing you need to think about.',
    '#BFA77E',
    '/catalog/hero/reef-flip/hero-desktop',
    '/catalog/hero/reef-flip/hero-mobile',
    'Aqualite Reef Flip in porcelain white, floating over dark still water',
    0.500, 0.450, null::text,
    'Shop Reef', '/product/reef-flip?color=porcelain',
    'Shop women', '/shop/women',
    null::timestamptz, null::timestamptz
  )
) as rows (
  id, sort, is_active, product_id, colorway_id,
  eyebrow, headline_before, headline_italic, headline_after, lead,
  glow_hex, image_desktop_path, image_mobile_path, image_alt,
  focal_x, focal_y, shoe_mask_path,
  cta_primary_label, cta_primary_href, cta_secondary_label, cta_secondary_href,
  starts_at, ends_at
)
where not exists (select 1 from hero_slides where id = rows.id);
