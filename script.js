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
    // Теперь, с новой кнопкой, это должно сработать
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        usernameEl.innerText = user.first_name;
        userId = user.id;
    } else {
        usernameEl.innerText = "Играй с телефона";
    }
}

async function claimDaily() {
    if (userId === 0) {
        alert("Ошибка доступа. Перезапусти бота через /start");
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
            alert("Ошибка: " + JSON.stringify(result));
            btn.disabled = false;
            btn.innerText = "Забрать";
        }
    } catch (error) {
        alert("Ошибка сети. Сервер не отвечает.");
        btn.disabled = false;
        btn.innerText = "Забрать";
    }
}

function checkSub() {
    alert("Скоро...");
}

// Небольшая задержка, чтобы Телеграм успел подумать
setTimeout(init, 50);