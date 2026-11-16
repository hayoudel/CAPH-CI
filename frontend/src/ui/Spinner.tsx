export function Spinner({ label = 'Chargement…', fullPage = false }: { label?: string; fullPage?: boolean }) {
  return (
    <div className={fullPage ? 'center' : undefined} role="status" style={fullPage ? { minHeight: '100vh' } : undefined}>
      <span className="spinner" aria-hidden="true" /> <span>{label}</span>
    </div>
  );
}
