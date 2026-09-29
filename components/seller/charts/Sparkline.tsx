/**
 * Sparkline for health metric cards — hand-rolled SVG so the seller pages
 * stay light. Values are basis points (or hours); the polyline is scaled to
 * its own window. Decorative: the metric value is always rendered as text.
 */
export function Sparkline({
  values,
  stroke = "var(--red)",
  label,
}: {
  values: number[];
  stroke?: string;
  label: string;
}) {
  const width = 96;
  const height = 28;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;
  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - 2 - ((value - min) / span) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={label}
      className="overflow-visible"
    >
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
