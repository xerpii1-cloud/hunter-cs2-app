const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// --- ВНИМАНИЕ: СЮДА ВСТАВЬ НОВУЮ ССЫЛКУ ОТ NGROK ---
const API_URL = "https://bayleigh-spherelike-sharie.ngrok-free.dev";
// (Убедись, что ссылка точная, без пробелов в конце)

document.body.style.backgroundColor = tg.themeParams.bg_color || "#1b1b1b";

const usernameEl = document.getElementById('username');
const balanceEl = document.getElementById('balance');

// --- ГРЯЗНЫЙ ХАК: ПРИНУДИТЕЛЬНО СТАВИМ ID ---
// Мы ставим случайный ID, чтобы кнопка просто заработала
let userId = 555555;

function init() {
    // Пытаемся получить реальное имя, но если нет — ставим "Тестер"
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        const user = tg.initDataUnsafe.user;
        usernameEl.innerText = user.first_name;
        userId = user.id; // Если телеграм сработал, берем реальный ID
    } else {
        usernameEl.innerText = "Super Tester";
        // ID остается 555555, блокировки больше нет
    }
}

async function claimDaily() {
    const btn = document.querySelector('.btn-claim');
    btn.disabled = true;
    btn.innerText = "Отправка...";

    try {
        // Отправляем запрос на сервер
        let response = await fetch(`${API_URL}/api/claim`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, amount: 100 })
        });

        let result = await response.json();

        if (result.status === 'ok') {
            balanceEl.innerText = result.new_balance + " 💰";
            alert(`УРА! Сервер ответил.\nБаланс обновлен: ${result.new_balance}`);
            btn.innerText = "Готово ✅";
        } else {
            alert("Ошибка от сервера: " + JSON.stringify(result));
            btn.disabled = false;
            btn.innerText = "Забрать";
        }
    } catch (error) {
        alert("ОШИБКА СЕТИ!\nПроверь, работает ли ngrok (черное окно).\n" + error);
        btn.disabled = false;
        btn.innerText = "Забрать";
    }
}

function checkSub() {
    alert("Эта кнопка пока не работает, жми верхнюю!");
}

init();