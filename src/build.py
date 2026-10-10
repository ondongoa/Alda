#!/usr/bin/env python3
"""Build the ALDA static site: assembles src/pages/* into site/<page>/index.html
with the shared head, navigation, contact block and footer.

Usage: python3 src/build.py
"""
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))
PAGES = os.path.join(ROOT, 'pages')
OUT = os.path.join(os.path.dirname(ROOT), 'site')

NAV = [
    ('studio', 'Studio', '/studio/'),
    ('domaines', 'Domaines', '/domaines/'),
    ('projets', 'Projets', '/projets/'),
    ('a-propos', 'À propos', '/a-propos/'),
    ('contact', 'Contact', '/contact/'),
]

CDN = {
    'gsap': '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>\n'
            '<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>\n'
            '<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.13/dist/lenis.min.js"></script>',
    'three': '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>',
}


def read(name):
    with open(os.path.join(PAGES, name), encoding='utf-8') as f:
        return f.read()


def nav(active):
    links = '\n'.join(
        '    <a href="{h}"{a} data-hover>{l}</a>'.format(
            h=h, l=l, a=' class="is-active" aria-current="page"' if k == active else '')
        for k, l, h in NAV)
    menu = '\n'.join(
        '    <a class="menu__link{a}" href="{h}">{l}</a>'.format(
            h=h, l=l, a=' is-active" aria-current="page' if k == active else '')
        for k, l, h in [('home', 'Accueil', '/')] + NAV)
    return f'''<header class="nav">
  <a href="/" class="nav__logo" data-hover>
    <img src="{{{{R}}}}assets/logo.jpg" alt="Logo ALDA">
    <span class="mono">ALDA</span>
  </a>
  <nav class="nav__links mono" aria-label="Navigation principale">
{links}
  </nav>
  <div class="nav__meta mono">
    <span class="clock"><span class="js-clock">--:--</span> BZV</span>
    <span class="status"><i class="nav__dot"></i>Disponible</span>
    <button class="nav__burger mono js-menu-open" aria-label="Ouvrir le menu">Menu</button>
  </div>
</header>

<div class="menu" aria-label="Menu mobile">
  <button class="menu__close mono js-menu-close" aria-label="Fermer le menu">Fermer</button>
  <nav>
{menu}
  </nav>
  <div class="mono muted">contact@alda-cg.com</div>
</div>'''


def contact_block(line1, line2, cta):
    return f'''  <section class="contact" id="contact">
    <span class="mono muted">Contact</span>
    <h2 class="contact__big" style="margin-top:28px">
      <span class="line"><span class="js-up">{line1}</span></span>
      <span class="line"><span class="js-up">{line2}</span></span>
    </h2>
    <div style="margin-top:40px" class="reveal">
      <a class="btn" href="/contact/" data-hover><span>{cta}</span><span>→</span></a>
    </div>
    <div class="contact__row">
      <div class="reveal"><span class="mono">Email</span><a href="mailto:contact@alda-cg.com" data-hover>contact@alda-cg.com</a></div>
      <div class="reveal"><span class="mono">Téléphone</span><a href="tel:+242050366565" data-hover>+242 05 036 65 65</a><br><a href="tel:+242065740441" data-hover>+242 06 574 04 41</a></div>
      <div class="reveal"><span class="mono">Adresse</span><p>Brazzaville<br>République du Congo</p></div>
      <div class="reveal"><span class="mono">Domaines</span><p>AI Kimia<br>Alda Pharma</p></div>
    </div>
  </section>'''


def footer():
    links = '\n'.join(f'      <a href="{h}" data-hover>{l}</a>' for _, l, h in NAV)
    return f'''  <footer class="foot wrap mono">
    <span>© <span class="js-year">2026</span> ALDA. Tous droits réservés.</span>
    <nav class="foot__links">
{links}
    </nav>
    <a href="#top" data-hover>Haut de page ↑</a>
  </footer>'''


def layout(p, body):
    loader = '''<div class="loader" aria-hidden="true">
  <div class="loader__top mono"><span>ALDA</span><span>Brazzaville — CG</span></div>
  <div class="loader__count"><span class="js-count">0</span></div>
  <div class="loader__bar"></div>
</div>
''' if p.get('loader') else ''
    scripts = [CDN['gsap']]
    if p.get('three'):
        scripts.append(CDN['three'])
    scripts += ['<script src="{{R}}assets/%s"></script>' % s for s in p.get('js', [])]
    scripts.append('<script src="{{R}}assets/site.js"></script>')
    html = f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{p["title"]}</title>
<meta name="description" content="{p["desc"]}">
<meta property="og:title" content="{p["title"]}">
<meta property="og:description" content="{p["desc"]}">
<meta property="og:image" content="https://alda-cg.com/assets/img/{p.get("og", "brazzaville-pont.webp")}">
<link rel="canonical" href="https://alda-cg.com{p["url"]}">
<link rel="icon" href="{{{{R}}}}assets/logo.jpg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;500&family=Inter:wght@300;400;500&family=JetBrains+Mono:wght@400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{{{{R}}}}assets/site.css">
</head>
<body class="loading">

{loader}<div class="cursor" aria-hidden="true"></div>
<div class="cursor__label" aria-hidden="true">Voir</div>

{nav(p["key"])}

<main id="top">

{body}

{footer()}
</main>

{chr(10).join(scripts)}
</body>
</html>
'''
    return html.replace('{{R}}', p['R'])


def main():
    method = read('_method.html').replace('(04) — Approche', '(02) — Approche')
    innovation = read('_innovation.html').replace('(03) — Innovation', '(03) — Innovation')
    panels = read('_panels.html')

    pages = [
        dict(key='home', url='/', out='index.html', R='', loader=True, three=True,
             js=['globe.js', 'africa.js'],
             title="ALDA",
             desc="ALDA, entreprise numérique basée à Brazzaville. Intelligence artificielle, logiciels métiers, fintech et transformation numérique pour les entreprises et les professionnels en Afrique.",
             body=read('_home_hero.html') + '\n\n' + read('_home_domains.html') + '\n\n' + read('_home_projects.html')
                  + '\n\n' + contact_block('Construisons', '<em>ensemble</em>', 'Démarrer un projet')),
        dict(key='studio', url='/studio/', out='studio/index.html', R='../',
             title='Studio — ALDA',
             desc="Le studio ALDA : intelligence artificielle, logiciels métiers, données et fintech, conçus et développés à Brazzaville.",
             body=read('studio.html').replace('{{METHOD}}', method).replace('{{INNOVATION}}', innovation)
                  + '\n\n' + contact_block('Construisons', '<em>ensemble</em>', 'Démarrer un projet')),
        dict(key='domaines', url='/domaines/', out='domaines/index.html', R='../',
             title='Domaines — ALDA',
             desc="AI Kimia, l'intelligence artificielle pour les professionnels de santé, et Alda Pharma, le logiciel d'officine.",
             body=read('domaines.html').replace('{{PANELS}}', panels)
                  + '\n\n' + contact_block('Une démo ?', '<em>Parlons-en</em>', 'Demander une démo')),
        dict(key='projets', url='/projets/', out='projets/index.html', R='../',
             title='Projets — ALDA',
             desc="Les projets d'ALDA : Alda Pharma, AI Kimia et nos projets à venir — fintech, traçabilité du médicament, données et éducation numérique.",
             body=read('_projets_main.html') + '\n\n' + contact_block('Un projet', 'en <em>tête</em> ?', 'Nous écrire')),
        dict(key='a-propos', url='/a-propos/', out='a-propos/index.html', R='../', og='brazzaville-fleuve.webp',
             title='À propos — ALDA',
             desc="ALDA, fondée à Brazzaville par Alex Ondongo et Célestin Junior Bongui : des solutions numériques pour accélérer la transformation numérique de l'Afrique.",
             body=read('a-propos.html') + '\n\n' + contact_block('Parlons', 'de votre <em>projet</em>', 'Nous écrire')),
        dict(key='contact', url='/contact/', out='contact/index.html', R='../',
             title='Contact — ALDA',
             desc="Contactez ALDA à Brazzaville : contact@alda-cg.com, +242 05 036 65 65, +242 06 574 04 41.",
             body=read('contact.html')),
    ]
    for p in pages:
        html = layout(p, p['body'])
        leftover = re.findall(r'\{\{[A-Z]+\}\}', html)
        assert not leftover, (p['out'], leftover)
        path = os.path.join(OUT, p['out'])
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        print('built', p['out'])


if __name__ == '__main__':
    main()
