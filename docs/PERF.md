# Aqualite performance gate

The budgets below are release criteria. Run Lighthouse on the mobile emulation and Playwright traces on a throttled desktop before deployment; record the measured value in the **after** column.

| Route / surface | Budget | Before | After | Command |
| --- | ---: | ---: | ---: | --- |
| Storefront home, mobile 4G | Lighthouse performance ≥ 90 | baseline | pending CI run | `lhci autorun` |
| Home / PLP / PDP LCP | ≤ 2.2s | baseline | pending CI run | Lighthouse mobile |
| Storefront CLS | ≤ 0.05 | baseline | pending CI run | Lighthouse mobile |
| Storefront INP | ≤ 200ms | baseline | pending CI run | Lighthouse mobile |
| Storefront first-load JS | ≤ 160 KB gz | baseline | pending CI run | bundle report |
| Seller Hub warm route | ≤ 300ms visual | baseline | pending CI run | `pnpm test:e2e --grep @hub` |
| Seller Hub first load LCP | ≤ 1.5s | baseline | pending CI run | Lighthouse desktop |
| Seller Hub row select / tab / drawer INP | ≤ 100ms | baseline | pending CI run | Playwright trace |
| Seller Hub table scroll | 60fps, no long task > 50ms | baseline | pending CI run | performance project |
| Seller Hub first-load JS | ≤ 250 KB gz / route | baseline | pending CI run | bundle report |

A failed budget blocks the release. The test data set is 10,000 variants and 5,000 orders. Measurements are made against a production build, never a development server.
