// Инициализация Telegram WebApp
const tg = window.Telegram.WebApp;

// Сообщаем телеграму, что приложение готово
tg.ready();

// Расширяем на весь экран
tg.expand();

// Основные цвета телеграма (чтобы приложение выглядело нативно)
document.body.style.backgroundColor = tg.themeParams.bg_color || "#1b1b1b";

// --- Элементы HTML ---
const usernameEl = document.getElementById('username');
const balanceEl = document.getElementById('balance');

// --- Переменные (Пока храним в памяти, позже подключим базу данных) ---
let balance = 0;

// --- Старт приложения ---
function init() {
    // Получаем имя пользователя из данных Телеграма
    // Если мы открыли в браузере (не в тг), user будет undefined
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        usernameEl.innerText = tg.initDataUnsafe.user.first_name;
    } else {
        usernameEl.innerText = "Гость (Тест)";
    }
}

// --- Логика кнопок ---
function claimDaily() {
    alert("Ежедневный бонус получен! +100");
    // Тут позже отправим запрос боту, чтобы начислил деньги в базу
    updateBalance(100);
}

function checkSub() {
    // Временная заглушка
    alert("Проверка подписки... (Пока не работает)");
}

function updateBalance(amount) {
    balance += amount;
    balanceEl.innerText = balance + " 💰";
}

// Запускаем
init();