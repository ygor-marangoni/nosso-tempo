// ═══════════════════════════════════════
// TAG CONFIG
// ═══════════════════════════════════════
const TAG_MAP = {
  'Assistir série':    'tv',
  'Comer juntos':      'utensils',
  'Passear':           'map-pin',
  'Jogar':             'gamepad-2',
  'Chamego':           'heart',
  'Cinema':            'clapperboard',
  'Treinar':           'dumbbell',
  'Estudar':           'book-open',
  'Ouvir música':      'music',
  'Cozinhar':          'chef-hat',
  'Dormir juntos':     'moon',
  'Sair com amigos':   'users',
  'Peripécias':        'flame',
};

const DEFAULT_TAGS = [
  'Assistir série','Comer juntos','Passear','Jogar','Chamego','Cinema',
  'Treinar','Estudar','Ouvir música','Cozinhar','Dormir juntos',
  'Sair com amigos','Peripécias'
];

// ═══════════════════════════════════════
// DATA HELPERS
// ═══════════════════════════════════════
const LS = {
  get(k, fallback) { try { return JSON.parse(localStorage.getItem(k)) || fallback; } catch { return fallback; } },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
};

function entries()    { return LS.get('yj_entries', []); }
function saveEntries(d) { LS.set('yj_entries', d); }
function config()     { return LS.get('yj_config', { name1:'Ygor', name2:'Julianne' }); }
function saveConf(c)  { LS.set('yj_config', c); }
function customTags() {
  return LS.get('yj_tags', []).map(t => typeof t === 'string' ? { name: t, icon: 'sparkles' } : t);
}
function saveTags(t)  { LS.set('yj_tags', t); }
function allTags()    { return [...DEFAULT_TAGS, ...customTags().map(t => t.name)]; }
function tagIcon(t)   {
  if (TAG_MAP[t]) return TAG_MAP[t];
  const custom = customTags().find(c => c.name === t);
  return custom ? custom.icon : 'sparkles';
}

function formatTime(h) {
  const totalMin = Math.round(h * 60);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  return mins > 0 ? `${hrs}h ${mins}min` : `${hrs}h`;
}

// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  const idx = { home:0, register:1, history:2, reports:3, album:4, config:5 };
  document.querySelectorAll('.nav-item')[idx[page]].classList.add('active');
  localStorage.setItem('yj_page', page);

  ({ home: refreshHome, register: initRegister, history: () => renderHistory('all'), reports: renderReports, album: initAlbum, config: initConfig })[page]();

  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
  lucide.createIcons();
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}

function showToast(msg) {
  const t = document.getElementById('toast');
  t.innerHTML = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

// ═══════════════════════════════════════
// HOME
// ═══════════════════════════════════════
function refreshHome() {
  const data = entries();
  const totalH = data.reduce((s, e) => s + e.hours, 0);
  document.getElementById('stat-total-hours').textContent = formatTime(totalH);
  document.getElementById('stat-total-days').textContent = new Set(data.map(e => e.date)).size;

  const ac = {};
  data.forEach(e => (e.activities || []).forEach(a => { ac[a] = (ac[a]||0) + 1; }));
  const sorted = Object.entries(ac).sort((a,b) => b[1]-a[1]);
  document.getElementById('stat-top-activity').textContent = sorted.length ? sorted[0][0] : '---';

  const recent = [...data].sort((a,b) => b.date.localeCompare(a.date)).slice(0,5);
  const rl = document.getElementById('recent-list');

  if (!recent.length) {
    rl.innerHTML = `<div class="empty-state"><div class="empty-icon"><i data-lucide="pen-line" style="width:38px;height:38px"></i></div><h3>Nenhum registro ainda</h3><p>Comece registrando o tempo que vocês passam juntos</p></div>`;
    lucide.createIcons();
    return;
  }

  rl.innerHTML = recent.map(e => {
    const d = new Date(e.date + 'T12:00:00');
    return `<div class="recent-item"><div class="recent-dot"></div><div class="recent-info"><div class="date">${d.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</div><div class="activities">${(e.activities||[]).join(', ') || 'Sem atividades'}</div></div><div class="recent-hours">${formatTime(e.hours)}</div></div>`;
  }).join('');
}

// ═══════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════
let selected = [];

function initRegister() {
  selected = [];
  document.getElementById('reg-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('reg-hours').value = '';
  document.getElementById('reg-minutes').value = '';
  document.getElementById('reg-note').value = '';
  document.getElementById('custom-activity').value = '';
  renderTags();
}

function renderTags() {
  document.getElementById('preset-tags').innerHTML = allTags().map(t => {
    const ic = tagIcon(t);
    const sel = selected.includes(t) ? 'selected' : '';
    return `<span class="tag ${sel}" onclick="toggle(this,'${t.replace(/'/g,"\\'")}')" ><span class="tag-icon"><i data-lucide="${ic}" style="width:13px;height:13px"></i></span>${t}</span>`;
  }).join('');
  lucide.createIcons();
}

function toggle(el, tag) {
  if (selected.includes(tag)) { selected = selected.filter(t => t !== tag); el.classList.remove('selected'); }
  else { selected.push(tag); el.classList.add('selected'); }
}

function addCustomTag() {
  const v = document.getElementById('custom-activity').value.trim();
  if (!v) return;
  if (!selected.includes(v)) selected.push(v);
  document.getElementById('custom-activity').value = '';
  renderTags();
}

function saveEntry() {
  const date = document.getElementById('reg-date').value;
  const h = parseInt(document.getElementById('reg-hours').value) || 0;
  const m = parseInt(document.getElementById('reg-minutes').value) || 0;
  const hours = h + m / 60;
  const note = document.getElementById('reg-note').value.trim();
  if (!date || hours <= 0) { showToast('Preencha a data e o tempo'); return; }
  const data = entries();
  data.push({ id: Date.now(), date, hours, activities: [...selected], note });
  saveEntries(data);
  showToast('Momento salvo com sucesso');
  initRegister();
}

// ═══════════════════════════════════════
// HISTORY
// ═══════════════════════════════════════
let curFilter = 'all';

function filterHistory(f, el) {
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  curFilter = f;
  renderHistory(f);
}

function renderHistory(filter) {
  let data = entries();
  const now = new Date();
  if (filter === 'week') { const wa = new Date(now); wa.setDate(wa.getDate()-7); data = data.filter(e => new Date(e.date+'T12:00:00') >= wa); }
  else if (filter === 'month') { data = data.filter(e => { const d = new Date(e.date+'T12:00:00'); return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear(); }); }
  data.sort((a,b) => b.date.localeCompare(a.date));

  const hl = document.getElementById('history-list');
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];

  if (!data.length) {
    hl.innerHTML = `<div class="empty-state"><div class="empty-icon"><i data-lucide="book-open" style="width:38px;height:38px"></i></div><h3>Nenhum momento encontrado</h3><p>Registre momentos para vê-los aqui</p></div>`;
    lucide.createIcons();
    return;
  }

  hl.innerHTML = data.map(e => {
    const d = new Date(e.date+'T12:00:00');
    return `<div class="history-card">
      <div class="history-date-badge"><div class="day">${d.getDate()}</div><div class="month">${months[d.getMonth()]}</div></div>
      <div class="history-content">
        <div class="history-hours">${formatTime(e.hours)} <span>juntos</span></div>
        <div class="history-tags">${(e.activities||[]).map(a=>`<span class="history-tag">${a}</span>`).join('')}</div>
        ${e.note ? `<div class="history-note">"${e.note}"</div>` : ''}
      </div>
      <div class="history-actions">
        <button class="btn-edit" onclick="editEntry(${e.id})"><i data-lucide="pencil" style="width:14px;height:14px"></i></button>
        <button class="btn-delete" onclick="delEntry(${e.id})"><i data-lucide="trash-2" style="width:14px;height:14px"></i></button>
      </div>
    </div>`;
  }).join('');
  lucide.createIcons();
}

function delEntry(id) {
  showConfirm('Deseja remover este momento?', () => {
    saveEntries(entries().filter(e => e.id !== id));
    renderHistory(curFilter);
    showToast('Registro removido');
  });
}

// ═══════════════════════════════════════
// EDIT
// ═══════════════════════════════════════
let editingId = null;
let selectedEdit = [];

function editEntry(id) {
  const entry = entries().find(e => e.id === id);
  if (!entry) return;
  editingId = id;
  selectedEdit = [...(entry.activities || [])];
  const totalMin = Math.round(entry.hours * 60);
  document.getElementById('edit-date').value = entry.date;
  document.getElementById('edit-hours').value = Math.floor(totalMin / 60);
  document.getElementById('edit-minutes').value = totalMin % 60;
  document.getElementById('edit-note').value = entry.note || '';
  document.getElementById('edit-custom-activity').value = '';
  renderEditTags();
  document.getElementById('modal-overlay').classList.add('show');
  lucide.createIcons();
}

function renderEditTags() {
  document.getElementById('edit-preset-tags').innerHTML = allTags().map(t => {
    const ic = tagIcon(t);
    const sel = selectedEdit.includes(t) ? 'selected' : '';
    return `<span class="tag ${sel}" onclick="toggleEdit(this,'${t.replace(/'/g,"\\'")}')" ><span class="tag-icon"><i data-lucide="${ic}" style="width:13px;height:13px"></i></span>${t}</span>`;
  }).join('');
  lucide.createIcons();
}

function toggleEdit(el, tag) {
  if (selectedEdit.includes(tag)) { selectedEdit = selectedEdit.filter(t => t !== tag); el.classList.remove('selected'); }
  else { selectedEdit.push(tag); el.classList.add('selected'); }
}

function addEditCustomTag() {
  const v = document.getElementById('edit-custom-activity').value.trim();
  if (!v) return;
  if (!selectedEdit.includes(v)) selectedEdit.push(v);
  document.getElementById('edit-custom-activity').value = '';
  renderEditTags();
}

function saveEdit() {
  const date = document.getElementById('edit-date').value;
  const h = parseInt(document.getElementById('edit-hours').value) || 0;
  const m = parseInt(document.getElementById('edit-minutes').value) || 0;
  const hours = h + m / 60;
  const note = document.getElementById('edit-note').value.trim();
  if (!date || hours <= 0) { showToast('Preencha a data e o tempo'); return; }
  const data = entries().map(e => e.id === editingId ? { ...e, date, hours, activities: [...selectedEdit], note } : e);
  saveEntries(data);
  closeModal();
  renderHistory(curFilter);
  showToast('Momento atualizado');
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('show');
  editingId = null;
  selectedEdit = [];
}

// ═══════════════════════════════════════
// CONFIRM MODAL
// ═══════════════════════════════════════
let pendingConfirmCallback = null;

function showConfirm(message, callback) {
  pendingConfirmCallback = callback;
  document.getElementById('confirm-message').textContent = message;
  document.getElementById('confirm-overlay').classList.add('show');
  lucide.createIcons();
}

function doConfirm() {
  document.getElementById('confirm-overlay').classList.remove('show');
  if (pendingConfirmCallback) { pendingConfirmCallback(); pendingConfirmCallback = null; }
}

function cancelConfirm() {
  document.getElementById('confirm-overlay').classList.remove('show');
  pendingConfirmCallback = null;
}

// ═══════════════════════════════════════
// REPORTS
// ═══════════════════════════════════════
let ch1, ch2, ch3;

function destroyCharts() { [ch1,ch2,ch3].forEach(c => { if(c) c.destroy(); }); ch1=ch2=ch3=null; }

function renderReports() {
  const data = entries();
  const els = { t: 'rpt-total-h', a: 'rpt-avg-h', b: 'rpt-best-day', s: 'rpt-streak' };

  if (!data.length) {
    document.getElementById(els.t).textContent = '0h';
    document.getElementById(els.a).textContent = '0h';
    document.getElementById(els.b).textContent = '---';
    document.getElementById(els.s).textContent = '0';
    destroyCharts(); return;
  }

  const totalH = data.reduce((s,e)=>s+e.hours,0);
  const dow = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab'];
  const best = data.reduce((m,e)=>e.hours>m.hours?e:m);

  const last7Date = new Date(); last7Date.setDate(last7Date.getDate() - 7);
  const last7H = data.filter(e => new Date(e.date + 'T12:00:00') >= last7Date).reduce((s, e) => s + e.hours, 0);

  document.getElementById(els.t).textContent = formatTime(totalH);
  document.getElementById(els.a).textContent = formatTime(last7H / 7);
  document.getElementById(els.b).textContent = dow[new Date(best.date+'T12:00:00').getDay()];

  // Streak
  const dates = [...new Set(data.map(e=>e.date))].sort().reverse();
  let streak = 0, chk = new Date(new Date().toISOString().split('T')[0]+'T12:00:00');
  for (const dt of dates) {
    if (dt === chk.toISOString().split('T')[0]) { streak++; chk.setDate(chk.getDate()-1); }
    else if (dt < chk.toISOString().split('T')[0]) break;
  }
  document.getElementById(els.s).textContent = streak;

  destroyCharts();
  const pk = a => `rgba(239,80,135,${a})`;
  const font = { family: 'Figtree' };

  // Daily line
  const last30 = [];
  for (let i=29;i>=0;i--) { const d=new Date();d.setDate(d.getDate()-i); const k=d.toISOString().split('T')[0]; last30.push({l:d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),h:data.filter(e=>e.date===k).reduce((s,e)=>s+e.hours,0)}); }

  ch1 = new Chart(document.getElementById('chart-daily'), {
    type:'line',
    data:{labels:last30.map(d=>d.l),datasets:[{data:last30.map(d=>d.h),borderColor:'#ef5087',backgroundColor:pk(0.06),borderWidth:2.5,fill:true,tension:0.4,pointBackgroundColor:'#ef5087',pointBorderColor:'#fff',pointBorderWidth:2,pointRadius:3,pointHoverRadius:6}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#3d2233',titleFont:font,bodyFont:font,padding:12,cornerRadius:10,callbacks:{label:c=>formatTime(c.parsed.y)+' juntos'}}},scales:{y:{beginAtZero:true,grid:{color:'rgba(242,218,226,0.4)'},ticks:{font:{...font,size:11},color:'#ad8999'}},x:{grid:{display:false},ticks:{font:{...font,size:10},color:'#ad8999',maxRotation:45}}}}
  });

  // Activities doughnut
  const ac={};
  data.forEach(e=>(e.activities||[]).forEach(a=>{ac[a]=(ac[a]||0)+1}));
  const top = Object.entries(ac).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const colors = ['#ef5087','#ff7a9c','#ffa0b8','#d63a6e','#ffc2d1','#a82d57'];

  ch2 = new Chart(document.getElementById('chart-activities'), {
    type:'doughnut',
    data:{labels:top.map(a=>a[0]),datasets:[{data:top.map(a=>a[1]),backgroundColor:colors,borderWidth:3,borderColor:'#fff',hoverOffset:6}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'bottom',labels:{font:{...font,size:11},color:'#7a5468',padding:10,usePointStyle:true,pointStyleWidth:10}},tooltip:{backgroundColor:'#3d2233',titleFont:font,bodyFont:font,padding:12,cornerRadius:10}}}
  });

  // Weekday bars - ultimos 7 dias
  const last7bars = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const k = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('pt-BR', {weekday: 'short'}).replace('.','');
    last7bars.push({ l: label, h: data.filter(e => e.date === k).reduce((s, e) => s + e.hours, 0) });
  }

  ch3 = new Chart(document.getElementById('chart-weekday'), {
    type:'bar',
    data:{labels:last7bars.map(d=>d.l),datasets:[{data:last7bars.map(d=>d.h),backgroundColor:pk(0.55),borderRadius:8,borderSkipped:false}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{backgroundColor:'#3d2233',titleFont:font,bodyFont:font,padding:12,cornerRadius:10,callbacks:{label:c=>formatTime(c.parsed.y)+' juntos'}}},scales:{y:{beginAtZero:true,grid:{color:'rgba(242,218,226,0.4)'},ticks:{font:{...font,size:11},color:'#ad8999'}},x:{grid:{display:false},ticks:{font:{...font,size:12,weight:500},color:'#7a5468'}}}}
  });
}

// ═══════════════════════════════════════
// ÁLBUM
// ═══════════════════════════════════════
let albumFilter = 'all';
let pendingPhotoSrc = null;

function albumEntries() { return LS.get('yj_album', []); }
function saveAlbum(d)   { LS.set('yj_album', d); }

function initAlbum() {
  closeAlbumForm();
  albumFilter = 'all';
  document.querySelectorAll('#page-album .filter-chip').forEach((c, i) => c.classList.toggle('active', i === 0));
  renderAlbum('all');
}

function openAlbumForm() {
  document.getElementById('album-form-card').style.display = 'block';
  document.getElementById('btn-add-photo').style.display = 'none';
  document.getElementById('album-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('album-caption').value = '';
  document.getElementById('album-desc').value = '';
  removePreview(null);
  lucide.createIcons();
}

function closeAlbumForm() {
  document.getElementById('album-form-card').style.display = 'none';
  document.getElementById('btn-add-photo').style.display = '';
  pendingPhotoSrc = null;
}

function handleUploadClick() {
  document.getElementById('photo-input').click();
}

function handlePhotoSelect(input) {
  const file = input.files[0];
  if (!file) return;
  resizeImage(file, 800, src => {
    pendingPhotoSrc = src;
    document.getElementById('preview-img').src = src;
    document.getElementById('upload-placeholder').style.display = 'none';
    document.getElementById('upload-preview').style.display = 'block';
  });
}

function removePreview(e) {
  if (e) e.stopPropagation();
  pendingPhotoSrc = null;
  document.getElementById('preview-img').src = '';
  document.getElementById('upload-placeholder').style.display = '';
  document.getElementById('upload-preview').style.display = 'none';
  document.getElementById('photo-input').value = '';
}

function resizeImage(file, maxWidth, callback) {
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      callback(canvas.toDataURL('image/jpeg', 0.78));
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function savePhoto() {
  if (!pendingPhotoSrc) { showToast('Selecione uma foto'); return; }
  const date    = document.getElementById('album-date').value;
  const caption = document.getElementById('album-caption').value.trim();
  const desc    = document.getElementById('album-desc').value.trim();
  if (!date) { showToast('Informe a data da foto'); return; }
  const data = albumEntries();
  data.push({ id: Date.now(), date, caption, desc, src: pendingPhotoSrc });
  saveAlbum(data);
  closeAlbumForm();
  renderAlbum(albumFilter);
  showToast('Foto salva no álbum');
}

function filterAlbum(f, el) {
  document.querySelectorAll('#page-album .filter-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  albumFilter = f;
  renderAlbum(f);
}

function renderAlbum(filter) {
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  let data = albumEntries();
  const now = new Date();

  if (filter === 'month') {
    data = data.filter(e => {
      const d = new Date(e.date + 'T12:00:00');
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  } else if (filter === 'year') {
    data = data.filter(e => new Date(e.date + 'T12:00:00').getFullYear() === now.getFullYear());
  }
  data.sort((a, b) => b.date.localeCompare(a.date));

  const count = document.getElementById('album-count');
  count.textContent = data.length === 1 ? '1 memória guardada' : `${data.length} memórias guardadas`;

  const grid = document.getElementById('album-grid');
  if (!data.length) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon"><i data-lucide="camera" style="width:38px;height:38px"></i></div><h3>Nenhuma foto ainda</h3><p>Adicione fotos dos momentos especiais de vocês</p></div>`;
    lucide.createIcons();
    return;
  }

  grid.innerHTML = data.map(e => {
    const d = new Date(e.date + 'T12:00:00');
    const dateStr = `${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`;
    return `<div class="photo-card">
      <img class="photo-card-img" src="${e.src}" alt="${e.caption || ''}" onclick="openLightbox(${e.id})">
      <button class="photo-delete-btn" onclick="deletePhoto(${e.id})"><i data-lucide="trash-2" style="width:13px;height:13px"></i></button>
      <div class="photo-card-body">
        ${e.caption ? `<div class="photo-card-caption">${e.caption}</div>` : ''}
        <div class="photo-card-date">${dateStr}</div>
        ${e.desc ? `<div class="photo-card-desc">"${e.desc}"</div>` : ''}
      </div>
    </div>`;
  }).join('');
  lucide.createIcons();
}

function deletePhoto(id) {
  showConfirm('Deseja remover esta foto do álbum?', () => {
    saveAlbum(albumEntries().filter(e => e.id !== id));
    renderAlbum(albumFilter);
    showToast('Foto removida');
  });
}

function openLightbox(id) {
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
  const entry = albumEntries().find(e => e.id === id);
  if (!entry) return;
  const d = new Date(entry.date + 'T12:00:00');
  document.getElementById('lightbox-img').src = entry.src;
  document.getElementById('lightbox-caption').textContent = entry.caption || '';
  document.getElementById('lightbox-date').textContent = `${d.getDate()} de ${months[d.getMonth()]}, ${d.getFullYear()}`;
  document.getElementById('lightbox-overlay').classList.add('show');
}

function closeLightbox() {
  document.getElementById('lightbox-overlay').classList.remove('show');
  document.getElementById('lightbox-img').src = '';
}

// ═══════════════════════════════════════
// ICON PICKER
// ═══════════════════════════════════════
const ICON_OPTIONS = [
  // Sentimentos & pessoas
  'heart','star','smile','laugh','baby','users','user','crown','gem',
  // Natureza & clima
  'sun','moon','cloud','snowflake','flame','leaf','flower-2','tree-pine','waves','mountain','sunset','rainbow','zap','umbrella',
  // Comida & bebida
  'coffee','pizza','cake','wine','utensils','cooking-pot','ice-cream','candy','popcorn','salad','beer',
  // Entretenimento
  'music','film','tv','gamepad-2','headphones','mic','camera','ticket','party-popper','clapperboard',
  // Atividades & esporte
  'dumbbell','bike','footprints','volleyball','compass','trophy','tent','map-pin','map','navigation',
  // Transporte
  'car','plane','train','ship','bus',
  // Casa & objetos
  'home','bed','sofa','gift','shopping-bag','shopping-cart','shirt',
  // Tecnologia & comunicação
  'phone','message-circle','mail','video','book-open',
  // Misc
  'sparkles','palette','paintbrush','feather','anchor','flag','rocket','alarm-clock','dog','cat',
];

let selectedNewIcon = 'sparkles';

function openIconPicker(e) {
  e.stopPropagation();
  const popup = document.getElementById('icon-picker-popup');
  const btn = document.getElementById('cfg-icon-btn');
  const isOpen = popup.classList.contains('show');
  popup.classList.toggle('show');
  btn.classList.toggle('active', !isOpen);
  if (!isOpen) {
    popup.innerHTML = `<div class="icon-picker-title">Escolha um ícone</div><div class="icon-grid">${
      ICON_OPTIONS.map(ic => `<div class="icon-option${ic === selectedNewIcon ? ' selected' : ''}" onclick="selectNewIcon('${ic}')"><i data-lucide="${ic}" style="width:18px;height:18px"></i></div>`).join('')
    }</div>`;
    lucide.createIcons();
  }
}

function selectNewIcon(icon) {
  selectedNewIcon = icon;
  document.getElementById('icon-picker-popup').classList.remove('show');
  document.getElementById('cfg-icon-btn').classList.remove('active');
  document.getElementById('cfg-icon-btn').innerHTML = `<i data-lucide="${icon}" style="width:16px;height:16px"></i>`;
  lucide.createIcons();
}

document.addEventListener('click', e => {
  if (!e.target.closest('#cfg-icon-btn') && !e.target.closest('#icon-picker-popup')) {
    document.getElementById('icon-picker-popup')?.classList.remove('show');
    document.getElementById('cfg-icon-btn')?.classList.remove('active');
  }
});

// ═══════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════
function initConfig() {
  const c = config();
  document.getElementById('cfg-name1').value = c.name1 || 'Ygor';
  document.getElementById('cfg-name2').value = c.name2 || 'Julianne';
  renderGlobalTags();
}

function saveConfig() {
  saveConf({ name1: document.getElementById('cfg-name1').value.trim(), name2: document.getElementById('cfg-name2').value.trim() });
  showToast('Nomes salvos');
}

function renderGlobalTags() {
  document.getElementById('global-tags-list').innerHTML = customTags().map((t, i) =>
    `<span class="removable-tag"><i data-lucide="${t.icon}" style="width:12px;height:12px"></i> ${t.name} <button onclick="removeTag(${i})"><i data-lucide="x" style="width:11px;height:11px"></i></button></span>`
  ).join('');
  lucide.createIcons();
}

function addGlobalTag() {
  const v = document.getElementById('cfg-new-tag').value.trim();
  if (!v) return;
  const t = customTags(); t.push({ name: v, icon: selectedNewIcon }); saveTags(t);
  document.getElementById('cfg-new-tag').value = '';
  selectedNewIcon = 'sparkles';
  document.getElementById('cfg-icon-btn').innerHTML = `<i data-lucide="sparkles" style="width:16px;height:16px"></i>`;
  lucide.createIcons();
  renderGlobalTags();
  showToast('Atividade adicionada');
}

function removeTag(i) {
  const t = customTags(); t.splice(i,1); saveTags(t);
  renderGlobalTags();
}

function clearAllData() {
  if (!confirm('Tem certeza que deseja apagar TODOS os dados?')) return;
  ['yj_entries','yj_config','yj_tags','yj_album'].forEach(k => localStorage.removeItem(k));
  showToast('Dados removidos');
  navigateTo('home');
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  const lastPage = localStorage.getItem('yj_page') || 'home';
  navigateTo(lastPage);

  // Drag & drop no upload de fotos
  const uploadArea = document.getElementById('upload-area');
  uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
  uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
  uploadArea.addEventListener('drop', e => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && ['image/jpeg','image/png','image/webp'].includes(file.type)) {
      resizeImage(file, 800, src => {
        pendingPhotoSrc = src;
        document.getElementById('preview-img').src = src;
        document.getElementById('upload-placeholder').style.display = 'none';
        document.getElementById('upload-preview').style.display = 'block';
      });
    }
  });

  // Fechar modais com Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeLightbox(); cancelConfirm(); }
  });
});
