import PageHero from '../components/PageHero';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '../context/NavigationContext';

const modules = ['Profil de l’organisation', 'Documents internes', 'Opportunités réservées', 'Communications internes', 'Soumission de rapports', 'Proposition d’actualités'];

export default function MemberDashboardPage() {
  const { session, logout } = useAuth();
  const { navigate } = useNavigation();
  return (
    <>
      <PageHero title="Tableau de bord" subtitle="Aperçu du futur espace membre." breadcrumbs={[{ label: 'Espace membres', page: 'members' }, { label: 'Tableau de bord' }]} compact />
      <section className="py-16 bg-slate-50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 mb-8" role="note">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-800 mb-1">Prototype — à valider</p>
            <p className="text-sm text-slate-700">Session de démonstration ({session?.displayName}). Aucun compte réel n’est connecté et aucune donnée n’est conservée.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {modules.map(item => (
              <div key={item} className="rounded-xl border border-slate-200 bg-white p-5 text-sm font-medium text-slate-700">{item}</div>
            ))}
          </div>
          <button
            onClick={async () => { await logout(); navigate('members'); }}
            className="mt-8 px-5 py-2.5 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm"
          >
            Se déconnecter
          </button>
        </div>
      </section>
    </>
  );
}
