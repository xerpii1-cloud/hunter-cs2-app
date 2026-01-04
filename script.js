const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ⚠️ ТВОЯ ССЫЛКА NGROK
const API_URL = "https://bayleigh-spherelike-sharie.ngrok-free.dev";

document.body.style.backgroundColor = tg.themeParams.bg_color || "#1b1b1b";

const usernameEl = document.getElementById('username');
const balanceEl = document.getElementById('balance');

let userId = 0;

function init() {
    // --- ДИАГНОСТИКА ---
    // Выводим на экран всё, что передал Телеграм
    // Если тут будет пустые скобки {} - значит телеграм не передал данные
    try {
        alert("Данные запуска:\n" + JSON.stringify(tg.initDataUnsafe, null, 2));
    } catch (e) {
        alert("Ошибка чтения данных: " + e);
    }
    // -------------------

    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        usernameEl.innerText = user.first_name;
        userId = user.id;
    } else {
        // Если данных нет, пишем подробнее
        usernameEl.innerText = "Нет User ID";
        // Пробуем аварийный вариант (иногда помогает)
        if (tg.initData) {
            alert("Raw Data есть, но объект user не найден!");
        }
    }
}

async function claimDaily() {
    if (userId === 0) {
        alert("Ошибка: ID равен 0. Данные не загрузились.");
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
            balanceEl.innerText = result.new_balance + " 💰";
            btn.innerText = "Взято ✅";
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
            alert("Ошибка сервера: " + JSON.stringify(result));
            btn.disabled = false;
            btn.innerText = "Забрать";
        }
    } catch (error) {
        alert("Ошибка сети. Проверь ngrok.");
        btn.disabled = false;
        btn.innerText = "Забрать";
    }
}

function checkSub() {
    alert("Скоро...");
}

// Запускаем инициализацию с небольшой задержкой (страховка)
setTimeout(init, 100);