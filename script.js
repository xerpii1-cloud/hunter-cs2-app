// ============================================================
// script.js — Логика CS2 Case Opening Mini App
// ============================================================

// --- ВАЖНО: замени на URL своего Ngrok-туннеля ---
// Пример: "https://abc123.ngrok-free.app"
const API_BASE = "https://ВАШ_NGROK_URL_СЮДА";

// --- Ширина одной карточки рулетки + gap ---
const CARD_WIDTH = 108; // 100px ширина + 8px gap
// --- Индекс выигрышной карточки в рулетке ---
const WINNER_INDEX = 11;

// --- Глобальное состояние приложения ---
let STATE = {
    user_id: null,
    username: "",
    balance: 0,
    level: 1,
    xp: 0,
    lastWonItem: null, // Последний выигранный предмет (для кнопки продать/забрать)
};

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================

// Ждём полной загрузки страницы
document.addEventListener("DOMContentLoaded", async () => {
    // Инициализируем Telegram WebApp
    const tg = window.Telegram?.WebApp;
    if (tg) {
        tg.ready();
        tg.expand(); // Разворачиваем на весь экран
        // Убираем кнопку "закрыть" Telegram (опционально)
        // tg.MainButton.hide();
    }

    // Получаем user_id из Telegram
    const tgUser = tg?.initDataUnsafe?.user;
    if (tgUser) {
        STATE.user_id = tgUser.id;
        STATE.username = tgUser.first_name || tgUser.username || "Player";
    } else {
        // Режим разработки (если открываем не через Telegram)
        STATE.user_id = 12345678;
        STATE.username = "TestUser";
        console.warn("⚠️ Telegram WebApp не обнаружен. Используется тестовый user_id.");
    }

    // Загружаем данные пользователя с сервера
    await loadUser();

    // Навешиваем обработчики событий
    bindEvents();
});

// ============================================================
// ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
// ============================================================

async function loadUser() {
    try {
        const data = await apiGet(`/api/get_user?user_id=${STATE.user_id}&username=${encodeURIComponent(STATE.username)}`);
        if (data.ok) {
            updateStateFromResponse(data);
            renderHeader();
            updateRefLink();
        }
    } catch (err) {
        console.error("Ошибка загрузки пользователя:", err);
        showToast("❌ Ошибка подключения к серверу");
    }
}

// Обновляем локальный STATE из ответа сервера
function updateStateFromResponse(data) {
    STATE.balance = data.balance ?? STATE.balance;
    STATE.level   = data.level ?? STATE.level;
    STATE.xp      = data.xp ?? STATE.xp;
    if (data.trade_url !== undefined) {
        document.getElementById("tradeUrlInput").value = data.trade_url;
    }
}

// ============================================================
// РЕНДЕР ШАПКИ
// ============================================================

function renderHeader() {
    // Аватар (первая буква имени)
    const letter = STATE.username.charAt(0).toUpperCase();
    document.getElementById("headerAvatar").textContent  = letter;
    document.getElementById("profileAvatar").textContent = letter;

    // Имя
    document.getElementById("headerName").textContent  = STATE.username;
    document.getElementById("profileName").textContent = STATE.username;

    // Уровень
    document.getElementById("headerLevel").textContent  = `Ур. ${STATE.level}`;
    document.getElementById("profileLevel").textContent = STATE.level;

    // Баланс
    document.getElementById("headerBalance").textContent = STATE.balance.toLocaleString();

    // XP прогресс-бар (уровень каждые 500 XP)
    const XP_PER_LEVEL = 500;
    const xpInLevel = STATE.xp % XP_PER_LEVEL;
    const xpPercent = Math.round((xpInLevel / XP_PER_LEVEL) * 100);
    document.getElementById("profileXP").textContent  = `${STATE.xp} XP`;
    document.getElementById("xpFill").style.width = `${xpPercent}%`;
}

// ============================================================
// НАВИГАЦИЯ (переключение вкладок)
// ============================================================

function bindEvents() {
    // --- Навигация ---
    document.querySelectorAll(".nav-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const tabId = btn.dataset.tab;
            switchTab(tabId, btn);
        });
    });

    // --- Открытие кейса ---
    document.getElementById("btnOpenCase").addEventListener("click", openCase);

    // --- Купить монеты (Stars) ---
    document.getElementById("btnBuyCoins").addEventListener("click", buyCoins);

    // --- Сохранить Trade URL ---
    document.getElementById("btnSaveTradeUrl").addEventListener("click", saveTradeUrl);

    // --- Копировать реферальную ссылку ---
    document.getElementById("btnCopyRef").addEventListener("click", copyRefLink);

    // --- Задания ---
    document.getElementById("btnGoChannel").addEventListener("click", () => {
        // Открываем канал (замени username на свой)
        window.Telegram?.WebApp?.openTelegramLink("https://t.me/ВАШ_КАНАЛ");
    });
    document.getElementById("btnCheckSub").addEventListener("click", checkSubscription);

    // --- Кнопки в модалке результата ---
    document.getElementById("btnSellResult").addEventListener("click", sellWonItem);
    document.getElementById("btnKeepResult").addEventListener("click", keepWonItem);
}

// Переключение вкладок
function switchTab(tabId, clickedBtn) {
    // Убираем активный класс у всех страниц и кнопок
    document.querySelectorAll(".tab-page").forEach(p => p.classList.remove("active"));
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));

    // Активируем нужную вкладку и кнопку
    document.getElementById(tabId).classList.add("active");
    clickedBtn.classList.add("active");

    // При переходе в инвентарь — загружаем его
    if (tabId === "tabInventory") {
        loadInventory();
    }
    // При переходе в профиль — обновляем данные
    if (tabId === "tabProfile") {
        renderHeader();
    }
}

// ============================================================
// ОТКРЫТИЕ КЕЙСА
// ============================================================

async function openCase() {
    const btn = document.getElementById("btnOpenCase");
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-open-icon">⏳</span><span>Открываем...</span>`;

    try {
        const data = await apiPost("/api/open_case", { user_id: STATE.user_id });

        if (!data.ok) {
            showToast(data.error === "Not enough balance"
                ? "❌ Недостаточно монет! Купи ещё."
                : `❌ Ошибка: ${data.error}`);
            return;
        }

        // Обновляем состояние
        STATE.balance = data.new_balance;
        STATE.level   = data.new_level;
        STATE.xp      = data.new_xp;
        STATE.lastWonItem = data.skin;

        // Обновляем шапку
        renderHeader();

        // Запускаем анимацию рулетки
        await runRoulette(data.roulette_items, data.skin);

    } catch (err) {
        console.error("Ошибка открытия кейса:", err);
        showToast("❌ Ошибка подключения к серверу");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<span class="btn-open-icon">🎰</span><span>ОТКРЫТЬ ЗА 500 🪙</span>`;
    }
}

// ============================================================
// АНИМАЦИЯ РУЛЕТКИ
// ============================================================

async function runRoulette(rouletteItems, wonSkin) {
    const overlay   = document.getElementById("modalOverlay");
    const track     = document.getElementById("rouletteTrack");
    const resultBox = document.getElementById("resultContainer");
    const roulBox   = document.getElementById("rouletteContainer");

    // Показываем модалку и скрываем результат
    overlay.classList.add("visible");
    resultBox.style.display = "none";
    roulBox.style.display   = "block";
    track.style.transition  = "none";
    track.style.transform   = "translateX(0)";
    track.innerHTML         = "";

    // Наполняем трек карточками
    rouletteItems.forEach((item, index) => {
        const card = createRouletteCard(item, index === WINNER_INDEX);
        track.appendChild(card);
    });

    // Небольшая пауза перед стартом анимации
    await sleep(100);

    // Вычисляем финальную позицию: выигрышная карточка должна быть под указателем
    const containerWidth = track.parentElement.offsetWidth;
    const centerOffset   = Math.floor(containerWidth / 2) - Math.floor(CARD_WIDTH / 2);
    const targetOffset   = WINNER_INDEX * CARD_WIDTH - centerOffset;

    // Запускаем анимацию (3.5 секунды с плавным замедлением)
    track.style.transition = "transform 3.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)";
    track.style.transform  = `translateX(-${targetOffset}px)`;

    // Ждём окончания анимации
    await sleep(3600);

    // Скрываем рулетку, показываем результат
    roulBox.style.display   = "none";
    resultBox.style.display = "block";
    showResult(wonSkin);
}

// Создаём DOM-элемент карточки для рулетки
function createRouletteCard(item, isWinner) {
    const card = document.createElement("div");
    card.className = `roulette-card ${item.rarity}${isWinner ? " winner" : ""}`;
    card.innerHTML = `
        <span class="roulette-card-icon">${getRarityEmoji(item.rarity)}</span>
        <span class="roulette-card-name">${item.name}</span>
    `;
    return card;
}

// Показываем результат в модалке
function showResult(skin) {
    document.getElementById("resultSkinIcon").textContent = getRarityEmoji(skin.rarity);
    document.getElementById("resultRarity").textContent   = getRarityLabel(skin.rarity);
    document.getElementById("resultRarity").className     = `result-rarity ${skin.rarity}`;
    document.getElementById("resultName").textContent     = skin.name;
    document.getElementById("resultPrice").textContent    = `+${skin.price} 🪙`;
    document.getElementById("sellResultPrice").textContent = skin.price;

    // Устанавливаем цвет свечения
    const glow = document.getElementById("resultGlow");
    glow.className = `result-glow ${skin.rarity}`;
}

// ============================================================
// ПРОДАЖА / СОХРАНЕНИЕ ВЫИГРАННОГО ПРЕДМЕТА
// ============================================================

// Продать выигранный предмет прямо из модалки
async function sellWonItem() {
    if (!STATE.lastWonItem) return;

    try {
        // Ищем только что добавленный предмет в инвентаре
        const inventory = await apiGet(`/api/get_inventory?user_id=${STATE.user_id}`);
        if (!inventory.ok || inventory.items.length === 0) return;

        // Берём последний добавленный предмет (самый большой id)
        const lastItem = inventory.items.reduce((a, b) => (a.id > b.id ? a : b));

        const result = await apiPost("/api/sell_item", {
            user_id: STATE.user_id,
            item_id: lastItem.id,
        });

        if (result.ok) {
            STATE.balance = result.new_balance;
            renderHeader();
            showToast(`✅ Продано за ${result.sold_for} 🪙`);
        }
    } catch (err) {
        showToast("❌ Ошибка продажи");
    }

    closeModal();
}

// Забрать предмет в инвентарь (просто закрыть модалку)
function keepWonItem() {
    showToast("✅ Предмет добавлен в инвентарь");
    closeModal();
}

function closeModal() {
    document.getElementById("modalOverlay").classList.remove("visible");
    STATE.lastWonItem = null;
}

// ============================================================
// ИНВЕНТАРЬ
// ============================================================

async function loadInventory() {
    const grid  = document.getElementById("inventoryGrid");
    const empty = document.getElementById("inventoryEmpty");
    const total = document.getElementById("inventoryTotal");

    grid.innerHTML = "";
    grid.appendChild(empty); // Возвращаем заглушку "пусто"

    try {
        const data = await apiGet(`/api/get_inventory?user_id=${STATE.user_id}`);
        if (!data.ok) return;

        total.textContent = data.total_value.toLocaleString();

        if (data.items.length === 0) {
            empty.style.display = "block";
            return;
        }

        empty.style.display = "none";

        data.items.forEach(item => {
            const card = createSkinCard(item);
            grid.appendChild(card);
        });

    } catch (err) {
        showToast("❌ Ошибка загрузки инвентаря");
    }
}

// Создаём карточку скина для инвентаря
function createSkinCard(item) {
    const card = document.createElement("div");
    card.className = `skin-card ${item.rarity}`;
    card.innerHTML = `
        <div class="skin-card-icon">${getRarityEmoji(item.rarity)}</div>
        <span class="skin-card-rarity">${getRarityLabel(item.rarity)}</span>
        <span class="skin-card-name">${item.skin_name}</span>
        <span class="skin-card-price">${item.price} 🪙</span>
        <button class="btn-sell" data-id="${item.id}" data-price="${item.price}">
            SELL ${item.price} 🪙
        </button>
    `;

    // Кнопка продажи
    card.querySelector(".btn-sell").addEventListener("click", async (e) => {
        e.stopPropagation();
        const itemId = parseInt(e.target.dataset.id);
        const price  = parseInt(e.target.dataset.price);
        await sellInventoryItem(itemId, price, card);
    });

    return card;
}

// Продать предмет из инвентаря
async function sellInventoryItem(itemId, price, cardEl) {
    try {
        const data = await apiPost("/api/sell_item", {
            user_id: STATE.user_id,
            item_id: itemId,
        });

        if (data.ok) {
            STATE.balance = data.new_balance;
            renderHeader();
            // Анимация удаления карточки
            cardEl.style.transition = "opacity 0.3s, transform 0.3s";
            cardEl.style.opacity    = "0";
            cardEl.style.transform  = "scale(0.8)";
            setTimeout(() => {
                cardEl.remove();
                loadInventory(); // Перезагружаем инвентарь
            }, 300);
            showToast(`✅ Продано за ${data.sold_for} 🪙`);
        } else {
            showToast("❌ Ошибка продажи");
        }
    } catch (err) {
        showToast("❌ Ошибка подключения");
    }
}

// ============================================================
// ПРОФИЛЬ
// ============================================================

// Обновляем реферальную ссылку
function updateRefLink() {
    const BOT_USERNAME = "ВАШ_USERNAME_БОТА"; // Замени на реальный username бота
    const link = `https://t.me/${BOT_USERNAME}?start=${STATE.user_id}`;
    document.getElementById("refLinkInput").value = link;
}

// Копировать реферальную ссылку
function copyRefLink() {
    const input = document.getElementById("refLinkInput");
    const text  = input.value;

    // Пробуем через Clipboard API
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            showToast("✅ Ссылка скопирована!");
        });
    } else {
        // Фоллбэк для старых браузеров
        input.select();
        document.execCommand("copy");
        showToast("✅ Ссылка скопирована!");
    }
}

// Сохранить Trade URL
async function saveTradeUrl() {
    const tradeUrl = document.getElementById("tradeUrlInput").value.trim();
    if (!tradeUrl) {
        showToast("❌ Введи Trade URL");
        return;
    }

    try {
        const data = await apiPost("/api/save_trade_url", {
            user_id: STATE.user_id,
            trade_url: tradeUrl,
        });

        if (data.ok) {
            showToast("✅ Trade URL сохранён!");
        } else {
            showToast("❌ Ошибка сохранения");
        }
    } catch (err) {
        showToast("❌ Ошибка подключения");
    }
}

// Проверить подписку на канал
async function checkSubscription() {
    const btn = document.getElementById("btnCheckSub");
    btn.disabled = true;
    btn.textContent = "...";

    try {
        const data = await apiGet(`/api/check_sub?user_id=${STATE.user_id}`);

        if (data.ok && data.subscribed) {
            STATE.balance = data.new_balance;
            renderHeader();
            showToast(`✅ Подписка подтверждена! +${data.bonus} 🪙`);
            btn.textContent = "✅ DONE";
        } else {
            showToast("❌ Ты не подписан на канал!");
            btn.disabled = false;
            btn.textContent = "CHECK";
        }
    } catch (err) {
        showToast("❌ Ошибка проверки");
        btn.disabled = false;
        btn.textContent = "CHECK";
    }
}

// ============================================================
// ПОКУПКА МОНЕТ (Telegram Stars)
// ============================================================

async function buyCoins() {
    // Показываем выбор суммы (простой алерт через Telegram)
    const tg = window.Telegram?.WebApp;

    try {
        // По умолчанию предлагаем купить 50 звёзд = 5000 монет
        const data = await apiPost("/api/create_invoice", {
            user_id: STATE.user_id,
            stars: 50,
        });

        if (data.ok && data.invoice_link) {
            // Открываем ссылку на оплату
            if (tg) {
                tg.openInvoice(data.invoice_link, (status) => {
                    if (status === "paid") {
                        showToast("✅ Оплата успешна! Монеты начислены.");
                        loadUser(); // Перезагружаем данные
                    }
                });
            } else {
                window.open(data.invoice_link, "_blank");
            }
        } else {
            showToast("❌ Ошибка создания счёта");
        }
    } catch (err) {
        showToast("❌ Ошибка подключения");
    }
}

// ============================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================

// GET запрос к API
async function apiGet(endpoint) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
    });
    return await response.json();
}

// POST запрос к API
async function apiPost(endpoint, body) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    return await response.json();
}

// Эмодзи по редкости скина
function getRarityEmoji(rarity) {
    const map = {
        common:    "🔫",
        rare:      "💎",
        epic:      "🌟",
        legendary: "👑",
    };
    return map[rarity] || "🔫";
}

// Название редкости на русском
function getRarityLabel(rarity) {
    const map = {
        common:    "Common",
        rare:      "Rare",
        epic:      "Epic",
        legendary: "Legendary",
    };
    return map[rarity] || rarity;
}

// Задержка (для анимаций)
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Показать тост-уведомление
let toastTimer = null;
function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}
