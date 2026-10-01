export const WIDGET_IDS = ["sales", "orders", "action", "inventory", "health", "payments", "products", "notifications"] as const;
export type WidgetId = (typeof WIDGET_IDS)[number];

export const widgetTitles: Record<WidgetId, string> = {
  sales: "Sales summary", orders: "Open orders", action: "Action required", inventory: "Inventory alerts",
  health: "Account health", payments: "Payments", products: "Top products · 30d", notifications: "Notifications",
};
