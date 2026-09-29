"use client";

import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, rectSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "motion/react";
import { Children, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { saveLayout } from "@/lib/hub/layout-actions";
import { hubRevision } from "@/lib/hub/widget-actions";
import { WIDGET_IDS } from "@/lib/hub/widget-config";
import type { WidgetSetting } from "@/lib/hub/metrics";

function SortableCard({ setting, children, customise }: { setting: WidgetSetting; children: ReactNode; customise: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: setting.id, disabled: !customise });
  if (!setting.visible && !customise) return null;
  return <motion.div ref={setNodeRef} layout="position" style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
    className={`min-w-0 ${setting.size === "L" ? "md:col-span-12" : setting.size === "M" ? "md:col-span-6" : "md:col-span-6 xl:col-span-4"} ${!setting.visible ? "opacity-45" : ""}`}>
    {customise && <div className="mb-2 flex items-center justify-between gap-2 bg-porcelain px-3 py-2 text-small">
      <button type="button" aria-label={`Move ${setting.id}`} className="cursor-grab touch-none font-mono text-mist" {...attributes} {...listeners}>⠿ Drag to reorder</button>
      <span className="font-mono text-eyebrow uppercase text-mist">{setting.size}</span>
    </div>}
    {children}
  </motion.div>;
}

export function WidgetGrid({ initial, initialRevision, children }: { initial: WidgetSetting[]; initialRevision: string; children: ReactNode }) {
  const router = useRouter();
  const [layout, setLayout] = useState(initial);
  const [customise, setCustomise] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const revision = useRef(initialRevision);
  const [now, setNow] = useState(0);
  const [updated, setUpdated] = useState(0);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const items = Children.toArray(children);
  useEffect(() => {
    const mounted = window.setTimeout(() => { setNow(Date.now()); setUpdated(Date.now()); }, 0);
    let inFlight = false;
    const clock = window.setInterval(() => setNow(Date.now()), 10000);
    const poll = window.setInterval(async () => {
      if (inFlight || document.visibilityState !== "visible") return;
      inFlight = true;
      try {
        const result = await hubRevision();
        if (result.ok && result.data !== revision.current) {
          revision.current = result.data;
          router.refresh();
          setUpdated(Date.now());
        }
      } finally { inFlight = false; }
    }, 3000);
    return () => { window.clearTimeout(mounted); window.clearInterval(clock); window.clearInterval(poll); };
  }, [router]);
  function change(next: WidgetSetting[]) {
    const previous = layout;
    setLayout(next);
    setError("");
    startTransition(async () => {
      const result = await saveLayout(next);
      if (!result.ok) { setLayout(previous); setError(result.error.message); }
    });
  }
  function onDragEnd(event: DragEndEvent) {
    if (!event.over || event.active.id === event.over.id) return;
    const oldIndex = layout.findIndex((item) => item.id === event.active.id);
    const newIndex = layout.findIndex((item) => item.id === event.over?.id);
    if (oldIndex >= 0 && newIndex >= 0) change(arrayMove(layout, oldIndex, newIndex));
  }
  return <div>
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-4"><span className="font-mono text-eyebrow uppercase text-mist">Updated {Math.floor((now - updated) / 1000)}s ago</span>
        <button className="text-small text-aqua hover:underline" onClick={() => { router.refresh(); setUpdated(Date.now()); }}>↻ Refresh all</button></div>
      <button className="border border-hairline bg-porcelain px-4 py-2 font-mono text-eyebrow uppercase hover:border-aqua" aria-expanded={customise} onClick={() => setCustomise(!customise)}>
        {customise ? "Done" : "Customise dashboard"}</button>
    </div>
    {error && <p role="alert" className="mb-3 text-small text-danger">{error}</p>}
    {customise && <div className="mb-4 flex flex-wrap gap-2 border border-hairline bg-porcelain p-4" aria-label="Widget controls">
      {layout.map((setting) => <div key={setting.id} className="flex items-center gap-2 border border-hairline p-2 text-small">
        <label className="flex items-center gap-2"><input type="checkbox" checked={setting.visible} onChange={() => change(layout.map((row) => row.id === setting.id ? { ...row, visible: !row.visible } : row))} />{setting.id}</label>
        <select aria-label={`Size of ${setting.id}`} value={setting.size} onChange={(event) => change(layout.map((row) => row.id === setting.id ? { ...row, size: event.target.value as WidgetSetting["size"] } : row))} className="border border-hairline bg-porcelain p-1">
          <option value="S">S</option><option value="M">M</option><option value="L">L</option>
        </select>
      </div>)}
      <span aria-live="polite" className="text-small text-mist">{pending ? "Saving layout…" : "Layout saved for your account"}</span>
    </div>}
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={layout.map((row) => row.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-12" aria-label="Dashboard widgets">
          {layout.map((setting) => <SortableCard key={setting.id} setting={setting} customise={customise}>{items[WIDGET_IDS.indexOf(setting.id)]}</SortableCard>)}
        </div>
      </SortableContext>
    </DndContext>
  </div>;
}
