import { useNavigation, PageName } from '../context/NavigationContext';

const navCol: { label: string; page: PageName }[] = [
  { label: 'Accueil', page: 'home' },
  { label: 'La CAPH-CI', page: 'about' },
  { label: 'Nos actions', page: 'actions' },
  { label: 'Projets', page: 'projects' },
  { label: 'Transparence & Impact', page: 'transparency' },
  { label: 'Délégations', page: 'delegations' },
  { label: 'Actualités', page: 'news' },
  { label: 'Agenda', page: 'agenda' },
  { label: 'Opportunités', page: 'opportunities' },
  { label: 'Médiathèque', page: 'media' },
  { label: 'Ressources', page: 'resources' },
  { label: 'Contact', page: 'contact' },
];

const participerCol: { label: string; page: PageName }[] = [
  { label: 'Adhérer à la CAPH-CI', page: 'adhesion' },
  { label: 'Devenir partenaire', page: 'partner' },
  { label: 'Faire un don', page: 'donate' },
  { label: 'Annuaire des OPH', page: 'oph' },
  { label: 'Médiathèque', page: 'media' },
  { label: 'Délégations', page: 'delegations' },
  { label: 'Cabinet de Conseil', page: 'cabinet' },
];

export default function Footer() {
  const { navigate } = useNavigation();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-white" role="contentinfo">
      <div className="max-w-7xl mx-auto px-4 pt-14 pb-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <img src="/logo-caph-ci.png" alt="" className="w-16 h-14 object-contain flex-shrink-0" />
              <div>
                <div className="font-bold text-white font-display">CAPH-CI</div>
                <div className="text-xs text-slate-400">Coordination des Associations de PH</div>
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed mb-5">
              Organisation nationale de la société civile, laïque, apolitique et à but non lucratif. « Unir nos forces, défendre nos droits, construire l'inclusion. »
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider font-display">Navigation</h3>
            <ul className="space-y-2">
              {navCol.map(item => (
                <li key={item.page}>
                  <button onClick={() => navigate(item.page)} className="text-slate-400 hover:text-blue-400 transition-colors text-sm text-left">
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Participer */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider font-display">Participer</h3>
            <ul className="space-y-2">
              {participerCol.map(item => (
                <li key={item.label}>
                  <button onClick={() => navigate(item.page)} className="text-slate-400 hover:text-blue-400 transition-colors text-sm text-left">
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider font-display">Contact</h3>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex gap-2">
                <span className="text-blue-400 mt-0.5" aria-hidden="true">📍</span>
                <span>Abidjan, Abobo Sogefiha<br />Près du Terrain des 4 Étages, APP 1400</span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400" aria-hidden="true">📞</span>
                <span><a href="tel:+2250708249530" className="hover:text-blue-400 transition-colors">07 08 24 95 30</a><br /><a href="tel:+2250505283955" className="hover:text-blue-400 transition-colors">05 05 28 39 55</a><br /><a href="tel:+2250142099696" className="hover:text-blue-400 transition-colors">01 42 09 96 96</a></span>
              </li>
              <li className="flex gap-2">
                <span className="text-blue-400" aria-hidden="true">✉️</span>
                <a href="mailto:caphci2011@gmail.com" className="hover:text-blue-400 transition-colors">caphci2011@gmail.com</a>
              </li>
            </ul>
            <div className="mt-6">
              <button onClick={() => navigate('donate')} className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-sm font-semibold text-white text-center">
                Faire un don
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-slate-500 text-xs text-center sm:text-left">
            © {year} CAPH-CI — Tous droits réservés. Côte d'Ivoire.
          </p>
          <div className="flex gap-4 text-xs">
            <button className="text-slate-500 hover:text-slate-300 transition-colors">Mentions légales</button>
            <button className="text-slate-500 hover:text-slate-300 transition-colors">Confidentialité</button>
            <button className="text-slate-500 hover:text-slate-300 transition-colors">Accessibilité</button>
          </div>
        </div>
      </div>
    </footer>
  );
}
