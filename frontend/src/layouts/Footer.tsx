import { site } from '../lib/site';

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <section aria-labelledby="f-org">
          <h2 id="f-org">{site.name}</h2>
          <p>{site.fullName}</p>
          <p className="muted">{site.legal}</p>
        </section>
        <section aria-labelledby="f-contact">
          <h2 id="f-contact">Nous joindre</h2>
          <p>{site.address}</p>
          <p>Téléphone : {site.phones.join(' · ')}</p>
          <p>E-mail : <a href={`mailto:${site.email}`}>{site.email}</a></p>
        </section>
      </div>
    </footer>
  );
}
