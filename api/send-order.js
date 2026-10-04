export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed'
    });
  }

  try {
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return res.status(500).json({
        ok: false,
        error: 'Bot token is not configured'
      });
    }

    const {
      name,
      phone,
      address,
      comment,
      items,
      total,
      telegramUser
    } = req.body || {};

    if (!name || !phone || !address) {
      return res.status(400).json({
        ok: false,
        error: 'Missing customer data'
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'Cart is empty'
      });
    }

    const OWNER_IDS = [
      '8713197897',
      '8886448593'
    ];

    const orderLines = items
      .map(item => {
        const quantity = Number(item.quantity || 0);
        const price = Number(item.price || 0);
        const sum = quantity * price;

        return (
          `• ${item.name}\n` +
          `${item.color ? `  Цвет: ${item.color}\n` : ''}` +
          `  ${quantity} шт. × ${formatMoney(price)}\n` +
          `  = ${formatMoney(sum)}`
        );
      })
      .join('\n\n');

    const telegramInfo = telegramUser
      ? [
          '',
          '👤 Telegram покупателя:',
          telegramUser.first_name
            ? `Имя: ${telegramUser.first_name}`
            : '',
          telegramUser.username
            ? `Username: @${telegramUser.username}`
            : '',
          telegramUser.id
            ? `ID: ${telegramUser.id}`
            : ''
        ]
          .filter(Boolean)
          .join('\n')
      : '';

    const message =
      `🛍 НОВЫЙ ЗАКАЗ ZAFAYHA\n\n` +
      `👤 Покупатель: ${name}\n` +
      `📞 Телефон: ${phone}\n` +
      `📍 Адрес: ${address}\n` +
      `${comment ? `💬 Комментарий: ${comment}\n` : ''}` +
      `\n━━━━━━━━━━━━━━\n\n` +
      `${orderLines}\n\n` +
      `━━━━━━━━━━━━━━\n` +
      `💰 ИТОГО: ${formatMoney(total)}\n` +
      telegramInfo;

    const results = [];

    for (const chatId of OWNER_IDS) {
      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message
          })
        }
      );

      const data = await response.json();

      results.push({
        chatId,
        ok: response.ok && data.ok
      });
    }

    const delivered = results.some(result => result.ok);

    if (!delivered) {
      return res.status(500).json({
        ok: false,
        error: 'Telegram delivery failed'
      });
    }

    return res.status(200).json({
      ok: true
    });

  } catch (error) {
    console.error('Order error:', error);

    return res.status(500).json({
      ok: false,
      error: 'Internal server error'
    });
  }
}

function formatMoney(value) {
  return (
    new Intl.NumberFormat('ru-RU').format(
      Number(value || 0)
    ) + ' сум'
  );
}
