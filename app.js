const OWNER_IDS = ['8713197897', '8886448593'];

const SUPABASE_URL = 'https://ackordxxqeccjlifzgop.supabase.co';
const SUPABASE_KEY = 'sb_publishable_s_ZV40KaRI6kpgiuZlVW-w_H-11lwE6';

let products = [];
let cart = [];

const app = document.querySelector('#app');
const tg = window.Telegram?.WebApp;
const user = tg?.initDataUnsafe?.user;

const money = n =>
  new Intl.NumberFormat('ru-RU').format(Number(n)) + ' сум';

async function loadProducts() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/products?active=eq.true&select=*&order=created_at.desc`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Supabase: ${response.status}`);
    }

    products = await response.json();
    shop();
  } catch (error) {
    console.error(error);
    app.innerHTML = `
      <section class="panel">
        <h2>Не удалось загрузить товары</h2>
        <p>Проверьте подключение к базе данных.</p>
      </section>
    `;
  }
}

function hero(title) {
  return `
    <section class="hero">
      <div class="eyebrow">ZAFAYHA</div>
      <h1>${title}</h1>
    </section>
  `;
}

function shop() {
  app.innerHTML =
    hero('Тихая элегантность.') +
    `<div class="grid">
      ${products.map(p => `
        <article class="card">
          ${p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : ''}
          <h3>${p.name}</h3>
          <p>${p.color || ''}</p>
          <p>${p.stock} шт.</p>
          <strong>${money(p.price)}</strong>
          <button onclick="addToCart('${p.id}')">В корзину</button>
        </article>
      `).join('')}
    </div>${isOwner ? '<button class="adminlink" onclick="admin()">Админ ZAFAYHA</button>' : ''}`;
}

window.addToCart = id => {
  cart.push(id);
  cartView();
};

function cartView() {
  const rows = cart
    .map(id => products.find(p => p.id === id))
    .filter(Boolean);

  const total = rows.reduce((sum, p) => sum + Number(p.price), 0);

  app.innerHTML =
    hero('Корзина') +
    `<section class="panel">
      ${rows.length
        ? rows.map(p => `<p>${p.name} — ${money(p.price)}</p>`).join('')
        : '<p>Корзина пуста</p>'
      }
      ${rows.length ? `<h3>Итого: ${money(total)}</h3>` : ''}
    </section>`;
}

function tryon() {
  app.innerHTML =
    hero('Примерьте образ.') +
    `<section class="panel">
      <p>AI примерка</p>
    </section>`;
}

function gift() {
  app.innerHTML =
    hero('Передайте тепло.') +
    `<section class="panel">
      <p>Подарить платок</p>
    </section>`;
}

document.querySelectorAll('nav button').forEach(button => {
  button.onclick = () => {
    const action = button.dataset.action;

    if (action === 'shop') shop();
    if (action === 'tryon') tryon();
    if (action === 'gift') gift();
    if (action === 'cart') cartView();
  };
});

if (tg) tg.ready();

loadProducts();
