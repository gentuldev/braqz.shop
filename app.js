// Simple utilities
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

// State
let PRODUCTS = [];
let FILTERS = { category: null, sub: null, sizes: new Set(), colors: new Set(), min: null, max: null, sort: 'popular' };

// Init common
document.addEventListener('DOMContentLoaded', async () => {
  // Mobile menu
  const btn = $('#btnMenu');
  if (btn) btn.addEventListener('click', () => $('#mobileNav').classList.toggle('hidden'));

  // Year
  const y = $('#year');
  if (y) y.textContent = new Date().getFullYear();

  // Load products
  try {
    const res = await fetch('data/products.json');
    PRODUCTS = await res.json();
  } catch (e) { console.error('Failed to load products.json', e); }

  // Page routers
  if ($('#homeGrid')) renderHomeGrid();
  if ($('#plpGrid')) initPLP();
  if ($('#pdpRoot')) initPDP();
});

function renderCard(p) {
  return `
  <a href="product.html?id=${p.id}" class="block group border rounded-xl overflow-hidden bg-white">
    <div class="aspect-[4/3] bg-slate-100 overflow-hidden">
      <img src="${p.images[0]}" alt="${p.name}" class="w-full h-full object-cover group-hover:scale-105 transition"/>
    </div>
    <div class="p-3">
      <div class="text-sm text-slate-500">${p.category}</div>
      <div class="font-medium">${p.name}</div>
      <div class="mt-1 font-semibold">₦${p.price.toLocaleString()}</div>
    </div>
  </a>`;
}

function renderHomeGrid() {
  const grid = $('#homeGrid');
  const picks = PRODUCTS.slice(0, 8);
  grid.innerHTML = picks.map(renderCard).join('');
}

// ---------- PLP ----------
function initPLP() {
  // Read URL params
  const url = new URL(location.href);
  FILTERS.category = url.searchParams.get('category');
  FILTERS.sub = url.searchParams.get('sub');
  const title = $('#plpTitle');
  if (title) title.textContent = (FILTERS.category ? capitalize(FILTERS.category) : 'Shop');

  // Build filters
  buildFilter('Category', 'filterCategory', unique(PRODUCTS.map(p => p.category)), 'category');
  buildFilter('Size', 'filterSize', unique(PRODUCTS.flatMap(p => p.sizes)), 'sizes');
  buildFilter('Color', 'filterColor', unique(PRODUCTS.map(p => p.color)), 'colors');

  // Price & sort
  $('#btnPrice')?.addEventListener('click', () => {
    FILTERS.min = parseInt($('#minPrice').value || '0', 10) || null;
    FILTERS.max = parseInt($('#maxPrice').value || '0', 10) || null;
    renderPLP();
  });
  $('#sort')?.addEventListener('change', (e) => { FILTERS.sort = e.target.value; renderPLP(); });

  renderPLP();
}

function buildFilter(label, elId, values, key) {
  const box = $('#' + elId);
  box.innerHTML = values.map(v => `
    <label class="flex items-center gap-2">
      <input type="checkbox" value="${v}" class="rounded" ${precheck(key, v) ? 'checked' : ''}>
      <span>${capitalize(v)}</span>
    </label>`).join('');
  box.addEventListener('change', (e) => {
    const val = e.target.value;
    if (key === 'category') {
      FILTERS.category = e.target.checked ? val : null;
      // When category changes, reset others lightly
      FILTERS.sub = null;
    } else if (key === 'sizes') {
      e.target.checked ? FILTERS.sizes.add(val) : FILTERS.sizes.delete(val);
    } else if (key === 'colors') {
      e.target.checked ? FILTERS.colors.add(val) : FILTERS.colors.delete(val);
    }
    renderPLP();
  });
}

function precheck(key, v) {
  if (key === 'category' && FILTERS.category === v) return true;
  return false;
}

function renderPLP() {
  let rows = PRODUCTS.slice();
  // URL-subcategory filter (optional)
  if (FILTERS.sub) rows = rows.filter(p => (p.tags||[]).includes(FILTERS.sub));
  if (FILTERS.category) rows = rows.filter(p => p.category === FILTERS.category || (p.tags||[]).includes(FILTERS.category));
  if (FILTERS.sizes.size) rows = rows.filter(p => p.sizes.some(s => FILTERS.sizes.has(s)));
  if (FILTERS.colors.size) rows = rows.filter(p => FILTERS.colors.has(p.color));
  if (FILTERS.min != null) rows = rows.filter(p => p.price >= FILTERS.min);
  if (FILTERS.max != null) rows = rows.filter(p => p.price <= FILTERS.max);

  // Sort
  if (FILTERS.sort === 'price-asc') rows.sort((a,b)=>a.price-b.price);
  if (FILTERS.sort === 'price-desc') rows.sort((a,b)=>b.price-a.price);
  if (FILTERS.sort === 'new') rows.sort((a,b)=> new Date(b.added) - new Date(a.added));

  $('#count').textContent = `${rows.length} item${rows.length!==1?'s':''}`;
  $('#plpGrid').innerHTML = rows.map(renderCard).join('');
}

// ---------- PDP ----------
function initPDP() {
  const url = new URL(location.href);
  const id = url.searchParams.get('id');
  const p = PRODUCTS.find(x => String(x.id) === String(id));
  const root = $('#pdpRoot');
  if (!p) { root.innerHTML = `<p class="text-slate-500">Product not found.</p>`; return; }

  root.innerHTML = `
    <div class="grid md:grid-cols-2 gap-8">
      <div>
        <div class="aspect-[4/3] rounded-xl overflow-hidden bg-slate-100">
          <img id="mainImg" src="${p.images[0]}" class="w-full h-full object-cover" alt="${p.name}"/>
        </div>
        <div class="mt-3 flex gap-2">
          ${p.images.map((src,i)=>`<button class="border rounded-xl overflow-hidden aspect-square w-20" onclick="document.getElementById('mainImg').src='${src}'"><img src="${src}" class="w-full h-full object-cover"/></button>`).join('')}
        </div>
      </div>
      <div>
        <div class="text-sm text-slate-500">${p.category}</div>
        <h1 class="text-2xl font-semibold">${p.name}</h1>
        <div class="mt-2 text-xl font-bold">₦${p.price.toLocaleString()}</div>
        <p class="mt-4 text-slate-600">${p.description}</p>

        <div class="mt-6">
          <div class="font-medium mb-2">Color: <span class="font-normal">${capitalize(p.color)}</span></div>
          <div class="flex gap-2">${renderColorSwatch(p.color)}</div>
        </div>

        <div class="mt-6">
          <div class="font-medium mb-2">Size</div>
          <div id="sizeWrap" class="flex flex-wrap gap-2">
            ${p.sizes.map(s=>`<button class="size-btn border px-3 py-2 rounded" data-size="${s}">${s}</button>`).join('')}
          </div>
        </div>

        <div class="mt-6 flex items-center gap-3">
          <button id="btnAdd" class="bg-emerald-600 text-white px-5 py-3 rounded-full">Add to Cart</button>
          <span id="sizeHint" class="text-sm text-slate-500">Select a size</span>
        </div>
      </div>
    </div>

    <div class="mt-12">
      <h2 class="text-xl font-semibold mb-4">You might also like</h2>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">${suggest(p).map(renderCard).join('')}</div>
    </div>
  `;

  // Size select logic
  let selectedSize = null;
  $$('#sizeWrap .size-btn').forEach(btn => btn.addEventListener('click', () => {
    $$('#sizeWrap .size-btn').forEach(b => b.classList.remove('ring-2','ring-emerald-600'));
    btn.classList.add('ring-2','ring-emerald-600');
    selectedSize = btn.dataset.size;
    $('#sizeHint').textContent = `Selected: ${selectedSize}`;
  }));

  $('#btnAdd').addEventListener('click', () => {
    if (!selectedSize) { alert('Please select a size'); return; }
    const cart = JSON.parse(localStorage.getItem('braqz_cart')||'[]');
    cart.push({ id: p.id, size: selectedSize, qty: 1 });
    localStorage.setItem('braqz_cart', JSON.stringify(cart));
    const badge = $('#cartBadge');
    if (badge) badge.textContent = String(cart.length);
    alert('Added to cart!');
  });
}

function suggest(p){
  return PRODUCTS.filter(x => x.id!==p.id && (x.category===p.category || x.color===p.color)).slice(0,4);
}

function renderColorSwatch(color) {
  const map = { black:'#111827', white:'#f8fafc', red:'#ef4444', blue:'#3b82f6', green:'#10b981', yellow:'#eab308', purple:'#8b5cf6', pink:'#ec4899'};
  const hex = map[color] || '#cbd5e1';
  return `<span class="inline-block w-6 h-6 rounded-full ring-1 ring-slate-300" style="background:${hex}"></span>`;
}

function unique(arr){ return Array.from(new Set(arr.filter(Boolean))); }
function capitalize(s){ return (s||'').charAt(0).toUpperCase()+ (s||'').slice(1); }
