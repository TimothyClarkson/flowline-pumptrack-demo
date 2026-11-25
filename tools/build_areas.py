#!/usr/bin/env python3
"""Generates the demo 'Areas we serve' hub and location pages under /areas/."""
import json, os, html
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E = html.escape

COUNCIL_URL = {
 'Christchurch City Council': 'ccc.govt.nz', 'Selwyn District Council': 'selwyn.govt.nz',
 'Ashburton District Council': 'ashburtondc.govt.nz', 'Timaru District Council': 'timaru.govt.nz',
 'Waimakariri District Council': 'waimakariri.govt.nz', 'Hurunui District Council': 'hurunui.govt.nz'}

# region groups in display order
GROUPS = [
 ('Christchurch & Banks Peninsula', 'Our home base — city parks, schools and peninsula communities.'),
 ('Selwyn', 'Fast-growing towns and rural communities west and south of the city.'),
 ('Mid & South Canterbury', 'Ashburton through to Timaru and the foothill towns.'),
 ('Waimakariri', 'North of the Waimakariri River — coastal towns to the foothills.'),
 ('North Canterbury (Hurunui)', 'Amberley to Cheviot and the alpine village of Hanmer Springs.'),
]

A = [
 dict(slug='christchurch', name='Christchurch', group=0, council='Christchurch City Council', lat=-43.5321, lng=172.6362, km=0, area='Ōtautahi Christchurch',
  intro="Christchurch is our home base, so city projects get the shortest travel times and the most hands-on support — from early concept design through to opening day.",
  context="With a large network of suburban parks, school grounds and community reserves across the city, there's real scope for pump tracks that serve a neighbourhood rather than the whole city. We work with council park planners, community boards and school boards of trustees alike.",
  ground="Much of the city sits on flat, low-lying ground, so drainage and finished levels get careful attention at concept stage. On older or variable ground we allow for geotechnical checks before final pricing.",
  near=['rolleston','kaiapoi','akaroa-banks-peninsula','lincoln']),
 dict(slug='rolleston', name='Rolleston', group=1, council='Selwyn District Council', lat=-43.5906, lng=172.3797, km=23, area='Rolleston',
  intro="Rolleston has grown quickly into one of Canterbury's largest towns, and new subdivisions bring a steady need for active spaces for young families.",
  context="Pump tracks suit Rolleston's new neighbourhood reserves and school sites well: they're compact, low-maintenance and used by every age group. We can help with concept designs that support community board and council planning conversations.",
  ground="Rolleston sits on the free-draining stony gravels of the Canterbury Plains, which generally suit sealed tracks — though exposure to the nor'wester is worth considering when placing shelter and seating.",
  near=['lincoln','selwyn','darfield','christchurch']),
 dict(slug='lincoln', name='Lincoln', group=1, council='Selwyn District Council', lat=-43.6400, lng=172.4860, km=22, area='Lincoln',
  intro="Lincoln combines a growing residential community with the student population around Lincoln University, so active spaces here get used by a wide age range.",
  context="We design pump tracks for Lincoln reserves and schools that work for balance bikes through to confident teenage riders, with beginner lines kept separate from faster flow.",
  ground="Flat plains ground around Lincoln generally suits both asphalt and concrete tracks; we still check drainage paths and services before finalising a layout.",
  near=['rolleston','selwyn','leeston','christchurch']),
 dict(slug='selwyn', name='Selwyn', group=1, council='Selwyn District Council', lat=-43.5800, lng=172.5130, km=15, area='Selwyn District',
  intro="Selwyn District stretches from the city's edge across the plains to the Southern Alps, taking in towns like Prebbleton, West Melton, Rolleston, Lincoln, Darfield and Leeston.",
  context="Whether it's a township reserve, a rural school or a domain shared by a small community, we size pump tracks to the people who'll use them — including modular options for smaller settlements that want to trial a track first.",
  ground="Ground conditions vary from plains gravels to foothill sites. Our concept stage covers levels, drainage and access so smaller communities get realistic budgets early.",
  near=['rolleston','lincoln','darfield','leeston']),
 dict(slug='darfield', name='Darfield', group=1, council='Selwyn District Council', lat=-43.4890, lng=172.1110, km=45, area='Darfield',
  intro="Darfield is the main service town for the Malvern area, serving a wide rural catchment between the plains and the foothills.",
  context="For a town that draws families in from surrounding farms, a pump track at a central reserve or school can become a real gathering point. We often suggest modular or compact asphalt layouts that suit smaller budgets.",
  ground="Inland sites can see harder frosts and stronger winds than the city, which we factor into surface choice, edge detailing and curing windows for concrete.",
  near=['selwyn','rolleston','oxford','methven']),
 dict(slug='leeston', name='Leeston', group=1, council='Selwyn District Council', lat=-43.7630, lng=172.2970, km=40, area='Leeston',
  intro="Leeston is the hub of the Ellesmere area, a rural community south of Lincoln close to Te Waihora / Lake Ellesmere.",
  context="Smaller towns like Leeston often suit a single community loop that schools, families and visiting riders can share. We help community groups with concept images and cost breakdowns for funding applications.",
  ground="Low-lying ground in parts of the Ellesmere area makes drainage design and finished levels a priority from day one.",
  near=['lincoln','selwyn','rolleston','ashburton']),
 dict(slug='ashburton', name='Ashburton', group=2, council='Ashburton District Council', lat=-43.9030, lng=171.7480, km=87, area='Hakatere Ashburton',
  intro="Ashburton is Mid Canterbury's main town and service centre, about an hour and a half south of our Christchurch base.",
  context="With schools, sports grounds and town reserves serving a large rural district, Ashburton suits both a destination-scale community track and smaller school loops. We plan builds to minimise trips and keep crews on site efficiently.",
  ground="Plains gravels generally drain well; open sites can be exposed to wind, so we look at shelter, shade and seating as part of the concept.",
  near=['methven','geraldine','leeston','temuka']),
 dict(slug='methven', name='Methven', group=2, council='Ashburton District Council', lat=-43.6330, lng=171.6470, km=95, area='Methven',
  intro="Methven is a foothills town best known as the gateway to Mt Hutt, with a busy winter season and an active outdoor community year-round.",
  context="A pump track gives locals and visiting families something to ride outside the ski season. We can also discuss MTB trails, jump lines and skills areas that suit an outdoors-focused community.",
  ground="Higher altitude means colder winters and harder frosts, which shapes our surface recommendations and when we schedule sealing and concrete work.",
  near=['ashburton','darfield','geraldine','selwyn']),
 dict(slug='geraldine', name='Geraldine', group=2, council='Timaru District Council', lat=-44.0920, lng=171.2440, km=140, area='Geraldine',
  intro="Geraldine is a South Canterbury village at the foot of the hills, on the main route between the plains and the Mackenzie Country.",
  context="For a smaller town with plenty of passing visitors, a well-placed pump track can serve both locals and families stopping on a road trip. Compact asphalt loops and modular tracks are both good fits.",
  ground="Foothill sites can be sloping and see cold winters; our concept designs use the natural fall of the land where possible to reduce earthworks.",
  near=['temuka','timaru','ashburton','methven']),
 dict(slug='temuka', name='Temuka', group=2, council='Timaru District Council', lat=-44.2450, lng=171.2770, km=145, area='Temuka',
  intro="Temuka sits between Timaru and Geraldine and serves a close-knit South Canterbury community.",
  context="We design tracks for Temuka reserves and schools that suit local families first, with layouts that can be expanded later as use grows — a good fit for staged funding.",
  ground="River-flat and plains sites around Temuka need sensible drainage design; we confirm ground conditions on the site visit.",
  near=['timaru','geraldine','ashburton']),
 dict(slug='timaru', name='Timaru', group=2, council='Timaru District Council', lat=-44.3970, lng=171.2550, km=160, area='Te Tihi-o-Maru Timaru',
  intro="Timaru is South Canterbury's largest town and port city, and the southern end of the area we serve.",
  context="With a mix of coastal parks, suburban reserves and schools, Timaru can support anything from a school learn-to-ride loop to a larger community track. We plan South Canterbury builds in efficient blocks to keep travel costs down.",
  ground="Coastal and hillside sites both feature in Timaru; we assess slope, drainage and exposure to sea air when recommending asphalt, concrete or modular surfaces.",
  near=['temuka','geraldine','ashburton']),
 dict(slug='rangiora', name='Rangiora', group=3, council='Waimakariri District Council', lat=-43.3040, lng=172.5960, km=30, area='Rangiora',
  intro="Rangiora is Waimakariri's main town, around half an hour north of Christchurch, with a growing population of young families.",
  context="We work with schools, community groups and council planners on tracks that suit town reserves and school grounds, from compact loops to larger community layouts.",
  ground="Plains gravels generally drain well around Rangiora; we still check services and levels carefully on established reserves.",
  near=['kaiapoi','woodend-pegasus','oxford','amberley']),
 dict(slug='kaiapoi', name='Kaiapoi', group=3, council='Waimakariri District Council', lat=-43.3780, lng=172.6570, km=20, area='Kaiapoi',
  intro="Kaiapoi is a riverside town just north of the Waimakariri River, a short drive from our Christchurch base.",
  context="Riverside reserves and school grounds make natural homes for pump tracks that families can reach on bikes and scooters. We can help with community consultation and concept images for local boards.",
  ground="Low-lying, sandy and river-influenced ground means drainage, finished levels and ground testing get extra attention at concept stage.",
  near=['woodend-pegasus','rangiora','christchurch']),
 dict(slug='woodend-pegasus', name='Woodend & Pegasus', group=3, council='Waimakariri District Council', lat=-43.3170, lng=172.6750, km=25, area='Woodend and Pegasus',
  intro="Woodend and the newer planned town of Pegasus sit close together near the coast, north of Kaiapoi.",
  context="Growing coastal communities like these often want active spaces for kids and teens close to home. We design tracks that fit neighbourhood reserves and can be staged as the area grows.",
  ground="Sandy coastal soils and a high water table in places call for careful sub-base and drainage design, which we cover in the concept and pricing.",
  near=['kaiapoi','rangiora','amberley']),
 dict(slug='oxford', name='Oxford', group=3, council='Waimakariri District Council', lat=-43.2970, lng=172.1920, km=55, area='Oxford',
  intro="Oxford is a foothills town at the western edge of Waimakariri, close to forest and hill country popular with riders and walkers.",
  context="A pump track in Oxford can link naturally with local trail riding — and we also design and build MTB trails, jump lines and skills parks for clubs and land owners.",
  ground="Foothill sites can see colder winters, frost and more rain than the plains, which we design for with surface choice and drainage.",
  near=['rangiora','darfield','amberley']),
 dict(slug='amberley', name='Amberley', group=4, council='Hurunui District Council', lat=-43.1560, lng=172.7310, km=48, area='Amberley',
  intro="Amberley is the Hurunui District's main town and council seat, a short drive north of Waimakariri.",
  context="We work with Hurunui community groups and schools on tracks sized for smaller towns, including modular pump tracks that can be trialled or moved between communities.",
  ground="Plains and lower-hill sites around Amberley generally drain well; we check wind exposure and access for construction vehicles.",
  near=['waipara-hurunui','rangiora','woodend-pegasus','cheviot']),
 dict(slug='waipara-hurunui', name='Waipara & Hurunui', group=4, council='Hurunui District Council', lat=-43.0590, lng=172.7570, km=60, area='Waipara and the wider Hurunui',
  intro="Waipara and the wider Hurunui district are known for wine valleys, rolling farmland and small rural communities.",
  context="For small townships and rural schools, a compact or modular pump track can be a big win. We help community groups prepare concept images and costings for local funders.",
  ground="Rolling and sloping sites are common; we use the natural fall of the land in our designs to reduce earthworks and cost.",
  near=['amberley','hanmer-springs','cheviot']),
 dict(slug='hanmer-springs', name='Hanmer Springs', group=4, council='Hurunui District Council', lat=-42.5230, lng=172.8290, km=135, area='Hanmer Springs',
  intro="Hanmer Springs is an alpine resort village known for its thermal pools and forest trails, with lots of visiting families as well as locals.",
  context="A village with a strong riding culture suits a pump track that works for visiting kids and experienced riders alike. We also design and build MTB trails, jump lines and skills parks.",
  ground="Alpine winters bring snow and hard frosts, so surface choice, edge detailing and build timing are planned around the seasons.",
  near=['waipara-hurunui','cheviot','amberley']),
 dict(slug='cheviot', name='Cheviot', group=4, council='Hurunui District Council', lat=-42.8130, lng=173.2730, km=115, area='Cheviot',
  intro="Cheviot is a small rural town in the north of Hurunui, our northern limit for regular builds.",
  context="For small communities, modular pump tracks to buy or hire are a cost-effective way to provide a safe riding space — and they can move to another venue later.",
  ground="We assess access, levels and drainage on the site visit and plan remote builds to keep crew travel efficient.",
  near=['amberley','waipara-hurunui','hanmer-springs']),
 dict(slug='akaroa-banks-peninsula', name='Akaroa & Banks Peninsula', group=0, council='Christchurch City Council', lat=-43.8040, lng=172.9680, km=82, area='Akaroa and Banks Peninsula',
  intro="Banks Peninsula's harbour settlements, including Akaroa, are part of Christchurch City but have very different sites to work with.",
  context="Smaller peninsula communities often suit compact asphalt loops or modular tracks that fit limited flat space. We design to the land rather than forcing a standard layout.",
  ground="Steep volcanic hill country and narrow roads mean careful planning for access, earthworks and drainage — all covered in our concept and site visit.",
  near=['christchurch','lincoln']),
]
BY = {a['slug']: a for a in A}
BASE = 'https://timothyclarkson.github.io/flowline-pumptrack-demo/'

REGION_IMG = {'christchurch':'plains','rolleston':'plains','lincoln':'plains','selwyn':'plains','darfield':'foothills','leeston':'plains',
 'ashburton':'plains','methven':'foothills','geraldine':'foothills','temuka':'plains','timaru':'coastal','rangiora':'plains','kaiapoi':'coastal',
 'woodend-pegasus':'coastal','oxford':'foothills','amberley':'north','waipara-hurunui':'north','hanmer-springs':'foothills','cheviot':'north',
 'akaroa-banks-peninsula':'coastal'}

SERVICES = [
 ('Pump track design & construction', 'Asphalt and concrete pump tracks designed for your site and built by our own crew.'),
 ('Concept designs & 3D renders', '2D layouts and 3D concepts for council, land owner and funding presentations.'),
 ('Modular pump tracks — buy or hire', 'Composite, relocatable tracks for schools, trials and events.'),
 ('Bike parks & MTB trails', 'Bike park design and mountain bike trail building that fits the landscape.'),
 ('Dirt jumps & jump lines', 'Progressive jump lines with safe run-outs for local riders and clubs.'),
 ('Bikes in Schools & skills tracks', 'School bike tracks, learn-to-ride loops and skills parks.'),
 ('Consultation & funding support', 'Community consultation, drawings and cost breakdowns for funding bids.'),
 ('Maintenance & resurfacing', 'Inspections, repairs and resurfacing for existing tracks and trails.'),
]

def head(title, desc, prefix, schema):
    return f'''<!doctype html>
<html lang="en-NZ">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{E(title)}</title>
<meta name="description" content="{E(desc)}">
<meta name="robots" content="noindex">
<link rel="icon" href="{prefix}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="{prefix}styles.css">
<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>
</head>
<body class="subpage">
<div class="demo-ribbon">Demo site — fictional company, sample content only</div>
<header class="nav" id="nav">
  <a href="{prefix}index.html" class="brand" aria-label="Flowline home">
    <svg class="brand-mark" viewBox="0 0 40 40" aria-hidden="true"><defs><linearGradient id="bm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d9ff5b"/><stop offset="1" stop-color="#5be3b0"/></linearGradient></defs><rect width="40" height="40" rx="11" fill="#0f1a17"/><path d="M7 26c4 0 5-12 9-12s4 12 8 12 5-12 9-12" fill="none" stroke="url(#bm)" stroke-width="3.4" stroke-linecap="round"/></svg>
    <span class="brand-word">Flowline<span class="brand-sub">Pump Tracks</span></span>
  </a>
  <nav class="nav-links" id="navLinks">
    <a href="{prefix}index.html#services">Services</a><a href="{prefix}index.html#surfaces">Surfaces</a><a href="{prefix}index.html#how">Process</a><a href="{prefix}areas/index.html">Areas</a><a href="{prefix}index.html#faq">FAQ</a>
  </nav>
  <a href="{prefix}index.html#estimate" class="btn btn-sm btn-dark">Get an estimate</a>
  <button class="nav-toggle" id="navToggle" aria-label="Menu"><span></span><span></span></button>
</header>
<main>
'''

def footer(prefix):
    links = ''.join(f'<a href="{prefix}areas/{a["slug"]}/index.html">{E(a["name"])}</a>' for a in A)
    return f'''</main>
<footer class="footer">
  <div class="container foot-inner">
    <div class="brand foot-brand"><span class="brand-word">Flowline<span class="brand-sub">Pump Tracks</span></span></div>
    <p>Ōtautahi Christchurch, Aotearoa New Zealand · hello@flowline.example</p>
    <nav class="foot-areas" aria-label="Areas we serve"><a href="{prefix}areas/index.html"><b>Areas we serve:</b></a>{links}</nav>
    <p class="fine">Demo website. Flowline Pump Tracks is a fictional company; local pages are sample content and don't describe real projects. Travel distances are approximate.</p>
  </div>
</footer>
<script>
(()=>{{const n=document.getElementById('nav');addEventListener('scroll',()=>n.classList.toggle('scrolled',scrollY>10),{{passive:true}});
document.getElementById('navToggle').onclick=()=>n.classList.toggle('open');
const io=new IntersectionObserver(es=>es.forEach(e=>{{if(e.isIntersecting){{e.target.classList.add('in');io.unobserve(e.target)}}}}),{{threshold:.1}});
document.querySelectorAll('.reveal').forEach((el,i)=>{{el.style.transitionDelay=(i%6)*60+'ms';io.observe(el)}});}})();
</script>
<script src="{prefix}motion.js"></script>
</body>
</html>
'''

BIZ = {'@type': 'LocalBusiness', '@id': '#flowline', 'name': 'Flowline Pump Tracks (demo)',
       'description': 'Fictional demo company: pump track design and construction in Canterbury, NZ.',
       'address': {'@type': 'PostalAddress', 'addressLocality': 'Christchurch', 'addressRegion': 'Canterbury', 'addressCountry': 'NZ'},
       'email': 'hello@flowline.example'}

def page(a):
    p = '../../'
    town = a['name']
    group = GROUPS[a['group']][0]
    est = f"{p}index.html?lat={a['lat']}&lng={a['lng']}&place={town.replace(' ', '+').replace('&', '%26')}#estimate"
    travel = "Our home base" if a['km'] == 0 else f"approx. {a['km']} km by road from our Christchurch base"
    title = f"Pump Track Builder {town} | Design, Construction & Modular Pump Tracks — Flowline"
    desc = f"Pump track design and construction in {a['area']}, {a['council'].replace(' Council','')}. Asphalt, concrete and modular pump tracks, bike parks, MTB trails and Bikes in Schools tracks for councils and schools. Demo site."
    schema = {'@context': 'https://schema.org', '@graph': [
        {**BIZ, 'areaServed': {'@type': 'City', 'name': town, 'containedInPlace': {'@type': 'AdministrativeArea', 'name': a['council'].replace(' Council', '')}}},
        {'@type': 'Service', 'serviceType': 'Pump track design and construction', 'name': f'Pump track builder — {town}', 'provider': {'@id': '#flowline'},
         'areaServed': {'@type': 'City', 'name': town},
         'hasOfferCatalog': {'@type': 'OfferCatalog', 'name': 'Services', 'itemListElement': [{'@type': 'Offer', 'itemOffered': {'@type': 'Service', 'name': s}} for s, _ in SERVICES]}},
        {'@type': 'BreadcrumbList', 'itemListElement': [
            {'@type': 'ListItem', 'position': 1, 'name': 'Home', 'item': BASE},
            {'@type': 'ListItem', 'position': 2, 'name': 'Areas we serve', 'item': BASE + 'areas/'},
            {'@type': 'ListItem', 'position': 3, 'name': town, 'item': BASE + 'areas/' + a['slug'] + '/'}]}]}
    svc = ''.join(f'<article class="svc reveal"><span class="svc-n">{i+1:02d}</span><h3>{E(s)}{" in " + E(town) if i in (0,2) else ""}</h3><p>{E(d)}</p></article>' for i, (s, d) in enumerate(SERVICES))
    near = ''.join(f'<a class="chip" href="../{n}/index.html">{E(BY[n]["name"])}</a>' for n in a['near'])
    kw = [f'Pump track builder {town}', f'Pump track design {town}', f'Asphalt & concrete pump tracks {town}', f'Modular pump track hire {town}', f'Bikes in Schools tracks {town}', f'Bike park & MTB trail building {group}']
    kwhtml = ''.join(f'<li>{E(k)}</li>' for k in kw)
    return head(title, desc, p, schema) + f'''
<section class="area-hero has-img">
  <div class="hero-bg" aria-hidden="true"><div class="area-bg" data-parallax="60" style="background-image:url(../../assets/region-{REGION_IMG[a['slug']]}.webp)"></div><div class="area-shade"></div><div class="grain"></div></div>
  <span class="media-note">AI-generated illustrative image</span>
  <div class="container">
    <nav class="crumbs reveal" aria-label="Breadcrumb"><a href="../../index.html">Home</a><span>/</span><a href="../index.html">Areas we serve</a><span>/</span><span>{E(town)}</span></nav>
    <p class="eyebrow reveal"><span class="dot"></span> {E(group)} · {E(a['council'])}</p>
    <h1 class="reveal">Pump track builder<br><em>in {E(town)}.</em></h1>
    <p class="lead reveal">{E(a['intro'])}</p>
    <div class="hero-cta reveal">
      <a href="{est}" class="btn btn-accent">Estimate a track in {E(town)} <span class="arr">→</span></a>
      <a href="../../index.html#book" class="btn btn-ghost">Book a site visit</a>
    </div>
    <dl class="area-facts reveal">
      <div><dt>Council</dt><dd>{E(a['council'])}</dd></div>
      <div><dt>Service area</dt><dd>{E(group)}</dd></div>
      <div><dt>Travel</dt><dd>{E(travel)}</dd></div>
    </dl>
  </div>
</section>

<section class="section">
  <div class="container area-grid">
    <div class="reveal">
      <p class="eyebrow">Pump tracks for {E(town)}</p>
      <h2>Built for <em>local riders.</em></h2>
      <p class="sub">{E(a['context'])}</p>
    </div>
    <div class="area-card reveal">
      <h3>Local site considerations</h3>
      <p>{E(a['ground'])}</p>
      <h3>Working with {E(a['council'])}</h3>
      <p>For council-owned reserves we can prepare concept designs, drawings and cost breakdowns to support conversations with {E(a['council'])} parks and community teams. For schools, we work directly with your principal and board. Check consent requirements with the council at <span class="mono">{COUNCIL_URL[a['council']]}</span>.</p>
      <h3>Build types</h3>
      <p><b>Track only</b> surfaces just the riding line (typically 1.5 m wide); <b>Fill in</b> surfaces the whole area. Both are priced at $400–$600 per surfaced m², excl. GST.</p>
    </div>
  </div>
</section>

<section class="section section-tint">
  <div class="container">
    <div class="section-head reveal">
      <p class="eyebrow">Services in {E(town)}</p>
      <h2>Everything from <em>concept to care.</em></h2>
    </div>
    <div class="svc-grid">{svc}</div>
  </div>
</section>

<section class="section estimator-teaser">
  <div class="container teaser-inner reveal">
    <div>
      <p class="eyebrow">Instant estimator</p>
      <h2>See a price range for <em>{E(town)}.</em></h2>
      <p class="sub">The map opens centred on {E(town)}. Find your exact site, draw the track line or the whole area, and get an indicative range in seconds.</p>
    </div>
    <a href="{est}" class="btn btn-accent">Open the estimator for {E(town)} <span class="arr">→</span></a>
  </div>
</section>

<section class="section">
  <div class="container area-grid">
    <div class="reveal">
      <p class="eyebrow">Common searches we cover</p>
      <ul class="kw-list">{kwhtml}</ul>
    </div>
    <div class="reveal">
      <p class="eyebrow">Nearby areas</p>
      <div class="chips">{near}<a class="chip chip-dark" href="../index.html">All areas →</a></div>
      <div class="faq area-faq">
        <details><summary>Do you build pump tracks in {E(town)}?</summary><p>Yes — {E(town)} is within our {E(group)} service area ({E(travel)}). We start with a free site visit.</p></details>
        <details><summary>How much does a pump track cost in {E(town)}?</summary><p>We price surfaced area at $400–$600 per m², excl. GST, for both Track only and Fill in builds. Use the estimator for a range, then we confirm on site — remote sites may include travel.</p></details>
        <details><summary>Can we hire a modular pump track for an event in {E(town)}?</summary><p>Yes. Modular composite tracks can be hired for events, trials and school terms, or bought outright.</p></details>
      </div>
    </div>
  </div>
</section>
''' + footer(p)

def hub():
    p = '../'
    cards = ''
    for gi, (g, gd) in enumerate(GROUPS):
        items = ''.join(f'<a class="area-link" href="{a["slug"]}/index.html"><span><b>{E(a["name"])}</b><small>{E(a["council"])} · {"home base" if a["km"]==0 else "~"+str(a["km"])+" km"}</small></span><span class="arr">→</span></a>' for a in A if a['group'] == gi)
        cards += f'<div class="area-group reveal"><h3>{E(g)}</h3><p>{E(gd)}</p><div class="area-links">{items}</div></div>'
    schema = {'@context': 'https://schema.org', '@graph': [{**BIZ, 'areaServed': [{'@type': 'City', 'name': a['name']} for a in A]}]}
    return head('Areas We Serve | Pump Track Builders Across Canterbury — Timaru to Cheviot | Flowline',
                'Flowline builds pump tracks, bike parks and trails across Canterbury — from Timaru in the south to Amberley and Cheviot in the north. Demo site.', p, schema) + f'''
<section class="area-hero has-img">
  <div class="hero-bg" aria-hidden="true"><div class="area-bg" data-parallax="60" style="background-image:url(../assets/region-plains.webp)"></div><div class="area-shade"></div><div class="grain"></div></div>
  <span class="media-note">AI-generated illustrative image</span>
  <div class="container">
    <nav class="crumbs reveal" aria-label="Breadcrumb"><a href="../index.html">Home</a><span>/</span><span>Areas we serve</span></nav>
    <p class="eyebrow reveal"><span class="dot"></span> Canterbury · Timaru to Cheviot</p>
    <h1 class="reveal">Areas <em>we serve.</em></h1>
    <p class="lead reveal">From our Christchurch base we design and build pump tracks, bike parks and trails across Canterbury — south to Timaru, north to Amberley, Hanmer Springs and Cheviot, and out to Banks Peninsula.</p>
  </div>
</section>
<section class="section">
  <div class="container area-groups">{cards}</div>
</section>
<section class="cta-band"><div class="container cta-inner reveal"><h2>Not on the list?</h2><a href="../index.html#book" class="btn btn-accent">Ask about your area <span class="arr">→</span></a></div></section>
''' + footer(p)

os.makedirs(os.path.join(ROOT, 'areas'), exist_ok=True)
open(os.path.join(ROOT, 'areas', 'index.html'), 'w').write(hub())
for a in A:
    d = os.path.join(ROOT, 'areas', a['slug']); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w').write(page(a))
print(len(A), 'area pages + hub written')
