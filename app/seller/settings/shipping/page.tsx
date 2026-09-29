import { SettingsEditor } from "@/components/hub/settings/SettingsEditor";
import { getSettings } from "@/lib/store/engine";
import { defaultSellerSettings, type SellerSettings } from "@/lib/hub/settings/schema";
export const metadata = { title: "Shipping settings — Seller Hub" };
export default async function Page() {
  const saved = await getSettings();
  const settings: SellerSettings = { ...defaultSellerSettings, ...saved, business: { ...defaultSellerSettings.business, ...saved.business }, shipping: { ...defaultSellerSettings.shipping, thresholdPaise: saved.shippingThresholdPaise, feePaise: saved.shippingFeePaise, codFeePaise: saved.codFeePaise, codCapPaise: saved.codMaxPaise }, returns: { ...defaultSellerSettings.returns, windowDays: saved.returnWindowDays, ...saved.returns }, security: { ...defaultSellerSettings.security, ...saved.security } };
  return <SettingsEditor section="shipping" settings={settings} />;
}
