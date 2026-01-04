const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ⚠️ Вставь сюда свою ссылку из ngrok (которую скопировал выше)
// Пример: const API_URL = "https://a1b2-c3d4.ngrok-free.app";
const API_URL = "https://bayleigh-spherelike-sharie.ngrok-free.dev";

document.body.style.backgroundColor = tg.themeParams.bg_color || "#1b1b1b";

const usernameEl = document.getElementById('username');
const balanceEl = document.getElementById('balance');
let userId = 0;

function init() {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        usernameEl.innerText = user.first_name;
        userId = user.id; // Запоминаем ID, чтобы знать кому начислять
    } else {
        usernameEl.innerText = "Гость (Тест)";
        // Для теста с компьютера можешь раскомментировать строку ниже и вписать свой ID (можно узнать в @getmyid_bot)
        // userId = 123456789; 
    }
}

// Функция отправки запроса боту
async function claimDaily() {
    if (userId === 0) {
        alert("Зайдите через Телеграм!");
        return;
    }

    const btn = document.querySelector('.btn-claim');
    btn.disabled = true; // Блокируем кнопку, чтобы не жали 100 раз
    btn.innerText = "⏳...";

    try {
        // Отправляем запрос на наш сервер (туннель)
        let response = await fetch(`${API_URL}/api/claim`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: userId, amount: 100 })
        });

        let result = await response.json();

        if (result.status === 'ok') {
            balanceEl.innerText = result.new_balance + " 💰";
            alert("Успех! Монеты начислены.");
            btn.innerText = "Готово ✅";
        } else {
            alert("Ошибка сервера: " + result.error);
            btn.disabled = false;
            btn.innerText = "Забрать";
        }
    } catch (error) {
        alert("Ошибка сети! Бот не отвечает.");
        console.error(error);
        btn.disabled = false;
        btn.innerText = "Забрать";
    }
}

function checkSub() {
    alert("Проверка подписки... (Скоро)");
}

init();