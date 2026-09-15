import type { ReactNode } from 'react';
export function GlassSurface({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`glass glass-regular ${className}`}>{children}</section>;
}
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented glass-soft" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          type="button"
          aria-pressed={o.value === value}
          className={o.value === value ? 'active' : ''}
          onClick={() => onChange(o.value)}
          key={o.value}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
export function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemax={max}
    >
      <span style={{ width: `${percent}%` }} />
    </div>
  );
}
export function BottomSheet({
  children,
  onClose,
  label,
}: {
  children: ReactNode;
  onClose: () => void;
  label: string;
}) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <section
        className="bottom-sheet glass glass-strong"
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        {children}
      </section>
    </div>
  );
}
