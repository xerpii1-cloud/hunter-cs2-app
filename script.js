const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ⚠️ ТВОЯ ССЫЛКА (проверь, чтобы была точная)
const API_URL = "https://bayleigh-spherelike-sharie.ngrok-free.dev";

document.body.style.backgroundColor = tg.themeParams.bg_color || "#1b1b1b";

const usernameEl = document.getElementById('username');
const balanceEl = document.getElementById('balance');

// Переменная для ID
let userId = 0;

function init() {
    // Теперь берем ТОЛЬКО реальные данные из Телеграма
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        usernameEl.innerText = user.first_name; // Твое имя
        userId = user.id; // Твой ID
    } else {
        // Если открыли не в ТГ
        usernameEl.innerText = "Зайдите с телефона";
    }
}

async function claimDaily() {
    if (userId === 0) {
        alert("Ошибка: Не могу получить ваш ID. Перезапустите бота.");
        return;
    }

    const btn = document.querySelector('.btn-claim');
    btn.disabled = true;
    btn.innerText = "⏳...";

    try {
        let response = await fetch(`${API_URL}/api/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, amount: 100 })
        });

        let result = await response.json();

        if (result.status === 'ok') {
            // Обновляем цифру на экране
            balanceEl.innerText = result.new_balance + " 💰";
            btn.innerText = "Взято ✅";

            // Вибрация телефона для кайфа (работает на телефонах)
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
            alert("Ошибка: " + JSON.stringify(result));
            btn.disabled = false;
            btn.innerText = "Забрать";
        }
    } catch (error) {
        alert("Ошибка сети. Бот запущен?");
        btn.disabled = false;
        btn.innerText = "Забрать";
    }
}

function checkSub() {
    alert("Скоро...");
}

init();