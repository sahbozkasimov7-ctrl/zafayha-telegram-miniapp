const OWNER_IDS = ['8713197897', '8886448593'];

const SUPABASE_URL = 'https://ackordxxqeccjlifzgop.supabase.co';
const SUPABASE_KEY = 'sb_publishable_s_ZV40KaRI6kpgiuZlVW-w_H-11lwE6';

const STORAGE_BUCKET = 'product-images';

const PAYMENT_CARD = '9860350148420911';
const PAYMENT_CARD_DISPLAY = '9860 3501 4842 0911';
const PAYMENT_RECIPIENT = 'M.K';

let products = [];
let cart = JSON.parse(localStorage.getItem('zafayha_cart') || '[]');

let orderSending = false;
let productSaving = false;
let pendingOrder = null;

let newProductImageFile = null;
let editProductImageFile = null;

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

      ${
        subtitle
          ? `<p class="hero-subtitle">${subtitle}</p>`
          : ''
      }
    </section>
  `;
}

function saveCart() {
  localStorage.setItem(
    'zafayha_cart',
    JSON.stringify(cart)
  );

  updateCartBadge();
}

function cartCount() {
  return cart.reduce(
    (sum, item) =>
      sum + Number(item.quantity || 0),
    0
  );
}

function updateCartBadge() {
  document
    .querySelectorAll('nav button')
    .forEach(button => {
      if (button.dataset.action === 'cart') {
        button.textContent =
          `Корзина ${cartCount()}`;
      }
    });
}

function getProduct(id) {
  return products.find(
    product =>
      String(product.id) === String(id)
  );
}

function showNotice(message) {
  if (tg?.showAlert) {
    tg.showAlert(message);
  } else {
    alert(message);
  }
}

function setActiveNav(action) {
  document
    .querySelectorAll('nav button')
    .forEach(button => {
      button.classList.toggle(
        'active',
        button.dataset.action === action
      );
    });
}

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* =========================
   IMAGE UPLOAD
========================= */

function createImageFileName(file) {
  const extension =
    file.name
      ?.split('.')
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, '') || 'jpg';

  const random =
    Math.random()
      .toString(36)
      .slice(2, 10);

  return `${Date.now()}-${random}.${extension}`;
}

async function uploadProductImage(file) {
  if (!file) return null;

  if (!file.type?.startsWith('image/')) {
    throw new Error('Выбранный файл не является фотографией.');
  }

  /*
    Ограничиваем очень большие файлы,
    чтобы магазин оставался быстрым.
  */
  const maxSize = 10 * 1024 * 1024;

  if (file.size > maxSize) {
    throw new Error(
      'Фото слишком большое. Выберите фото до 10 МБ.'
    );
  }

  const fileName = createImageFileName(file);

  const uploadUrl =
    `${SUPABASE_URL}/storage/v1/object/` +
    `${STORAGE_BUCKET}/${fileName}`;

  const response = await fetch(
    uploadUrl,
    {
      method: 'POST',

      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type':
          file.type || 'application/octet-stream'
      },

      body: file
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      'Image upload error:',
      errorText
    );

    throw new Error(
      'Не удалось загрузить фотографию.'
    );
  }

  return (
    `${SUPABASE_URL}/storage/v1/object/public/` +
    `${STORAGE_BUCKET}/${fileName}`
  );
}

function showLocalImagePreview(file, targetId) {
  const preview =
    document.querySelector(`#${targetId}`);

  if (!preview || !file) return;

  const reader = new FileReader();

  reader.onload = event => {
    preview.innerHTML = `
      <div
        style="
          margin-top: 14px;
          border-radius: 22px;
          overflow: hidden;
          background: #f3efea;
        "
      >
        <img
          src="${event.target.result}"
          alt="Фото товара"
          style="
            display: block;
            width: 100%;
            aspect-ratio: 4 / 5;
            object-fit: cover;
          "
        >
      </div>

      <p
        style="
          margin-top: 8px;
          font-size: 13px;
          opacity: .65;
        "
      >
        Фото готово к загрузке
      </p>
    `;
  };

  reader.readAsDataURL(file);
}

window.selectNewProductImage = function(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  if (!file.type?.startsWith('image/')) {
    showNotice('Выберите фотографию.');
    event.target.value = '';
    return;
  }

  newProductImageFile = file;

  showLocalImagePreview(
    file,
    'newProductImagePreview'
  );
};

window.selectEditProductImage = function(event) {
  const file = event.target.files?.[0];

  if (!file) return;

  if (!file.type?.startsWith('image/')) {
    showNotice('Выберите фотографию.');
    event.target.value = '';
    return;
  }

  editProductImageFile = file;

  showLocalImagePreview(
    file,
    'editProductImagePreview'
  );
};

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
      throw new Error(
        `Ошибка загрузки: ${response.status}`
      );
    }

    products = await response.json();

    cart = cart.filter(item =>
      products.some(
        product =>
          String(product.id) ===
          String(item.id)
      )
    );

    saveCart();
    shop();

  } catch (error) {
    console.error(error);

    app.innerHTML = `
      ${hero('ZAFAYHA')}

      <section class="panel">
        <h2>Не удалось загрузить товары</h2>

        <p>
          Попробуйте открыть магазин ещё раз.
        </p>

        <button onclick="loadProducts()">
          Повторить
        </button>
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
    ? products.map(product => {
        const name =
          escapeHtml(
            product.name || 'ZAFAYHA'
          );

        const color =
          escapeHtml(
            product.color || ''
          );

        const stock =
          Number(product.stock || 0);

        return `
          <article
            class="card"
            style="
              overflow: hidden;
              padding: 0;
              margin-bottom: 22px;
              border-radius: 26px;
            "
          >

            ${
              product.image_url
                ? `
                  <div
                    class="product-image"
                    style="
                      width: 100%;
                      overflow: hidden;
                      background: #f1ece6;
                    "
                  >
                    <img
                      src="${escapeHtml(product.image_url)}"
                      alt="${name}"
                      loading="lazy"
                      style="
                        display: block;
                        width: 100%;
                        aspect-ratio: 4 / 5;
                        object-fit: cover;
                      "
                    >
                  </div>
                `
                : `
                  <div
                    style="
                      width: 100%;
                      aspect-ratio: 4 / 5;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      background:
                        linear-gradient(
                          145deg,
                          #f4efea,
                          #e9dfd9
                        );
                    "
                  >
                    <div
                      style="
                        text-align: center;
                        opacity: .55;
                      "
                    >
                      <div
                        style="
                          font-size: 12px;
                          letter-spacing: 3px;
                        "
                      >
                        ZAFAYHA
                      </div>
                    </div>
                  </div>
                `
            }

            <div
              class="card-content"
              style="
                padding: 20px;
              "
            >

              ${
                color
                  ? `
                    <div
                      style="
                        margin-bottom: 7px;
                        font-size: 12px;
                        letter-spacing: 1.4px;
                        text-transform: uppercase;
                        opacity: .58;
                      "
                    >
                      ${color}
                    </div>
                  `
                  : ''
              }

              <h3
                style="
                  margin-top: 0;
                  margin-bottom: 9px;
                  font-size: 22px;
                "
              >
                ${name}
              </h3>

              <div
                style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  gap: 14px;
                  margin-bottom: 18px;
                "
              >

                <strong
                  class="product-price"
                  style="
                    font-size: 18px;
                  "
                >
                  ${money(product.price)}
                </strong>

                <span
                  style="
                    font-size: 12px;
                    opacity: .58;
                  "
                >
                  ${
                    stock > 0
                      ? `${stock} шт.`
                      : 'Нет в наличии'
                  }
                </span>

              </div>

              ${
                stock > 0
                  ? `
                    <button
                      class="primary-button"
                      onclick="addToCart('${product.id}')"
                      style="
                        width: 100%;
                      "
                    >
                      В корзину
                    </button>
                  `
                  : `
                    <button
                      disabled
                      style="
                        width: 100%;
                      "
                    >
                      Нет в наличии
                    </button>
                  `
              }

            </div>

          </article>
        `;
      }).join('')
    : `
      <section class="panel">
        <h2>Новая коллекция готовится</h2>

        <p>
          Совсем скоро здесь появятся
          новые образы ZAFAYHA.
        </p>
      </section>
    `;

  app.innerHTML =
    hero(
      'Тихая элегантность.',
      'Коллекция, созданная для вашего образа.'
    ) +
    `
      <div
        class="grid"
        style="
          display: block;
        "
      >
        ${cards}
      </div>
    ` +
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
    showNotice(
      'Товара сейчас нет в наличии.'
    );

    return;
  }

  const existing = cart.find(
    item =>
      String(item.id) === String(id)
  );

  if (existing) {
    if (
      existing.quantity >=
      Number(product.stock)
    ) {
      showNotice(
        'Больше этого количества сейчас нет в наличии.'
      );

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

  showNotice(
    `${product.name} добавлен в корзину.`
  );
};

window.changeQuantity = function(
  id,
  change
) {
  const item = cart.find(
    item =>
      String(item.id) === String(id)
  );

  const product = getProduct(id);

  if (!item || !product) return;

  const nextQuantity =
    item.quantity + change;

  if (nextQuantity <= 0) {
    cart = cart.filter(
      item =>
        String(item.id) !== String(id)
    );

  } else if (
    nextQuantity <=
    Number(product.stock || 0)
  ) {
    item.quantity = nextQuantity;

  } else {
    showNotice(
      'Больше товара сейчас нет в наличии.'
    );

    return;
  }

  saveCart();
  cartView();
};

window.removeFromCart = function(id) {
  cart = cart.filter(
    item =>
      String(item.id) !== String(id)
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
                          src="${escapeHtml(item.product.image_url)}"
                          alt="${escapeHtml(item.product.name)}"
                        >
                      `
                      : ''
                  }

                  <div class="cart-info">

                    <strong>
                      ${escapeHtml(item.product.name)}
                    </strong>

                    <p>
                      ${escapeHtml(item.product.color || '')}
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
                  Добавьте понравившиеся изделия
                  из коллекции.
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

/* =========================
   CHECKOUT
========================= */

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
          Продолжить к оплате
        </button>

        <button onclick="cartView()">
          Вернуться в корзину
        </button>

      </section>
    `;
};

/* =========================
   PREPARE ORDER
========================= */

window.sendOrder = function() {
  const name =
    document
      .querySelector('#customerName')
      ?.value
      .trim();

  const phone =
    document
      .querySelector('#customerPhone')
      ?.value
      .trim();

  const address =
    document
      .querySelector('#customerAddress')
      ?.value
      .trim();

  const comment =
    document
      .querySelector('#customerComment')
      ?.value
      .trim() || '';

  if (!name || !phone) {
    showNotice(
      'Введите имя и номер телефона.'
    );

    return;
  }

  if (!address) {
    showNotice(
      'Введите адрес доставки.'
    );

    return;
  }

  const orderItems = cart
    .map(item => {
      const product =
        getProduct(item.id);

      if (!product) return null;

      return {
        id: product.id,
        name:
          product.name || 'ZAFAYHA',
        color:
          product.color || '',
        price:
          Number(product.price || 0),
        quantity:
          Number(item.quantity || 0)
      };
    })
    .filter(Boolean);

  if (!orderItems.length) {
    showNotice('Корзина пуста.');
    return;
  }

  const total =
    orderItems.reduce(
      (sum, item) =>
        sum +
        item.price * item.quantity,
      0
    );

  pendingOrder = {
    name,
    phone,
    address,
    comment,
    items: orderItems,
    total,

    telegramUser: user
      ? {
          id: user.id,
          first_name:
            user.first_name || '',
          last_name:
            user.last_name || '',
          username:
            user.username || ''
        }
      : null
  };

  paymentView();
};

/* =========================
   PAYMENT
========================= */

function paymentView() {
  if (!pendingOrder) {
    checkout();
    return;
  }

  setActiveNav('cart');

  app.innerHTML =
    hero(
      'Оплата заказа.',
      'Переведите сумму на карту ZAFAYHA.'
    ) +
    `
      <section class="panel checkout-panel">

        <h2>К оплате</h2>

        <div class="cart-total">

          <span>Итого</span>

          <strong>
            ${money(pendingOrder.total)}
          </strong>

        </div>

        <p>
          Переведите точную сумму заказа
          на карту:
        </p>

        <div
          style="
            margin: 18px 0;
            padding: 22px 16px;
            border-radius: 20px;
            background: #f5eeee;
            text-align: center;
          "
        >

          <div
            style="
              font-size: 13px;
              margin-bottom: 9px;
              opacity: 0.7;
            "
          >
            Номер карты
          </div>

          <strong
            style="
              display: block;
              font-size: 20px;
              letter-spacing: 1px;
              margin-bottom: 10px;
            "
          >
            ${PAYMENT_CARD_DISPLAY}
          </strong>

          <div>
            Получатель:
            ${PAYMENT_RECIPIENT}
          </div>

        </div>

        <button
          class="primary-button"
          onclick="copyCardNumber()"
        >
          Скопировать номер карты
        </button>

        <p
          style="
            margin-top: 20px;
            font-size: 13px;
            line-height: 1.5;
            opacity: 0.72;
          "
        >
          После перевода нажмите
          «Я оплатил».
          Мы проверим поступление денег
          и свяжемся с вами.
        </p>

        <button
          id="paidButton"
          class="primary-button"
          onclick="confirmPayment()"
        >
          Я оплатил
        </button>

        <button onclick="checkout()">
          Назад
        </button>

      </section>
    `;
}

window.copyCardNumber =
  async function() {
    try {
      await navigator.clipboard.writeText(
        PAYMENT_CARD
      );

      showNotice(
        'Номер карты скопирован.'
      );

    } catch (error) {
      console.error(error);

      showNotice(
        `Номер карты: ${PAYMENT_CARD_DISPLAY}`
      );
    }
  };

/* =========================
   SEND ORDER AFTER PAYMENT
========================= */

window.confirmPayment =
  async function() {
    if (
      orderSending ||
      !pendingOrder
    ) {
      return;
    }

    const button =
      document.querySelector(
        '#paidButton'
      );

    orderSending = true;

    if (button) {
      button.disabled = true;
      button.textContent =
        'Отправляем...';
    }

    try {
      const response =
        await fetch(
          '/api/send-order',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json'
            },

            body:
              JSON.stringify(
                pendingOrder
              )
          }
        );

      let result = null;

      try {
        result =
          await response.json();
      } catch (jsonError) {
        console.error(
          'JSON error:',
          jsonError
        );
      }

      if (
        !response.ok ||
        !result?.ok
      ) {
        throw new Error(
          result?.error ||
          `Ошибка отправки: ${response.status}`
        );
      }

      const customerName =
        pendingOrder.name;

      cart = [];
      pendingOrder = null;

      saveCart();

      app.innerHTML =
        hero(
          'Спасибо.',
          'Ваш заказ принят.'
        ) +
        `
          <section class="panel">

            <h2>Заказ принят</h2>

            <p>
              Спасибо,
              ${escapeHtml(customerName)}!
            </p>

            <p>
              Мы получили информацию
              о вашем заказе.
              Сейчас проверим поступление
              оплаты и свяжемся с вами
              для подтверждения.
            </p>

            <button
              class="primary-button"
              onclick="shop()"
            >
              Вернуться в магазин
            </button>

          </section>
        `;

      setActiveNav('shop');

      showNotice(
        'Спасибо! Мы проверим поступление оплаты.'
      );

    } catch (error) {
      console.error(
        'Payment confirmation error:',
        error
      );

      showNotice(
        'Не удалось отправить заказ. Попробуйте ещё раз.'
      );

      if (button) {
        button.disabled = false;
        button.textContent =
          'Я оплатил';
      }

    } finally {
      orderSending = false;
    }
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

        <h2>
          Виртуальная примерка
        </h2>

        <p>
          Выберите фотографию,
          а затем изделие ZAFAYHA.
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
          AI-примерку подключим
          отдельным этапом.
        </p>

      </section>
    `;
}

window.previewTryonPhoto =
  function(event) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload =
      function(e) {
        const preview =
          document.querySelector(
            '#tryonPreview'
          );

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
    .filter(
      product =>
        Number(
          product.stock || 0
        ) > 0
    )
    .map(product => `
      <option value="${product.id}">
        ${escapeHtml(product.name)}
        — ${money(product.price)}
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

        <h2>
          Подарить ZAFAYHA
        </h2>

        ${
          options
            ? `
              <label>
                Выберите изделие
              </label>

              <select id="giftProduct">
                ${options}
              </select>

              <label>
                Имя получателя
              </label>

              <input
                id="giftName"
                placeholder="Имя"
              >

              <label>
                Телефон получателя
              </label>

              <input
                id="giftPhone"
                type="tel"
                placeholder="+998"
              >

              <label>
                Ваше пожелание
              </label>

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
                Сейчас нет изделий
                для оформления подарка.
              </p>
            `
        }

      </section>
    `;
}

window.addGiftToCart =
  function() {
    const select =
      document.querySelector(
        '#giftProduct'
      );

    const name =
      document.querySelector(
        '#giftName'
      )?.value.trim();

    if (!select?.value) return;

    if (!name) {
      showNotice(
        'Введите имя получателя.'
      );

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

  newProductImageFile = null;

  setActiveNav(null);

  app.innerHTML =
    hero(
      'Управление ZAFAYHA',
      'Коллекция и наличие.'
    ) +
    `
      <section class="panel">

        <h2>Добавить товар</h2>

        <label>Название</label>

        <input
          id="productName"
          placeholder="Например: Nest Zafayha"
        >

        <label>Цвет</label>

        <input
          id="productColor"
          placeholder="Например: Black"
        >

        <label>Цена</label>

        <input
          id="productPrice"
          type="number"
          placeholder="100000"
        >

        <label>Количество</label>

        <input
          id="productStock"
          type="number"
          placeholder="5"
        >

        <label
          style="
            display: block;
            margin-top: 16px;
          "
        >
          Фото товара
        </label>

        <label
          class="upload-button"
          style="
            display: block;
            text-align: center;
            margin-top: 8px;
            cursor: pointer;
          "
        >
          Выбрать фото

          <input
            id="productImageFile"
            type="file"
            accept="image/*"
            hidden
            onchange="selectNewProductImage(event)"
          >

        </label>

        <div
          id="newProductImagePreview"
        ></div>

        <button
          id="createProductButton"
          class="primary-button"
          onclick="createProduct()"
          style="
            margin-top: 18px;
          "
        >
          Добавить товар
        </button>

      </section>

      <section class="panel">

        <h2>Товары</h2>

        ${
          products.length
            ? products
                .map(product => `
                  <div
                    class="admin-product"
                    style="
                      padding: 14px 0;
                    "
                  >

                    ${
                      product.image_url
                        ? `
                          <img
                            src="${escapeHtml(product.image_url)}"
                            alt="${escapeHtml(product.name)}"
                            style="
                              display: block;
                              width: 72px;
                              height: 90px;
                              object-fit: cover;
                              border-radius: 14px;
                              margin-bottom: 10px;
                            "
                          >
                        `
                        : ''
                    }

                    <strong>
                      ${escapeHtml(product.name)}
                    </strong>

                    <p>
                      ${escapeHtml(product.color || '')}
                      ·
                      ${Number(product.stock || 0)} шт.
                      ·
                      ${money(product.price)}
                    </p>

                    <button
                      onclick="editProduct('${product.id}')"
                    >
                      Изменить
                    </button>

                    <button
                      onclick="deleteProduct('${product.id}')"
                    >
                      Удалить
                    </button>

                  </div>
                `)
                .join('')
            : '<p>Товаров пока нет.</p>'
        }

        <button onclick="shop()">
          Вернуться в магазин
        </button>

      </section>
    `;
}

window.admin = admin;

/* =========================
   CREATE PRODUCT
========================= */

window.createProduct =
  async function() {
    if (
      !isOwner ||
      productSaving
    ) {
      return;
    }

    const name =
      document
        .querySelector('#productName')
        ?.value
        .trim();

    const color =
      document
        .querySelector('#productColor')
        ?.value
        .trim() || '';

    const price =
      Number(
        document
          .querySelector('#productPrice')
          ?.value
      );

    const stock =
      Number(
        document
          .querySelector('#productStock')
          ?.value
      );

    if (!name) {
      showNotice(
        'Введите название товара.'
      );

      return;
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      showNotice(
        'Введите правильную цену.'
      );

      return;
    }

    if (
      !Number.isFinite(stock) ||
      stock < 0
    ) {
      showNotice(
        'Введите количество товара.'
      );

      return;
    }

    if (!newProductImageFile) {
      showNotice(
        'Выберите фото товара.'
      );

      return;
    }

    const button =
      document.querySelector(
        '#createProductButton'
      );

    productSaving = true;

    if (button) {
      button.disabled = true;
      button.textContent =
        'Загружаем фото...';
    }

    try {
      const image_url =
        await uploadProductImage(
          newProductImageFile
        );

      if (button) {
        button.textContent =
          'Сохраняем товар...';
      }

      const response =
        await fetch(
          `${SUPABASE_URL}/rest/v1/products`,
          {
            method: 'POST',

            headers: {
              ...headers,
              Prefer:
                'return=representation'
            },

            body:
              JSON.stringify({
                name,
                color,
                price,
                stock,
                image_url,
                active: true
              })
          }
        );

      if (!response.ok) {
        throw new Error(
          await response.text()
        );
      }

      newProductImageFile = null;

      showNotice(
        'Товар добавлен в ZAFAYHA.'
      );

      await refreshAdmin();

    } catch (error) {
      console.error(
        'Create product error:',
        error
      );

      showNotice(
        error.message ||
        'Не удалось добавить товар.'
      );

      if (button) {
        button.disabled = false;
        button.textContent =
          'Добавить товар';
      }

    } finally {
      productSaving = false;
    }
  };

/* =========================
   EDIT PRODUCT
========================= */

window.editProduct =
  function(id) {
    if (!isOwner) return;

    const product =
      getProduct(id);

    if (!product) return;

    editProductImageFile = null;

    setActiveNav(null);

    app.innerHTML =
      hero(
        'Изменить товар',
        'Обновите данные или фотографию.'
      ) +
      `
        <section class="panel">

          ${
            product.image_url
              ? `
                <div
                  style="
                    margin-bottom: 18px;
                    overflow: hidden;
                    border-radius: 22px;
                  "
                >
                  <img
                    src="${escapeHtml(product.image_url)}"
                    alt="${escapeHtml(product.name)}"
                    style="
                      display: block;
                      width: 100%;
                      aspect-ratio: 4 / 5;
                      object-fit: cover;
                    "
                  >
                </div>
              `
              : ''
          }

          <label>Название</label>

          <input
            id="editName"
            value="${escapeHtml(product.name || '')}"
            placeholder="Название"
          >

          <label>Цвет</label>

          <input
            id="editColor"
            value="${escapeHtml(product.color || '')}"
            placeholder="Цвет"
          >

          <label>Цена</label>

          <input
            id="editPrice"
            type="number"
            value="${Number(product.price || 0)}"
            placeholder="Цена"
          >

          <label>Количество</label>

          <input
            id="editStock"
            type="number"
            value="${Number(product.stock || 0)}"
            placeholder="Количество"
          >

          <label
            style="
              display: block;
              margin-top: 16px;
            "
          >
            Фотография
          </label>

          <label
            class="upload-button"
            style="
              display: block;
              text-align: center;
              margin-top: 8px;
              cursor: pointer;
            "
          >
            Выбрать новое фото

            <input
              id="editImageFile"
              type="file"
              accept="image/*"
              hidden
              onchange="selectEditProductImage(event)"
            >

          </label>

          <div
            id="editProductImagePreview"
          ></div>

          <button
            id="saveProductButton"
            class="primary-button"
            onclick="saveProduct('${product.id}')"
            style="
              margin-top: 18px;
            "
          >
            Сохранить изменения
          </button>

          <button onclick="admin()">
            Отмена
          </button>

        </section>
      `;
  };

/* =========================
   SAVE PRODUCT
========================= */

window.saveProduct =
  async function(id) {
    if (
      !isOwner ||
      productSaving
    ) {
      return;
    }

    const product =
      getProduct(id);

    if (!product) return;

    const name =
      document
        .querySelector('#editName')
        ?.value
        .trim();

    const color =
      document
        .querySelector('#editColor')
        ?.value
        .trim() || '';

    const price =
      Number(
        document
          .querySelector('#editPrice')
          ?.value
      );

    const stock =
      Number(
        document
          .querySelector('#editStock')
          ?.value
      );

    if (!name) {
      showNotice(
        'Введите название.'
      );

      return;
    }

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      showNotice(
        'Введите правильную цену.'
      );

      return;
    }

    if (
      !Number.isFinite(stock) ||
      stock < 0
    ) {
      showNotice(
        'Введите количество товара.'
      );

      return;
    }

    const button =
      document.querySelector(
        '#saveProductButton'
      );

    productSaving = true;

    if (button) {
      button.disabled = true;

      button.textContent =
        editProductImageFile
          ? 'Загружаем фото...'
          : 'Сохраняем...';
    }

    try {
      let image_url =
        product.image_url || null;

      if (editProductImageFile) {
        image_url =
          await uploadProductImage(
            editProductImageFile
          );
      }

      if (button) {
        button.textContent =
          'Сохраняем...';
      }

      const response =
        await fetch(
          `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
          {
            method: 'PATCH',

            headers,

            body:
              JSON.stringify({
                name,
                color,
                price,
                stock,
                image_url
              })
          }
        );

      if (!response.ok) {
        throw new Error(
          await response.text()
        );
      }

      editProductImageFile = null;

      showNotice(
        'Товар обновлён.'
      );

      await refreshAdmin();

    } catch (error) {
      console.error(
        'Save product error:',
        error
      );

      showNotice(
        error.message ||
        'Не удалось изменить товар.'
      );

      if (button) {
        button.disabled = false;
        button.textContent =
          'Сохранить изменения';
      }

    } finally {
      productSaving = false;
    }
  };

/* =========================
   DELETE PRODUCT
========================= */

window.deleteProduct =
  async function(id) {
    if (!isOwner) return;

    const confirmed =
      confirm(
        'Удалить этот товар из ZAFAYHA?'
      );

    if (!confirmed) return;

    try {
      const response =
        await fetch(
          `${SUPABASE_URL}/rest/v1/products?id=eq.${encodeURIComponent(id)}`,
          {
            method: 'DELETE',
            headers
          }
        );

      if (!response.ok) {
        throw new Error(
          await response.text()
        );
      }

      cart = cart.filter(
        item =>
          String(item.id) !==
          String(id)
      );

      saveCart();

      await refreshAdmin();

    } catch (error) {
      console.error(error);

      showNotice(
        'Не удалось удалить товар.'
      );
    }
  };

/* =========================
   REFRESH ADMIN
========================= */

async function refreshAdmin() {
  try {
    const response =
      await fetch(
        `${SUPABASE_URL}/rest/v1/products?select=*&order=created_at.desc`,
        { headers }
      );

    if (!response.ok) {
      throw new Error(
        `Ошибка: ${response.status}`
      );
    }

    products =
      await response.json();

    admin();

  } catch (error) {
    console.error(error);

    showNotice(
      'Не удалось обновить список товаров.'
    );
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

document
  .querySelectorAll('nav button')
  .forEach(button => {
    button.onclick = () => {
      const action =
        button.dataset.action;

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

setActiveNav('shop');
updateCartBadge();
loadProducts();
