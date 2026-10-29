import { useNavigation } from '../context/NavigationContext';

type Crumb = { label: string; page?: string };

type Props = {
  title: string;
  subtitle?: string;
  breadcrumbs?: Crumb[];
  compact?: boolean;
  children?: React.ReactNode;
};

export default function PageHero({ title, subtitle, breadcrumbs, compact, children }: Props) {
  const { navigate, goBack } = useNavigation();

  return (
    <section className={`bg-blue-800 text-white ${compact ? 'py-10' : 'py-14'}`}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Breadcrumb */}
        {breadcrumbs && (
          <nav aria-label="Fil d'Ariane" className="mb-4">
            <ol className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
              <li>
                <button onClick={() => navigate('home')} className="hover:text-blue-400 transition-colors">Accueil</button>
              </li>
              {breadcrumbs.map((crumb, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span aria-hidden="true">/</span>
                  {crumb.page ? (
                    <button onClick={() => navigate(crumb.page as any)} className="hover:text-blue-400 transition-colors">{crumb.label}</button>
                  ) : (
                    <span className="text-white" aria-current="page">{crumb.label}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <div className="flex items-start gap-4">
          <button
            onClick={goBack}
            className="mt-1 min-w-11 min-h-11 p-2.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white flex-shrink-0"
            aria-label="Retour"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-display">{title}</h1>
            {subtitle && <p className="text-slate-400 mt-2 text-base max-w-2xl">{subtitle}</p>}
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
