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

const money = value => {
  return new Intl.NumberFormat('ru-RU').format(Number(value || 0)) + ' сум';
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
    const url =
      `${SUPABASE_URL}/rest/v1/products` +
      `?select=*` +
      `&active=eq.true` +
      `&order=created_at.desc`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        Accept: 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Supabase error:', response.status, errorText);

      throw new Error(`Ошибка Supabase ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error('Supabase вернул неправильный формат данных');
    }

    products = data;
    shop();

  } catch (error) {
    console.error('ZAFAYHA loadProducts:', error);

    app.innerHTML = `
      ${hero('Тихая элегантность.')}
      <section class="panel">
        <h2>Не удалось загрузить товары</h2>
        <p>${error.message}</p>
        <button onclick="loadProducts()">Попробовать снова</button>
      </section>
    `;
  }
}

function shop() {
  const cards = products.length
    ? products.map(product => `
        <article class="card">

          ${
            product.image_url
              ? `<img
                   src="${product.image_url}"
                   alt="${product.name || 'ZAFAYHA'}"
                   loading="lazy"
                 >`
              : ''
          }

          <h3>${product.name || 'ZAFAYHA'}</h3>

          ${
            product.color
              ? `<p>${product.color}</p>`
              : ''
          }

          <p>${Number(product.stock || 0)} шт.</p>

          <strong>${money(product.price)}</strong>

          <button
            onclick="addToCart('${product.id}')"
            ${Number(product.stock || 0) <= 0 ? 'disabled' : ''}
          >
            ${
              Number(product.stock || 0) > 0
                ? 'В корзину'
                : 'Нет в наличии'
            }
          </button>

        </article>
      `).join('')
    : `
        <section class="panel">
          <p>Сейчас в коллекции нет товаров.</p>
        </section>
      `;

  app.innerHTML = `
    ${hero('Тихая элегантность.')}

    <div class="grid">
      ${cards}
    </div>

    ${
      isOwner
        ? `<button class="adminlink" onclick="admin()">
             Админ ZAFAYHA
           </button>`
        : ''
    }
  `;
}

window.addToCart = function (id) {
  const product = products.find(product => String(product.id) === String(id));

  if (!product) return;

  if (Number(product.stock || 0) <= 0) {
    if (tg?.showAlert) {
      tg.showAlert('Товар закончился');
    }
    return;
  }

  cart.push(String(id));

  updateCartCounter();
};

function updateCartCounter() {
  const cartButton = document.querySelector(
    'nav button[data-action="cart"]'
  );

  if (!cartButton) return;

  cartButton.textContent = `Корзина ${cart.length}`;
}

function cartView() {
  const rows = cart
    .map(id =>
      products.find(product => String(product.id) === String(id))
    )
    .filter(Boolean);

  const total = rows.reduce(
    (sum, product) => sum + Number(product.price || 0),
    0
  );

  app.innerHTML = `
    ${hero('Корзина')}

    <section class="panel">

      ${
        rows.length
          ? rows.map((product, index) => `
              <p>
                ${product.name} — ${money(product.price)}
                <button onclick="removeFromCart(${index})">
                  Удалить
                </button>
              </p>
            `).join('')
          : '<p>Корзина пуста</p>'
      }

      ${
        rows.length
          ? `<h3>Итого: ${money(total)}</h3>`
          : ''
      }

    </section>
  `;
}

window.removeFromCart = function (index) {
  cart.splice(index, 1);
  updateCartCounter();
  cartView();
};

function tryon() {
  app.innerHTML = `
    ${hero('Примерьте образ.')}

    <section class="panel">
      <h2>AI-примерка</h2>
      <p>Скоро здесь можно будет примерить образ.</p>
    </section>
  `;
}

function gift() {
  app.innerHTML = `
    ${hero('Передайте тепло.')}

    <section class="panel">
      <h2>Подарок ZAFAYHA</h2>
      <p>Выберите платок и подарите его близкому человеку.</p>
    </section>
  `;
}

window.admin = function () {
  if (!isOwner) {
    app.innerHTML = `
      ${hero('ZAFAYHA')}
      <section class="panel">
        <h2>Нет доступа</h2>
      </section>
    `;
    return;
  }

  app.innerHTML = `
    ${hero('Управление ZAFAYHA')}

    <section class="panel">
      <h2>Админ-панель</h2>
      <p>Доступ подтверждён.</p>
      <p>Следующим шагом добавим сюда управление товарами.</p>

      <button onclick="shop()">
        Вернуться в магазин
      </button>
    </section>
  `;
};

document.querySelectorAll('nav button').forEach(button => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;

    if (action === 'shop') shop();
    if (action === 'tryon') tryon();
    if (action === 'gift') gift();
    if (action === 'cart') cartView();
  });
});

if (tg) {
  tg.ready();
  tg.expand();
}

window.loadProducts = loadProducts;
window.shop = shop;

loadProducts();
