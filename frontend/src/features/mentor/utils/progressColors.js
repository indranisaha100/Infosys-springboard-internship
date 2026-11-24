export function clampPercent(value) {
  const percent = Number(value);
  if (!Number.isFinite(percent)) return 0;
  return Math.min(100, Math.max(0, Math.round(percent)));
}

export function progressColor(value) {
  const percent = clampPercent(value);
  if (percent === 0) return "bg-slate-300";
  if (percent < 40) return "bg-rose-500";
  if (percent < 80) return "bg-amber-500";
  return "bg-emerald-500";
}
