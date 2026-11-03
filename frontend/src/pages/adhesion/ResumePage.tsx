import { useEffect } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { saveDraft } from '../../lib/draft';
import { usePageTitle } from '../../lib/usePageTitle';
import { Alert } from '../../ui/Alert';
import { LinkButton } from '../../ui/Button';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Lien reçu par e-mail : on garde l'identifiant et le code en mémoire d'onglet, puis on les retire de l'adresse (historique, partage). */
export function ResumePage() {
  usePageTitle('Reprendre ma demande');
  const [params] = useSearchParams();
  const id = params.get('id') ?? '';
  const code = params.get('code') ?? '';
  const valid = UUID.test(id) && code.length >= 20 && code.length <= 200;
  useEffect(() => { if (valid) saveDraft({ id, code }); }, [valid, id, code]);

  if (valid) return <Navigate to="/adhesion/demande?etape=2" replace />;
  return (
    <div className="container container--narrow stack">
      <h1>Lien incomplet</h1>
      <Alert kind="error" title="Nous ne pouvons pas rouvrir votre demande">Le lien est incomplet ou a été modifié. Utilisez le lien exact reçu par e-mail.</Alert>
      <LinkButton to="/adhesion" variant="secondary">Retour à la page d’adhésion</LinkButton>
    </div>
  );
}
