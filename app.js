(() => {
  const DATA = window.TERRAUGUSTA_DATA;
  const articles = DATA.articles;
  const byId = new Map(articles.map(a => [a.id, a]));
  const $ = s => document.querySelector(s);
  const content = $('#content');
  const searchInput = $('#searchInput');
  const suggestions = $('#searchSuggestions');
  let statusFilter = 'TODOS';

  const cls = s => s === 'CANON' ? 'canon' : s === 'ABERTO' ? 'open' : 'provisional';
  const badge = s => `<span class="badge ${cls(s)}">${s}</span>`;
  const link = id => byId.has(id) ? `<a href="#article/${id}">${byId.get(id).title}</a>` : id;

  function normalize(s=''){
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  }
  function searchable(a){
    return normalize([a.title,a.type,a.region,a.status,a.summary,...(a.aliases||[]),...(a.tags||[]),...Object.values(a.sections||{})].join(' '));
  }

  function buildSidebar(){
    const regions = [...new Set(articles.map(a=>a.region))].sort((a,b)=>a.localeCompare(b,'pt'));
    const types = [...new Set(articles.map(a=>a.type))].sort((a,b)=>a.localeCompare(b,'pt'));
    $('#regionLinks').innerHTML = regions.map(r=>`<a href="#region/${encodeURIComponent(r)}">${r}</a>`).join('');
    $('#typeLinks').innerHTML = types.map(t=>`<a href="#type/${encodeURIComponent(t)}">${t}</a>`).join('');
    $('#version').textContent = DATA.meta.version;
  }

  function home(){
    const counts = {
      total:articles.length,
      canon:articles.filter(a=>a.status==='CANON').length,
      open:articles.filter(a=>a.status==='ABERTO').length,
      provisional:articles.filter(a=>a.status==='PROVISÓRIO').length
    };
    const featured = ['terraugusta','aelvar','verdoria','safrath','nova-astelia','pedra-do-mundo'];
    const regions = ['Sacralia','Aelvar','Verdória','Safrath','Nornando de Feronha',"Nova Krep'Ga",'Nova Astelia'];
    content.innerHTML = `
      <section class="hero">
        <h1>${DATA.meta.title}</h1>
        <p class="lead">Enciclopédia de referência do cenário, organizada no estilo de uma wiki e com separação explícita entre material <strong>CANON</strong>, <strong>ABERTO</strong> e <strong>PROVISÓRIO</strong>.</p>
        <p><small>Última revisão desta versão: ${DATA.meta.updated}</small></p>
      </section>
      <section class="stats">
        <div class="stat"><strong>${counts.total}</strong><span>páginas</span></div>
        <div class="stat"><strong>${counts.canon}</strong><span>canon</span></div>
        <div class="stat"><strong>${counts.open}</strong><span>abertas</span></div>
        <div class="stat"><strong>${counts.provisional}</strong><span>provisórias</span></div>
      </section>
      <div class="grid">
        <section class="card">
          <h2>Artigos em destaque</h2>
          <div class="card-body"><ul>${featured.map(id=>`<li>${link(id)} — ${byId.get(id).summary}</li>`).join('')}</ul></div>
        </section>
        <section class="card">
          <h2>Explorar por território</h2>
          <div class="card-body"><ul>${regions.map(r=>`<li><a href="#region/${encodeURIComponent(r)}">${r}</a> <small>(${articles.filter(a=>a.region===r).length} páginas)</small></li>`).join('')}</ul></div>
        </section>
        <section class="card">
          <h2>Estado do cânone</h2>
          <div class="card-body">
            <p>O site não preenche lacunas automaticamente. Entradas abertas ou provisórias são mantidas visíveis até uma decisão explícita.</p>
            <p><a href="#issues">Ver questões abertas e provisórias →</a></p>
          </div>
        </section>
        <section class="card">
          <h2>Campanhas</h2>
          <div class="card-body"><ul>
            <li>${link('herois-improvaveis')}</li>
            <li>${link('arautos-do-eclipse')}</li>
            <li>${link('fora-do-domo')}</li>
          </ul></div>
        </section>
      </div>
    `;
    document.title = `${DATA.meta.title}`;
  }

  function articlePage(id){
    const a = byId.get(id);
    if(!a){ notFound(); return; }
    const sectionNames = Object.keys(a.sections||{});
    content.innerHTML = `
      <article class="article">
        <h1 class="page-title">${a.title}</h1>
        <div class="subtitle">${a.type} · ${a.region} · ${badge(a.status)}</div>
        <hr class="rule">
        <aside class="article-meta">
          <h3>${a.title}</h3>
          <dl>
            <dt>Status</dt><dd>${badge(a.status)}</dd>
            <dt>Tipo</dt><dd>${a.type}</dd>
            <dt>Região</dt><dd><a href="#region/${encodeURIComponent(a.region)}">${a.region}</a></dd>
            <dt>Aliases</dt><dd>${(a.aliases||[]).length ? a.aliases.join(', ') : '—'}</dd>
          </dl>
        </aside>
        <p class="lead">${a.summary}</p>
        ${sectionNames.length>1 ? `<nav class="toc"><strong>Conteúdo</strong><ol>${sectionNames.map((s,i)=>`<li><a href="#sec-${i}">${s}</a></li>`).join('')}</ol></nav>`:''}
        ${sectionNames.map((s,i)=>`<section><h2 id="sec-${i}">${s}</h2><p>${a.sections[s]}</p></section>`).join('')}
        ${(a.related||[]).length ? `<section><h2>Ver também</h2><div class="related">${a.related.map(link).join('')}</div></section>`:''}
        ${a.status!=='CANON' ? `<div class="notice">${badge(a.status)} Esta página contém material que ainda não deve ser tratado como fato definitivo em todos os contextos.</div>`:''}
      </article>
    `;
    document.title = `${a.title} — Terraugusta`;
    content.focus();
    window.scrollTo(0,0);
  }

  function listPage(title, subset){
    const filtered = statusFilter==='TODOS' ? subset : subset.filter(a=>a.status===statusFilter);
    content.innerHTML = `
      <h1 class="page-title">${title}</h1><hr class="rule">
      <div class="list-toolbar">
        <span>Filtrar status:</span>
        ${['TODOS','CANON','ABERTO','PROVISÓRIO'].map(s=>`<button class="chip ${statusFilter===s?'active':''}" data-status="${s}">${s}</button>`).join('')}
      </div>
      <div class="page-list">
        ${filtered.length ? filtered.sort((a,b)=>a.title.localeCompare(b.title,'pt')).map(a=>`
          <div class="page-row">
            <div><a class="title" href="#article/${a.id}">${a.title}</a><br><small>${a.summary}</small></div>
            <div class="type">${a.type}</div>
            <div class="region">${a.region}</div>
            <div>${badge(a.status)}</div>
          </div>`).join('') : `<div class="empty">Nenhuma página para este filtro.</div>`}
      </div>`;
    content.querySelectorAll('[data-status]').forEach(btn=>btn.addEventListener('click',()=>{
      statusFilter = btn.dataset.status;
      route();
    }));
    document.title = `${title} — Terraugusta`;
  }

  function issuesPage(){
    content.innerHTML = `
      <h1 class="page-title">Abertos & provisórios</h1>
      <p class="subtitle">Questões deliberadamente não resolvidas pelo compêndio.</p>
      <hr class="rule">
      ${DATA.issues.map(i=>`<div class="issue ${cls(i.status)}"><strong>${i.title}</strong> ${badge(i.status)}<p>${i.text}</p></div>`).join('')}
      <h2 style="font-family:Georgia,serif;font-weight:400;border-bottom:1px solid var(--line)">Páginas não canônicas</h2>
      <div class="page-list">
      ${articles.filter(a=>a.status!=='CANON').map(a=>`<div class="page-row"><div><a class="title" href="#article/${a.id}">${a.title}</a><br><small>${a.summary}</small></div><div class="type">${a.type}</div><div class="region">${a.region}</div><div>${badge(a.status)}</div></div>`).join('')}
      </div>`;
    document.title = `Abertos & provisórios — Terraugusta`;
  }

  function searchPage(q){
    const n = normalize(q);
    const results = articles
      .map(a=>({a,score:(normalize(a.title).includes(n)?10:0)+(searchable(a).includes(n)?1:0)}))
      .filter(x=>x.score>0).sort((x,y)=>y.score-x.score||x.a.title.localeCompare(y.a.title,'pt')).map(x=>x.a);
    content.innerHTML = `
      <h1 class="page-title">Resultados de pesquisa</h1>
      <p class="subtitle">Consulta: “${escapeHtml(q)}” · ${results.length} resultado(s)</p><hr class="rule">
      ${results.length ? `<div class="page-list">${results.map(a=>`
        <div class="page-row">
          <div><a class="title" href="#article/${a.id}">${a.title}</a><br><small>${a.summary}</small></div>
          <div class="type">${a.type}</div><div class="region">${a.region}</div><div>${badge(a.status)}</div>
        </div>`).join('')}</div>` : `<div class="empty">Nenhuma página encontrada. Tente outro nome, local, personagem ou palavra-chave.</div>`}`;
    document.title = `Pesquisa: ${q} — Terraugusta`;
  }

  function notFound(){
    content.innerHTML = `<h1 class="page-title">Página não encontrada</h1><hr class="rule"><div class="empty">Esta página não existe nesta versão do compêndio. <a href="#home">Voltar à página principal</a>.</div>`;
  }

  function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));}

  function route(){
    const raw = location.hash.slice(1) || 'home';
    const [kind,...rest] = raw.split('/');
    const value = decodeURIComponent(rest.join('/'));
    if(kind==='home') home();
    else if(kind==='article') articlePage(value);
    else if(kind==='all') listPage('Todas as páginas', articles.slice());
    else if(kind==='issues') issuesPage();
    else if(kind==='region') listPage(value, articles.filter(a=>a.region===value));
    else if(kind==='type') listPage(value, articles.filter(a=>a.type===value));
    else if(kind==='search') searchPage(value);
    else notFound();
    $('#sidebar').classList.remove('open');
  }

  function search(){
    const q = searchInput.value.trim();
    if(q) location.hash = `search/${encodeURIComponent(q)}`;
    suggestions.classList.remove('show');
  }

  searchInput.addEventListener('input',()=>{
    const q = normalize(searchInput.value.trim());
    if(!q){suggestions.classList.remove('show'); return;}
    const matches = articles.filter(a=>searchable(a).includes(q)).slice(0,8);
    suggestions.innerHTML = matches.map(a=>`<a class="suggestion" href="#article/${a.id}"><strong>${a.title}</strong><small>${a.type} · ${a.region} · ${a.status}</small></a>`).join('');
    suggestions.classList.toggle('show',matches.length>0);
  });
  searchInput.addEventListener('keydown',e=>{ if(e.key==='Enter') search(); });
  $('#searchButton').addEventListener('click',search);
  $('#randomButton').addEventListener('click',()=>{
    const pool = articles.filter(a=>a.status==='CANON');
    location.hash = `article/${pool[Math.floor(Math.random()*pool.length)].id}`;
  });
  $('#menuButton').addEventListener('click',()=>$('#sidebar').classList.toggle('open'));
  document.addEventListener('click',e=>{
    if(!e.target.closest('.search-wrap')) suggestions.classList.remove('show');
  });
  window.addEventListener('hashchange',route);

  buildSidebar();
  route();
})();
