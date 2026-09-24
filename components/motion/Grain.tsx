export function Grain() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[39] opacity-[0.035]" aria-hidden="true">
      <svg className="h-full w-full">
        <filter id="aq-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#aq-grain)" />
      </svg>
    </div>
  );
}
