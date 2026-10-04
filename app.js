const OWNER_IDS = ['8713197897', '8886448593'];

const SUPABASE_URL = 'https://ackordxxqeccjlifzgop.supabase.co';
const SUPABASE_KEY = 'sb_publishable_s_ZV40KaRI6kpgiuZlVW-w_H-11lwE6';

let products = [];
let cart = [];

const app = document.querySelector('#app');
const tg = window.Telegram?.WebApp;
const user = tg?.initDataUnsafe?.user || null;

const isOwner = Boolean(
  user && OWNER_IDS.includes(String(user.id))
);

const money = value =>
  new Intl.NumberFormat('ru-RU').format(Number(value || 0)) + ' сум';

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json'
};

function hero(title) {
  return `
    <section class="hero">
      <div class="eyebrow">ZAFAYHA</div>
      <h1>${title}</h1>
    </section>
  `;
}

async function loadProducts() {
  app.innerHTML = `
    ${hero('Тихая элегантность.')}
    <section class="panel">
      <p>Загружаем коллекцию...</p>
    </section>
  `;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/products?active=eq.true&select=*&order=created_at.desc`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`Ошибка загрузки: ${response.status}`);
    }

    products = await response.json();
    shop();

  } catch (error) {
    console.error(error);

    app.innerHTML = `
      ${hero('ZAFAYHA')}
      <section class="panel">
        <h2>Не удалось загрузить товары</h2>
        <p>Попробуйте открыть магазин ещё раз.</p>
        <button onclick="loadProducts()">Повторить</button>
      </section>
    `;
  }
}

function shop() {
  const cards = products.length
    ? products.map(p => `
        <article class="card">

          ${p.image_url
            ? `<img src="${p.image_url}" alt="${p.name || 'ZAFAYHA'}">`
            : ''
          }

          <h3>${p.name || 'ZAFAYHA'}</h3>

          ${p.color
            ? `<p>${p.color}</p>`
            : ''
          }

          <p>${Number(p.stock || 0)} шт.</p>

          <strong>${money(p.price)}</strong>

          <button onclick="addToCart('${p.id}')">
            В корзину
          </button>

        </article>
      `).join('')
    : `
      <section class="panel">
        <p>Коллекция скоро появится.</p>
      </section>
    `;

  app.innerHTML =
    hero('Тихая элегантность.') +
    `<div class="grid">${cards}</div>` +
    (isOwner
      ? `<button class="adminlink" onclick="admin()">Админ ZAFAYHA</button>`
      : ''
    );
}

window.addToCart = function(id) {
  cart.push(id);
  cartView();
};

function cartView() {
  const rows = cart
    .map(id => products.find(p => String(p.id) === String(id)))
    .filter(Boolean);

  const total = rows.reduce(
    (sum, p) => sum + Number(p.price || 0),
    0
  );

  app.innerHTML =
    hero('Корзина') +
    `
    <section class="panel">

      ${
        rows.length
          ? rows.map((p, index) => `
              <p>
                ${p.name} — ${money(p.price)}
                <button onclick="removeFromCart(${index})">×</button>
              </p>
            `).join('')
          : '<p>Корзина пуста.</p>'
      }

      ${
        rows.length
          ? `<h3>Итого: ${money(total)}</h3>`
          : ''
      }

    </section>
    `;
}

window.removeFromCart = function(index) {
  cart.splice(index, 1);
  cartView();
};

function tryon() {
  app.innerHTML =
    hero('Примерьте образ.') +
    `
    <section class="panel">
      <h2>AI примерка</h2>
      <p>Скоро здесь можно будет примерить образ ZAFAYHA.</p>
    </section>
    `;
}

function gift() {
  app.innerHTML =
    hero('Передайте тепло.') +
    `
    <section class="panel">
      <h2>Подарок ZAFAYHA</h2>
      <p>Скоро здесь можно будет оформить подарок.</p>
    </section>
    `;
}

/* =========================
   ADMIN
========================= */

function admin() {
  if (!isOwner) {
    shop();
    return;
  }

  app.innerHTML =
    hero('Управление ZAFAYHA') +
    `
    <section class="panel">

      <h2>Добавить товар</h2>

      <input
        id="productName"
        placeholder="Название"
      >

      <input
        id="productColor"
        placeholder="Цвет"
      >

      <input
        id="productPrice"
        type="number"
        placeholder="Цена"
      >

      <input
        id="productStock"
        type="number"
        placeholder="Количество"
      >

      <input
        id="productImage"
        placeholder="Ссылка на фото"
      >

      <button onclick="createProduct()">
        Добавить товар
      </button>

    </section>

    <section class="panel">
      <h2>Товары</h2>

      ${
        products.length
          ? products.map(p => `
              <div class="admin-product">

                <strong>${p.name}</strong>

                <p>
                  ${p.color || ''}
                  · ${Number(p.stock || 0)} шт.
                  · ${money(p.price)}
                </p>

                <button onclick="editProduct('${p.id}')">
                  Изменить
                </button>

                <button onclick="deleteProduct('${p.id}')">
                  Удалить
                </button>

              </div>
            `).join('')
          : '<p>Товаров пока нет.</p>'
      }

      <button onclick="shop()">
        Вернуться в магазин
      </button>

    </section>
    `;
}

window.admin = admin;

window.createProduct = async function() {
  if (!isOwner) return;

  const name = document.querySelector('#productName').value.trim();
  const color = document.querySelector('#productColor').value.trim();
  const price = Number(document.querySelector('#productPrice').value);
  const stock = Number(document.querySelector('#productStock').value);
  const image_url = document.querySelector('#productImage').value.trim();

  if (!name) {
    alert('Введите название товара.');
    return;
  }

  if (!price || price < 0) {
    alert('Введите цену.');
    return;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/products`,
      {
        method: 'POST',
        headers: {
          ...headers,
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          name,
          color,
          price,
          stock,
          image_url: image_url || null,
          active: true
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    await refreshAdmin();

  } catch (error) {
    console.error(error);
    alert('Не удалось добавить товар.');
  }
};

window.editProduct = function(id) {
  if (!isOwner) return;

  const product = products.find(
    p => String(p.id) === String(id)
  );

  if (!product) return;

  app.innerHTML =
    hero('Изменить товар') +
    `
    <section class="panel">

      <input
        id="editName"
        value="${product.name || ''}"
        placeholder="Название"
      >

      <input
        id="editColor"
        value="${product.color || ''}"
        placeholder="Цвет"
      >

      <input
        id="editPrice"
        type="number"
        value="${Number(product.price || 0)}"
        placeholder="Цена"
      >

      <input
        id="editStock"
        type="number"
        value="${Number(product.stock || 0)}"
        placeholder="Количество"
      >

      <input
        id="editImage"
        value="${product.image_url || ''}"
        placeholder="Ссылка на фото"
      >

      <button onclick="saveProduct('${product.id}')">
        Сохранить изменения
      </button>

      <button onclick="admin()">
        Отмена
      </button>

    </section>
    `;
};

window.saveProduct = async function(id) {
  if (!isOwner) return;

  const name = document.querySelector('#editName').value.trim();
  const color = document.querySelector('#editColor').value.trim();
  const price = Number(document.querySelector('#editPrice').value);
  const stock = Number(document.querySelector('#editStock').value);
  const image_url = document.querySelector('#editImage').value.trim();

  if (!name) {
    alert('Введите название.');
    return;
  }

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          name,
          color,
          price,
          stock,
          image_url: image_url || null
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    await refreshAdmin();

  } catch (error) {
    console.error(error);
    alert('Не удалось изменить товар.');
  }
};

window.deleteProduct = async function(id) {
  if (!isOwner) return;

  const confirmed = confirm(
    'Удалить этот товар из ZAFAYHA?'
  );

  if (!confirmed) return;

  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText);
    }

    await refreshAdmin();

  } catch (error) {
    console.error(error);
    alert('Не удалось удалить товар.');
  }
};

async function refreshAdmin() {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`Ошибка: ${response.status}`);
    }

    products = await response.json();
    admin();

  } catch (error) {
    console.error(error);
    alert('Не удалось обновить список товаров.');
  }
}

window.loadProducts = loadProducts;
window.shop = shop;

/* =========================
   NAVIGATION
========================= */

document.querySelectorAll('nav button').forEach(button => {
  button.onclick = () => {
    const action = button.dataset.action;

    if (action === 'shop') shop();
    if (action === 'tryon') tryon();
    if (action === 'gift') gift();
    if (action === 'cart') cartView();
  };
});

if (tg) {
  tg.ready();
  tg.expand();
}

loadProducts();
