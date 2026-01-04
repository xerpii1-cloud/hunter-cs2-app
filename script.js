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
    // С новой кнопкой данные должны приходить корректно
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        usernameEl.innerText = user.first_name;
        userId = user.id;
    } else {
        usernameEl.innerText = "Играй с телефона";
    }
}

async function claimDaily() {
    // Если ID всё еще 0, просим перезайти
    if (userId === 0) {
        tg.showAlert("Ошибка: Данные не загрузились. Перезапустите бота командой /start");
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
            // Вибрация при успехе
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
            tg.showAlert("Ошибка сервера: " + JSON.stringify(result));
            btn.disabled = false;
            btn.innerText = "Забрать";
        }
    } catch (error) {
        tg.showAlert("Ошибка сети. Проверь, запущен ли ngrok на компьютере.");
        btn.disabled = false;
        btn.innerText = "Забрать";
    }
}

function checkSub() {
    tg.showAlert("Эта функция скоро появится!");
}

// Запускаем
init();