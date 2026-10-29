import PageHero from '../components/PageHero';

const content = {
  legal: { title: 'Mentions légales', crumb: 'Mentions légales' },
  privacy: { title: 'Politique de confidentialité', crumb: 'Confidentialité' },
  accessibility: { title: 'Déclaration d’accessibilité', crumb: 'Accessibilité' },
} as const;

/**
 * Pages institutionnelles : le contenu officiel n'a pas encore été fourni.
 * Aucun texte juridique n'est inventé ; la page l'indique clairement.
 */
export default function InstitutionalTextPage({ kind }: { kind: keyof typeof content }) {
  const { title, crumb } = content[kind];
  return (
    <>
      <PageHero title={title} breadcrumbs={[{ label: crumb }]} compact />
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4">
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-orange-800 mb-2">Prototype — à valider</p>
            <p className="text-slate-700 leading-relaxed">
              Le texte officiel de cette page sera publié après validation par la CAPH-CI. Pour toute question,
              écrivez à <a href="mailto:caphci2011@gmail.com" className="font-semibold text-blue-700 underline">caphci2011@gmail.com</a>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
