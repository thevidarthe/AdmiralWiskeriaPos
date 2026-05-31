export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between mb-6 gap-4">
      <div>
        <h1 className="font-serif text-3xl gold-text leading-tight">{title}</h1>
        {subtitle && (
          <p className="label-mono mt-1.5">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
