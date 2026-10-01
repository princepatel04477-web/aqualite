import { StoreChrome } from "@/components/chrome/StoreChrome";
import { TrackBeacon } from "@/components/analytics/TrackBeacon";
import { announcements } from "@/content/site";
import { readCartId } from "@/lib/cart/cookie";
import { getNavigation } from "@/lib/catalog/queries";
import { getCart, getSettings } from "@/lib/store/engine";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const cartId = await readCartId();
  const [cart, nav, settings] = await Promise.all([getCart(cartId), getNavigation(), getSettings()]);
  return (
    <StoreChrome initialCart={cart} nav={nav} announcements={settings.announcements.length ? settings.announcements : announcements}>
      <TrackBeacon />
      {children}
    </StoreChrome>
  );
}
