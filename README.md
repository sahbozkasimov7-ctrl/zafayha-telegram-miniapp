# ZAFAYHA Telegram Mini App — owner prototype
Owner Telegram ID: 8713197897.

This prototype now detects the Telegram user through Telegram.WebApp.initDataUnsafe and only shows the admin UI to the configured owner ID. The owner can add, edit and delete products, including name, price, color and stock.

IMPORTANT: this is still a local prototype. Production security must validate Telegram initData on the backend; never trust initDataUnsafe alone. Product/order/admin data must move from localStorage to a shared server database and image storage. Bot/API secrets must stay server-side.
