const OWNER_IDS = ['8713197897', '8886448593'];

const SUPABASE_URL = 'https://ackordxxqeccjlifzgop.supabase.co';
const SUPABASE_KEY = 'sb_publishable_s_ZV40KaRI6kpgiuZlVW-w_H-11lwE6';

let products = [];
let cart = JSON.parse(localStorage.getItem('zafayha_cart') || '[]');

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

/* =========================
   HELPERS
========================= */

function hero(title, subtitle = '') {
  return `
    <section class="hero">
      <div class="eyebrow">ZAFAYHA</div>
      <h1>${title}</h1>
      ${subtitle ? `<p class="hero-subtitle">${subtitle}</p>` : ''}
    </section>
  `;
}

function saveCart() {
  localStorage.setItem('zafayha_cart', JSON.stringify(cart));
  updateCartBadge();
}

function cartCount() {
  return cart.reduce(
    (sum, item) => sum + Number(item.quantity || 0),
    0
  );
}

function updateCartBadge() {
  document.querySelectorAll('nav button').forEach(button => {
    if (button.dataset.action === 'cart') {
      button.textContent = `Корзина ${cartCount()}`;
    }
  });
}

function getProduct(id) {
  return products.find(
    p => String(p.id) === String(id)
  );
}

function showNotice(message) {
  if (tg?.showAlert) {
    tg.showAlert(message);
  } else {
    alert(message);
  }
}

/* Активная кнопка нижнего меню */

function setActiveNav(action) {
  document.querySelectorAll('nav button').forEach(button => {
    button.classList.toggle(
      'active',
      button.dataset.action === action
    );
  });
}

/* =========================
   PRODUCTS
========================= */

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

    cart = cart.filter(item =>
      products.some(p => String(p.id) === String(item.id))
    );

    saveCart();
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

/* =========================
   SHOP
========================= */

function shop() {
  setActiveNav('shop');

  const cards = products.length
    ? products.map(p => `
        <article class="card">

          ${
            p.image_url
              ? `
                <div class="product-image">
                  <img
                    src="${p.image_url}"
                    alt="${p.name || 'ZAFAYHA'}"
                  >
                </div>
              `
              : ''
          }

          <div class="card-content">

            <h3>${p.name || 'ZAFAYHA'}</h3>

            ${
              p.color
                ? `<p class="product-color">${p.color}</p>`
                : ''
            }

            <p class="product-stock">
              ${Number(p.stock || 0)} шт.
            </p>

            <strong class="product-price">
              ${money(p.price)}
            </strong>

            ${
              Number(p.stock || 0) > 0
                ? `
                  <button
                    class="primary-button"
                    onclick="addToCart('${p.id}')"
                  >
                    В корзину
                  </button>
                `
                : `
                  <button disabled>
                    Нет в наличии
                  </button>
                `
            }

          </div>
        </article>
      `).join('')
    : `
      <section class="panel">
        <h2>Новая коллекция готовится</h2>
        <p>Совсем скоро здесь появятся новые образы ZAFAYHA.</p>
      </section>
    `;

  app.innerHTML =
    hero(
      'Тихая элегантность.',
      'Коллекция, созданная для вашего образа.'
    ) +
    `<div class="grid">${cards}</div>` +
    (
      isOwner
        ? `
          <button
            class="adminlink"
            onclick="admin()"
          >
            Управление ZAFAYHA
          </button>
        `
        : ''
    );

  updateCartBadge();
}

/* =========================
   CART
========================= */

window.addToCart = function(id) {
  const product = getProduct(id);

  if (!product) return;

  if (Number(product.stock || 0) <= 0) {
    showNotice('Товара сейчас нет в наличии.');
    return;
  }

  const existing = cart.find(
    item => String(item.id) === String(id)
  );

  if (existing) {
    if (existing.quantity >= Number(product.stock)) {
      showNotice('Больше этого количества сейчас нет в наличии.');
      return;
    }

    existing.quantity += 1;
  } else {
    cart.push({
      id,
      quantity: 1
    });
  }

  saveCart();

  showNotice(`${product.name} добавлен в корзину.`);
};

window.changeQuantity = function(id, change) {
  const item = cart.find(
    item => String(item.id) === String(id)
  );

  const product = getProduct(id);

  if (!item || !product) return;

  const nextQuantity = item.quantity + change;

  if (nextQuantity <= 0) {
    cart = cart.filter(
      item => String(item.id) !== String(id)
    );
  } else if (nextQuantity <= Number(product.stock || 0)) {
    item.quantity = nextQuantity;
  } else {
    showNotice('Больше товара сейчас нет в наличии.');
    return;
  }

  saveCart();
  cartView();
};

window.removeFromCart = function(id) {
  cart = cart.filter(
    item => String(item.id) !== String(id)
  );

  saveCart();
  cartView();
};

function cartView() {
  setActiveNav('cart');

  const rows = cart
    .map(item => ({
      ...item,
      product: getProduct(item.id)
    }))
    .filter(item => item.product);

  const total = rows.reduce(
    (sum, item) =>
      sum +
      Number(item.product.price || 0) *
      Number(item.quantity || 0),
    0
  );

  app.innerHTML =
    hero(
      'Ваша корзина.',
      'Выбранные изделия ZAFAYHA.'
    ) +
    `
      <section class="panel cart-panel">

        ${
          rows.length
            ? rows.map(item => `
                <div class="cart-item">

                  ${
                    item.product.image_url
                      ? `
                        <img
                          src="${item.product.image_url}"
                          alt="${item.product.name}"
                        >
                      `
                      : ''
                  }

                  <div class="cart-info">

                    <strong>
                      ${item.product.name}
                    </strong>

                    <p>
                      ${item.product.color || ''}
                    </p>

                    <p>
                      ${money(item.product.price)}
                    </p>

                    <div class="quantity-controls">

                      <button
                        onclick="changeQuantity('${item.id}', -1)"
                      >
                        −
                      </button>

                      <span>
                        ${item.quantity}
                      </span>

                      <button
                        onclick="changeQuantity('${item.id}', 1)"
                      >
                        +
                      </button>

                    </div>

                    <button
                      class="remove-button"
                      onclick="removeFromCart('${item.id}')"
                    >
                      Удалить
                    </button>

                  </div>

                </div>
              `).join('')
            : `
                <div class="empty-state">
                  <h2>Корзина пуста</h2>

                  <p>
                    Добавьте понравившиеся изделия из коллекции.
                  </p>

                  <button onclick="shop()">
                    Смотреть коллекцию
                  </button>
                </div>
              `
        }

        ${
          rows.length
            ? `
                <div class="cart-total">

                  <span>Итого</span>

                  <strong>
                    ${money(total)}
                  </strong>

                </div>

                <button
                  class="checkout-button"
                  onclick="checkout()"
                >
                  Оформить заказ
                </button>
              `
            : ''
        }

      </section>
    `;

  updateCartBadge();
}

window.checkout = function() {
  if (!cart.length) return;

  setActiveNav('cart');

  app.innerHTML =
    hero(
      'Оформление заказа.',
      'Оставьте данные для связи.'
    ) +
    `
      <section class="panel checkout-panel">

        <label>Ваше имя</label>

        <input
          id="customerName"
          placeholder="Имя"
        >

        <label>Телефон</label>

        <input
          id="customerPhone"
          type="tel"
          placeholder="+998"
        >

        <label>Адрес доставки</label>

        <input
          id="customerAddress"
          placeholder="Город, улица, дом"
        >

        <label>Комментарий</label>

        <textarea
          id="customerComment"
          placeholder="Комментарий к заказу"
        ></textarea>

        <button
          class="primary-button"
          onclick="sendOrder()"
        >
          Подтвердить заказ
        </button>

        <button onclick="cartView()">
          Вернуться в корзину
        </button>

      </section>
    `;
};

window.sendOrder = function() {
  const name =
    document.querySelector('#customerName')?.value.trim();

  const phone =
    document.querySelector('#customerPhone')?.value.trim();

  const address =
    document.querySelector('#customerAddress')?.value.trim();

  if (!name || !phone) {
    showNotice('Введите имя и номер телефона.');
    return;
  }

  if (!address) {
    showNotice('Введите адрес доставки.');
    return;
  }

  showNotice(
    'Данные заполнены. Следующим этапом подключим отправку заказа администратору ZAFAYHA.'
  );
};

/* =========================
   TRY ON
========================= */

function tryon() {
  setActiveNav('tryon');

  app.innerHTML =
    hero(
      'Примерьте ZAFAYHA.',
      'Посмотрите, как образ будет смотреться на вас.'
    ) +
    `
      <section class="panel feature-panel">

        <div class="feature-icon">
          ✦
        </div>

        <h2>Виртуальная примерка</h2>

        <p>
          Выберите фотографию, а затем изделие ZAFAYHA.
        </p>

        <label class="upload-button">

          Выбрать фотографию

          <input
            id="tryonPhoto"
            type="file"
            accept="image/*"
            hidden
            onchange="previewTryonPhoto(event)"
          >

        </label>

        <div id="tryonPreview"></div>

        <p class="feature-note">
          AI-примерку подключим отдельным этапом.
        </p>

      </section>
    `;
}

window.previewTryonPhoto = function(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  const reader = new FileReader();

  reader.onload = function(e) {
    const preview =
      document.querySelector('#tryonPreview');

    if (!preview) return;

    preview.innerHTML = `
      <img
        class="tryon-preview-image"
        src="${e.target.result}"
        alt="Фото для примерки"
      >

      <p>
        Фото готово для примерки.
      </p>
    `;
  };

  reader.readAsDataURL(file);
};

/* =========================
   GIFT
========================= */

function gift() {
  setActiveNav('gift');

  const options = products
    .filter(p => Number(p.stock || 0) > 0)
    .map(p => `
      <option value="${p.id}">
        ${p.name} — ${money(p.price)}
      </option>
    `)
    .join('');

  app.innerHTML =
    hero(
      'Передайте тепло.',
      'Подарок ZAFAYHA для особенного человека.'
    ) +
    `
      <section class="panel gift-panel">

        <h2>Подарить ZAFAYHA</h2>

        ${
          options
            ? `
                <label>Выберите изделие</label>

                <select id="giftProduct">
                  ${options}
                </select>

                <label>Имя получателя</label>

                <input
                  id="giftName"
                  placeholder="Имя"
                >

                <label>Телефон получателя</label>

                <input
                  id="giftPhone"
                  type="tel"
                  placeholder="+998"
                >

                <label>Ваше пожелание</label>

                <textarea
                  id="giftMessage"
                  placeholder="Напишите несколько тёплых слов..."
                ></textarea>

                <button
                  class="primary-button"
                  onclick="addGiftToCart()"
                >
                  Добавить подарок в корзину
                </button>
              `
            : `
                <p>
                  Сейчас нет изделий для оформления подарка.
                </p>
              `
        }

      </section>
    `;
}

window.addGiftToCart = function() {
  const select =
    document.querySelector('#giftProduct');

  const name =
    document.querySelector('#giftName')?.value.trim();

  if (!select?.value) return;

  if (!name) {
    showNotice('Введите имя получателя.');
    return;
  }

  addToCart(select.value);

  setTimeout(() => {
    cartView();
  }, 300);
};

/* =========================
   ADMIN
========================= */

function admin() {
  if (!isOwner) {
    shop();
    return;
  }

  /* В админке нижнее меню не выделяем */

  setActiveNav(null);

  app.innerHTML =
    hero(
      'Управление ZAFAYHA',
      'Коллекция и наличие.'
    ) +
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

        <button
          class="primary-button"
          onclick="createProduct()"
        >
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

                  <button
                    onclick="editProduct('${p.id}')"
                  >
                    Изменить
                  </button>

                  <button
                    onclick="deleteProduct('${p.id}')"
                  >
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

  const name =
    document.querySelector('#productName').value.trim();

  const color =
    document.querySelector('#productColor').value.trim();

  const price =
    Number(document.querySelector('#productPrice').value);

  const stock =
    Number(document.querySelector('#productStock').value);

  const image_url =
    document.querySelector('#productImage').value.trim();

  if (!name) {
    showNotice('Введите название товара.');
    return;
  }

  if (!price || price < 0) {
    showNotice('Введите цену.');
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
      throw new Error(await response.text());
    }

    await refreshAdmin();

  } catch (error) {
    console.error(error);

    showNotice('Не удалось добавить товар.');
  }
};

window.editProduct = function(id) {
  if (!isOwner) return;

  const product = getProduct(id);

  if (!product) return;

  setActiveNav(null);

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

        <button
          class="primary-button"
          onclick="saveProduct('${product.id}')"
        >
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

  const name =
    document.querySelector('#editName').value.trim();

  const color =
    document.querySelector('#editColor').value.trim();

  const price =
    Number(document.querySelector('#editPrice').value);

  const stock =
    Number(document.querySelector('#editStock').value);

  const image_url =
    document.querySelector('#editImage').value.trim();

  if (!name) {
    showNotice('Введите название.');
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
      throw new Error(await response.text());
    }

    await refreshAdmin();

  } catch (error) {
    console.error(error);

    showNotice('Не удалось изменить товар.');
  }
};

window.deleteProduct = async function(id) {
  if (!isOwner) return;

  const confirmed =
    confirm('Удалить этот товар из ZAFAYHA?');

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
      throw new Error(await response.text());
    }

    cart = cart.filter(
      item => String(item.id) !== String(id)
    );

    saveCart();

    await refreshAdmin();

  } catch (error) {
    console.error(error);

    showNotice('Не удалось удалить товар.');
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

    showNotice('Не удалось обновить список товаров.');
  }
}

/* =========================
   NAVIGATION
========================= */

window.loadProducts = loadProducts;
window.shop = shop;
window.cartView = cartView;
window.tryon = tryon;
window.gift = gift;

/* Переключение нижнего меню */

document.querySelectorAll('nav button').forEach(button => {
  button.onclick = () => {
    const action = button.dataset.action;

    if (action === 'shop') {
      shop();
    }

    if (action === 'tryon') {
      tryon();
    }

    if (action === 'gift') {
      gift();
    }

    if (action === 'cart') {
      cartView();
    }
  };
});

/* =========================
   TELEGRAM
========================= */

if (tg) {
  tg.ready();
  tg.expand();
}

/* При первом запуске активен Магазин */

setActiveNav('shop');

updateCartBadge();
loadProducts();
