# Comparaison visuelle (Playwright + Pillow). Prérequis : la référence tourne sur :5174 (avec ?p=<page>&id=<id>) et cette app sur :5173.
# Usage : python3 scripts/visual-compare.py 1440,390 [page1,page2]
import sys, io, json
from playwright.sync_api import sync_playwright
from PIL import Image, ImageChops

# page-name (référence), id, URL nouvelle app
PAGES = [
 ('home',None,'/'),('about',None,'/la-caph-ci'),('mission',None,'/la-caph-ci/mission'),('gouvernance',None,'/la-caph-ci/gouvernance'),
 ('actions',None,'/actions'),('action-detail','droits','/actions/droits'),
 ('projects',None,'/projets'),('project-detail','p1','/projets/p1'),
 ('delegations',None,'/delegations'),('news',None,'/actualites'),('news-detail','n1','/actualites/n1'),
 ('agenda',None,'/agenda'),('opportunities',None,'/opportunites'),('opportunity-detail','o1','/opportunites/o1'),
 ('oph',None,'/annuaire-oph'),('oph-detail','oph1','/annuaire-oph/oph1'),
 ('media',None,'/mediatheque'),('resources',None,'/ressources'),('resource-detail','r1','/ressources/r1'),
 ('cabinet',None,'/cabinet-conseil'),('devis',None,'/cabinet-conseil/demande-devis'),('transparency',None,'/transparence-impact'),
 ('adhesion',None,'/adherer'),('adhesion-form',None,'/adherer/demande'),('adhesion-confirm',None,'/adherer/confirmation'),
 ('partner',None,'/devenir-partenaire'),('partner-confirm',None,'/devenir-partenaire/confirmation'),
 ('donate',None,'/faire-un-don'),('donate-confirm',None,'/faire-un-don/confirmation'),
 ('contact',None,'/contact'),('members',None,'/espace-membres/connexion'),('not-found',None,'/page-inexistante'),
]
WIDTHS = [int(w) for w in sys.argv[1].split(',')] if len(sys.argv)>1 else [1440]
ONLY = sys.argv[2].split(',') if len(sys.argv)>2 else None
NEW='http://127.0.0.1:5173'; REF='http://127.0.0.1:5174'
CSS="*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}"

def shot(page,url,w):
    page.set_viewport_size({'width':w,'height':900})
    page.goto(url,wait_until='networkidle')
    page.wait_for_timeout(900)
    page.add_style_tag(content=CSS)
    page.wait_for_timeout(150)
    return Image.open(io.BytesIO(page.screenshot(full_page=True))).convert('RGB')

res=[]
with sync_playwright() as p:
    b=p.chromium.launch(); ctx=b.new_context(); pg=ctx.new_page()
    for name,pid,path in PAGES:
        if ONLY and name not in ONLY: continue
        for w in WIDTHS:
            q=f"/?p={name}"+(f"&id={pid}" if pid else '')
            a=shot(pg,REF+q,w); c=shot(pg,NEW+path,w)
            h=max(a.height,c.height)
            A=Image.new('RGB',(w,h),'white'); A.paste(a); C=Image.new('RGB',(w,h),'white'); C.paste(c)
            diff=ImageChops.difference(A,C).convert('L').point(lambda v:255 if v>24 else 0)
            bbox=diff.getbbox(); n=sum(1 for v in diff.getdata() if v)
            pct=100*n/(w*h)
            res.append((name,w,a.height,c.height,round(pct,3)))
            print(f"{name:18} {w:5} ref_h={a.height:6} new_h={c.height:6} diff={pct:.3f}% bbox={bbox}",flush=True)
            if pct>0.05:
                a.save(f'/home/claude/shots/{name}_{w}_ref.png'); c.save(f'/home/claude/shots/{name}_{w}_new.png')
    b.close()
