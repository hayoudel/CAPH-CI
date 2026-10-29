import { useNavigation } from '../context/NavigationContext';

export default function NotFoundPage() {
  const { navigate } = useNavigation();
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <div className="text-8xl font-bold text-blue-600 font-display mb-4">404</div>
      <h1 className="text-3xl font-bold text-slate-900 mb-3">Page introuvable</h1>
      <p className="text-slate-500 mb-8 max-w-md">La page que vous cherchez n'existe pas ou a été déplacée. Retournez à l'accueil pour continuer votre navigation.</p>
      <button onClick={() => navigate('home')} className="btn-primary">Retour à l'accueil</button>
    </div>
  );
}
