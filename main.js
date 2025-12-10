// main.js — Vanilla WebApp frontend
const API_BASE = ''; // relative -> will hit same origin /api
const CATEGORIES = ['All','Engine Oils','Gear Oils','Hydraulic Oils','Greases','Industrial Lubricants'];

const tg = window.Telegram ? window.Telegram.WebApp : null;
try { tg && tg.expand(); } catch(e){}

const state = {
  products: [],
  filtered: [],
  cart: JSON.parse(localStorage.getItem('lubex_cart')||'[]'),
  activeCategory: 'All'
};

// DOM refs
const productsEl = document.getElementById('products');
const filtersEl = document.getElementById('filters');
const cartCountEl = document.getElementById('cart-count');
const cartButton = document.getElementById('cart-button');
const productModal = document.getElementById('product-modal');
const cartDrawer = document.getElementById('cart-drawer');

function setCart(cart){
  state.cart = cart;
  localStorage.setItem('lubex_cart', JSON.stringify(cart));
  cartCountEl.innerText = cart.reduce((s,i)=>s+i.quantity,0);
}
setCart(state.cart);

async function fetchProducts(){
  try{
    const res = await fetch('/api/products');
    const json = await res.json();
    state.products = json;
    applyFilter();
  }catch(e){
    console.error('Failed to fetch products', e);
    productsEl.innerHTML = '<div class="card">Failed to load products.</div>';
  }
}

function applyFilter(){
  if(state.activeCategory === 'All'){
    state.filtered = state.products.slice();
  } else {
    state.filtered = state.products.filter(p => (p.category||'').toLowerCase().includes(state.activeCategory.toLowerCase()));
  }
  renderProducts();
}

function renderFilters(){
  filtersEl.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const b = document.createElement('button');
    b.className = 'filter-btn' + (state.activeCategory===cat ? ' active' : '');
    b.innerText = cat;
    b.onclick = () => { state.activeCategory = cat; applyFilter(); renderFilters(); };
    filtersEl.appendChild(b);
  });
}

function renderProducts(){
  productsEl.innerHTML = '';
  if(state.filtered.length === 0){
    productsEl.innerHTML = '<div class="card">No products in this category.</div>';
    return;
  }
  state.filtered.forEach(p => {
    const c = document.createElement('div'); c.className='card';
    const imgUrl = p.image_url ? p.image_url : '/webapp/placeholder.jpg';
    c.innerHTML = `
      <img src="${imgUrl}" alt="${escapeHtml(p.name)}" loading="lazy" />
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.description || '')}</p>
      <div class="meta">
        <div>${Number(p.price).toLocaleString()} Birr</div>
        <div><button class="btn" data-id="${p.id}">Add</button></div>
      </div>
    `;
    productsEl.appendChild(c);
  });

  // attach add handlers
  productsEl.querySelectorAll('button.btn').forEach(btn => {
    btn.addEventListener('click', e => {
      const id = e.currentTarget.getAttribute('data-id');
      addToCartById(id);
    });
  });

  // click on product to open modal
  productsEl.querySelectorAll('.card img, .card h3').forEach(el => {
    el.addEventListener('click', (ev) => {
      const card = ev.currentTarget.closest('.card');
      const idx = Array.from(productsEl.children).indexOf(card);
      openProductModal(state.filtered[idx]);
    });
  });
}

function openProductModal(p){
  productModal.classList.remove('hidden');
  productModal.innerHTML = `
    <div class="modal" id="modal-root">
      <div class="card" style="padding:12px;max-width:840px;display:flex;gap:12px;">
        <div style="flex:1"><img src="${p.image_url||'/webapp/placeholder.jpg'}" style="width:100%;height:320px;object-fit:cover;border-radius:8px"/></div>
        <div style="flex:1">
          <h2>${escapeHtml(p.name)}</h2>
          <p style="color:#666">${escapeHtml(p.description||'')}</p>
          <div style="font-weight:700;margin-top:8px">${Number(p.price).toLocaleString()} Birr</div>
          <div style="margin-top:12px">
            <label>Qty</label>
            <input id="qty-input" type="number" value="1" min="1" style="width:80px;margin-left:8px;padding:6px"/>
          </div>
          <div style="margin-top:12px">
            <button class="btn" id="add-modal-btn">Add to cart</button>
            <button class="btn ghost" id="close-modal-btn" style="margin-left:8px">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.getElementById('close-modal-btn').onclick = closeModal;
  document.getElementById('add-modal-btn').onclick = () => {
    const qty = Math.max(1, Number(document.getElementById('qty-input').value || 1));
    addToCartByProduct(p, qty);
    closeModal();
  };
  document.getElementById('modal-root').onclick = (e) => { if(e.target.id === 'modal-root') closeModal(); };
}

function closeModal(){ productModal.classList.add('hidden'); productModal.innerHTML = ''; }

function addToCartById(id){
  const p = state.products.find(x => x.id === id);
  if(!p) return alert('Product not found');
  addToCartByProduct(p,1);
}
function addToCartByProduct(p,qty){
  const copy = state.cart.slice();
  const found = copy.find(i => i.id === p.id);
  if(found) found.quantity += qty;
  else copy.push({ id: p.id, name: p.name, price: Number(p.price), image: p.image_url, quantity: qty });
  setCart(copy);
  showCart();
}

function showCart(){
  cartDrawer.classList.remove('hidden');
  renderCart();
}

function renderCart(){
  if(state.cart.length === 0){
    cartDrawer.innerHTML = '<div style="padding:12px">Cart empty</div>';
    return;
  }
  const html = [];
  state.cart.forEach((it, idx) => {
    html.push(`
      <div class="cart-item">
        <img src="${it.image||'/webapp/placeholder.jpg'}" alt="${escapeHtml(it.name)}"/>
        <div style="flex:1">
          <div style="font-weight:600">${escapeHtml(it.name)}</div>
          <div style="color:#666;font-size:13px">${it.quantity} × ${Number(it.price).toLocaleString()} Birr</div>
        </div>
        <div>
          <div style="display:flex;flex-direction:column;gap:6px">
            <button data-act="inc" data-i="${idx}" class="btn">+</button>
            <button data-act="dec" data-i="${idx}" class="btn">-</button>
          </div>
        </div>
      </div>
    `);
  });
  const total = state.cart.reduce((s,i)=>s+i.quantity*i.price,0);
  html.push(<div class="total"><div>Total</div><div>${Number(total).toLocaleString()} Birr</div></div>);
  html.push(<button class="btn checkout-btn" id="goto-checkout">Checkout</button>);
  cartDrawer.innerHTML = html.join('');
  cartDrawer.querySelectorAll('button[data-act]').forEach(b=>{
    b.onclick = (e) => {
      const act = b.getAttribute('data-act'), i = Number(b.getAttribute('data-i'));
      const copy = state.cart.slice();
      if(act==='inc') copy[i].quantity++;
      else {
        copy[i].quantity--;
        if(copy[i].quantity<=0) copy.splice(i,1);
      }
      setCart(copy);
      renderCart();
    };
  });
  document.getElementById('goto-checkout').onclick = () => { openCheckout(); };
}

function openCheckout(){
  // simple checkout SPA inside main area
  const app = document.querySelector('.container');
  app.innerHTML = `
    <div style="max-width:720px;margin:12px auto">
      <h2>Checkout</h2>
      <form id="checkout-form">
        <div><label>Full name</label><input name="name" required /></div>
        <div><label>Phone</label><input name="phone" required /></div>
        <div><label>Delivery address</label><input name="address" required /></div>
        <div><label>Notes (optional)</label><textarea name="notes"></textarea></div>
        <div><label>Payment screenshot (optional)</label><input type="file" name="photo" accept="image/*" /></div>
        <div style="margin-top:12px">Order summary: <strong id="co-total"></strong></div>
        <div><button class="btn" type="submit">Place order</button> <button class="btn ghost" id="cancel-checkout" type="button">Cancel</button></div>
      </form>
    </div>
  `;
  document.getElementById('co-total').innerText = state.cart.reduce((s,i)=>s+i.quantity*i.price,0) + ' Birr';
  document.getElementById('cancel-checkout').onclick = () => { location.reload(); };
  document.getElementById('checkout-form').onsubmit = async (ev) => {
    ev.preventDefault();
    const fd = new FormData(ev.target);
    fd.append('items', JSON.stringify(state.cart.map(i=>({product_id:i.id,quantity:i.quantity}))));
    try{
      const res = await fetch('/api/checkout', { method:'POST', body: fd });
      const j = await res.json();
      if(j.ok){
        alert('Order created: ' + j.orderId);
        setCart([]);
        // close webapp if in Telegram
        try{ tg && tg.close(); } catch(e){}
        location.reload();
      } else {
        alert('Error: ' + JSON.stringify(j));
      }
    }catch(e){
      console.error(e);
      alert('Failed to submit order');
    }
  };
}

function escapeHtml(str){ return String(str).replace(/[&<>"']/g, s=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[s]); }

// admin quick link (small) - shows at bottom if admin token exists on server? We'll provide seperate admin.html
function attachEvents(){
  cartButton.onclick = () => { showCart(); };
  document.addEventListener('click', (e) => {
    if(!cartDrawer.contains(e.target) && !cartButton.contains(e.target)){
      // click outside -> hide cart
      cartDrawer.classList.add('hidden');
    }
  });
}

async function init(){
  renderFilters();
  attachEvents();
  await fetchProducts();
  cartCountEl.innerText = state.cart.reduce((s,i)=>s+i.quantity,0);
}
init();