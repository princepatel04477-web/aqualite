import { widgetTitles } from "@/lib/hub/widget-config";
import { WidgetCard } from "@/components/hub/home/widgets/WidgetCard";
import { loadWidget, type WidgetData, type WidgetId } from "@/lib/hub/metrics";

export function WidgetSkeleton({ id }: { id: WidgetId }) {
  return (
    <section aria-label={`${widgetTitles[id]} loading`} aria-busy="true" className={`hub-card hub-card-${id} animate-pulse`}>
      <div className="mb-8 flex justify-between"><span className="font-display text-h3">{widgetTitles[id]}</span><span className="text-small text-mist">Loading…</span></div>
      <div className="space-y-4"><div className="h-8 w-2/3 bg-hairline/40" /><div className="h-5 w-4/5 bg-hairline/40" /><div className="h-5 w-1/2 bg-hairline/40" /></div>
    </section>
  );
}

export async function WidgetStream({ id }: { id: WidgetId }) {
  let data: WidgetData | null;
  try { data = await loadWidget(id); }
  catch { data = null; }
  return <WidgetCard id={id} initial={data} />;
}
