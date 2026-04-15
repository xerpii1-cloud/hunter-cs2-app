// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Разворачиваем на весь экран

// Устанавливаем цвета под тему
tg.setHeaderColor('#0d131c');
tg.setBackgroundColor('#0d131c');

// Переменные
// Пока храним локально, позже свяжем с твоей базой на Python (SQLite)
let balance = parseInt(localStorage.getItem('hunter_balance') || '540'); 
const balanceAmountEl = document.getElementById('balanceAmount');
const navBalanceEl = document.getElementById('navBalance');

// Обновление цифр на экране
function updateBalanceUI() {
    balanceAmountEl.textContent = balance;
    navBalanceEl.textContent = balance;
}

// Функция выдачи награды
function addDiamonds(amount, taskId) {
    balance += amount;
    localStorage.setItem('hunter_balance', balance);
    updateBalanceUI();

    // Если передан ID задания, визуально его "выключаем"
    if (taskId) {
        const card = document.getElementById(taskId);
        if (card) {
            const btn = card.querySelector('.task-btn');
            if (btn) {
                btn.textContent = 'Выполнено';
                // Делаем кнопку неактивной в стиле нашего дизайна
                btn.style.color = '#64748b'; 
                btn.style.borderColor = '#1e293b';
                btn.disabled = true;
            }
            // Сохраняем, что задание выполнено
            localStorage.setItem(taskId, 'done');
        }
    }
}

// Проверка выполненных заданий при перезаходе
function checkCompletedTasks() {
    const tasks = ['task-subscribe'];
    tasks.forEach(taskId => {
        if (localStorage.getItem(taskId) === 'done') {
            const card = document.getElementById(taskId);
            if (card) {
                const btn = card.querySelector('.task-btn');
                if (btn) {
                    btn.textContent = 'Выполнено';
                    btn.style.color = '#64748b';
                    btn.style.borderColor = '#1e293b';
                    btn.disabled = true;
                }
            }
        }
    });
}

// Задание: Подписка
window.doSubscribe = function() {
    // Используем нативный метод Telegram для открытия ссылок
    tg.openTelegramLink('https://t.me/durov'); // Замени на свой канал!

    // Пока бэкенд не прикручен, имитируем проверку:
    // Даем награду через 3 секунды после нажатия, если еще не получали
    setTimeout(() => {
        if (localStorage.getItem('task-subscribe') !== 'done') {
            addDiamonds(500, 'task-subscribe');
            // Нативное уведомление Telegram
            tg.showAlert('Вы получили 500 💎 за подписку!'); 
        }
    }, 3000);
};

// Логика переключения нижнего меню
const navItems = document.querySelectorAll('.nav-item');

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const tabName = item.getAttribute('data-tab');

        // Если кликаем не на главную, покажем уведомление
        if (tabName !== 'earn') {
            tg.showAlert('Этот раздел еще в разработке! 🚀');
            return; // Прерываем функцию, чтобы не выделять недоделанный таб
        }

        // Убираем класс active у всех
        navItems.forEach(nav => nav.classList.remove('active'));
        // Добавляем тому, на который кликнули
        item.classList.add('active');
    });
});

// Запускаем при открытии
updateBalanceUI();
checkCompletedTasks();
