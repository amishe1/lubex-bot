// admin.js — simple admin panel that uses ADMIN_TOKEN to call protected endpoints
let ADMIN_TOKEN = null;
const adminLoginEl = document.getElementById('admin-login');
const adminPanelEl = document.getElementById('admin-panel');
const productsEl = document.getElementById('admin-products');
const ordersEl = document.getElementById('admin-orders');

document.getElementById('login-btn').onclick = () => {
  ADMIN_TOKEN = document.getElementById('admin-token').value.trim();
  if(!ADMIN_TOKEN) return alert('Enter token');
  adminLoginEl.classList.add('hidden');
  adminPanelEl.classList.remove('hidden');
  fetchAll();
};

document.getElementById('refresh').onclick = fetchAll;
document.getElementById('add-prod').onclick = () => {
  openAddProduct();
};

async function fetchAll(){
  await fetchProducts();
  await fetchOrders();
}

async function fetchProducts(){
  const r = await fetch('/api/products');
  const list = await r.json();
  renderProducts(list);
}
function renderProducts(list){
  productsEl.innerHTML = '';
  list.forEach(p => {
    const div = document.createElement('div'); div.className='card';
    div.innerHTML = `
      <div style="display:flex;gap:12px;align-items:center">
        <img src="${p.image_url||'/webapp/placeholder.jpg'}" style="width:80px;height:60px;object-fit:cover"/>
        <div style="flex:1">
          <div style="font-weight:700">${p.name}</div>
          <div style="color:#666">${p.category} — ${Number(p.price).toLocaleString()} Birr</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button data-id="${p.id}" class="btn edit">Edit</button>
          <button data-id="${p.id}" class="btn ghost del">Delete</button>
        </div>
      </div>
    `;
    productsEl.appendChild(div);
  });
  productsEl.querySelectorAll('button.del').forEach(b=>{
    b.onclick = async (e) => {
      const id = b.getAttribute('data-id');
      if(!confirm('Delete this product?')) return;
      // call admin delete (we didn't create endpoint in backend; we'll use admin/products PATCH or add route later)
      try {
        const resp = await fetch('/api/admin/products', { method:'DELETE', headers:{ 'x-admin-token': ADMIN_TOKEN, 'content-type':'application/json'}, body: JSON.stringify({ id })});
        const j = await resp.json();
        if(j.ok) fetchProducts();
        else alert('Failed: '+JSON.stringify(j));
      } catch(e){ alert('Failed'); }
    };
  });
  productsEl.querySelectorAll('button.edit').forEach(b=>{
    b.onclick = (e) => {
      const id = b.getAttribute('data-id');
      openEditProduct(id);
    };
  });
}

function openAddProduct(){
  const html = `
    <div class="card">
      <h3>Add product</h3>
      <form id="add-form">
        <div><input name="name" placeholder="Name" required/></div>
        <div><input name="category" placeholder="Category"/></div>
        <div><input name="price" placeholder="Price" required/></div>
        <div><input name="stock" placeholder="Stock" value="0"/></div>
        <div><textarea name="description" placeholder="Description"></textarea></div>
        <div><input type="file" name="image"/></div>
        <div style="margin-top:8px"><button class="btn">Create</button> <button id="cancel-add" class="btn ghost" type="button">Cancel</button></div>
      </form>
    </div>
  `;
  productsEl.insertAdjacentHTML('afterbegin', html);
  document.getElementById('cancel-add').onclick = () => fetchProducts();
  document.getElementById('add-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    const body = {
      name: fd.get('name'),
      category: fd.get('category'),
      price: Number(fd.get('price')||0),
      stock: Number(fd.get('stock')||0),
      description: fd.get('description')||'',
      image_url: '' // we don't have direct image upload endpoint; admin should use API to upload or provide URL
    };
    const res = await fetch('/api/admin/products', { method:'POST', headers:{ 'x-admin-token': ADMIN_TOKEN, 'content-type':'application/json' }, body: JSON.stringify(body) });
    const j = await res.json();
    if(j.ok) fetchProducts();
    else alert('Failed: '+JSON.stringify(j));
  };
}

function openEditProduct(id){
  // fetch product
  fetch('/api/products/'+id).then(r=>r.json()).then(p=>{
    const html = `
      <div class="card">
        <h3>Edit product</h3>
        <form id="edit-form">
          <div><input name="name" value="${escapeHtml(p.name)}" required/></div>
          <div><input name="category" value="${escapeHtml(p.category||'')}"/></div>
          <div><input name="price" value="${p.price}" required/></div>
          <div><input name="stock" value="${p.stock||0}"/></div>
          <div><textarea name="description">${escapeHtml(p.description||'')}</textarea></div>
          <div><input type="text" name="image_url" placeholder="Image URL" value="${escapeHtml(p.image_url||'')}" /></div>
          <div style="margin-top:8px"><button class="btn">Save</button> <button id="cancel-edit" class="btn ghost" type="button">Cancel</button></div>
        </form>
      </div>
    `;
    productsEl.insertAdjacentHTML('afterbegin', html);
    document.getElementById('cancel-edit').onclick = () => fetchProducts();
    document.getElementById('edit-form').onsubmit = async (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      const body = {
        id: p.id,
        name: fd.get('name'),
        category: fd.get('category'),
        price: Number(fd.get('price')||0),
        stock: Number(fd.get('stock')||0),
        description: fd.get('description')||'',
        image_url: fd.get('image_url')||''
      };
      const res = await fetch('/api/admin/products', { method:'PUT', headers:{ 'x-admin-token': ADMIN_TOKEN, 'content-type':'application/json' }, body: JSON.stringify(body) });
      const j = await res.json();
      if(j.ok) fetchProducts();
      else alert('Failed: '+JSON.stringify(j));
    };
  }).catch(e=>alert('Failed to load product'));
}

async function fetchOrders(){
  // This admin endpoint not implemented earlier — we rely on /api/orders or create route; fallback: show "use bot listorders"
  ordersEl.innerHTML = '<div class="card">Orders list will appear here (server must expose admin orders API). Use /listorders in bot for now.</div>';
}

function escapeHtml(str){return String(str||'').replace(/[&<>"']/g,(s)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s]));}