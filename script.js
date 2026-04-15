// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Разворачиваем на весь экран

// Получаем данные пользователя из Telegram
const user = tg.initDataUnsafe?.user;
if (user) {
    document.getElementById('userName').textContent = user.first_name || 'Player';
}

// Баланс (пока храним локально, потом подключим к боту)
let balance = parseInt(localStorage.getItem('balance') || '0');
updateBalanceUI();

function updateBalanceUI() {
    document.getElementById('balanceAmount').textContent = balance;
}

function addCoins(amount, taskId) {
    balance += amount;
    localStorage.setItem('balance', balance);
    updateBalanceUI();

    // Помечаем задание как выполненное
    const card = document.getElementById(taskId);
    const btn = card.querySelector('.task-btn');
    card.classList.add('done');
    btn.textContent = '✓ Done';
    btn.disabled = true;

    // Сохраняем выполненные задания
    localStorage.setItem(taskId, 'done');
}

// Проверяем выполненные задания при загрузке
window.onload = function () {
    ['task-subscribe', 'task-daily', 'task-reaction'].forEach(taskId => {
        if (localStorage.getItem(taskId) === 'done') {
            const card = document.getElementById(taskId);
            const btn = card.querySelector('.task-btn');
            card.classList.add('done');
            btn.textContent = '✓ Done';
            btn.disabled = true;
        }
    });
}

// Задание 1: Подписка на канал
function doSubscribe() {
    // Открываем канал
    window.open('https://t.me/your_channel', '_blank');
    // Через 3 секунды считаем выполненным
    setTimeout(() => {
        addCoins(500, 'task-subscribe');
    }, 3000);
}

// Задание 2: Ежедневный бонус
function doDaily() {
    const lastDaily = localStorage.getItem('lastDaily');
    const now = new Date().getTime();
    const oneDay = 24 * 60 * 60 * 1000;

    if (lastDaily && (now - parseInt(lastDaily)) < oneDay) {
        alert('Come back tomorrow for your daily bonus!');
        return;
    }

    localStorage.setItem('lastDaily', now);
    addCoins(100, 'task-daily');
}

// Задание 3: Реакция
function doReaction() {
    addCoins(50, 'task-reaction');
}
