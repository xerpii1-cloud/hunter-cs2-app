const tg = window.Telegram.WebApp;
tg.expand();

// Настройка цветов темы Telegram
document.body.style.backgroundColor = tg.themeParams.bg_color || '#1b1b1b';

const API_URL = ""; // Пустой, так как хостим на том же домене
let user = null;

// Инициализация
async function init() {
    if (!tg.initDataUnsafe.user) {
        alert("Запустите через Telegram!");
        return;
    }

    const userId = tg.initDataUnsafe.user.id;

    // Получение данных пользователя
    const response = await fetch(`${API_URL}/api/user?user_id=${userId}`);
    const data = await response.json();

    if (data.status === 'ok') {
        user = data.user;
        updateUI(user, data.inventory);
    }
}

function updateUI(userData, inventory) {
    document.getElementById('username').innerText = tg.initDataUnsafe.user.username;
    document.getElementById('balance').innerText = userData.balance;

    if (userData.is_vip) {
        document.getElementById('vip-badge').classList.remove('hidden');
    }

    // Рендер инвентаря
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    inventory.forEach(item => {
        const div = document.createElement('div');
        div.className = `inv-item rarity-${item.rarity}`;
        div.innerHTML = `
            <img src="assets/${item.image}" style="width:50px">
            <div style="font-size:12px">${item.skin_name}</div>
            <div style="font-size:10px; color:#aaa">${item.price}💰</div>
        `;
        grid.appendChild(div);
    });
}

// Навигация
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('section').forEach(s => s.classList.add('hidden-section'));
        document.querySelectorAll('section').forEach(s => s.classList.remove('active-section'));

        e.target.classList.add('active');
        document.getElementById(e.target.dataset.target).classList.remove('hidden-section');
        document.getElementById(e.target.dataset.target).classList.add('active-section');

        tg.HapticFeedback.impactOccurred('light');
    });
});

// Открытие кейса
document.getElementById('open-btn').addEventListener('click', async () => {
    const btn = document.getElementById('open-btn');
    const caseImg = document.getElementById('case-img');
    const roulette = document.getElementById('roulette-window');
    const userId = tg.initDataUnsafe.user.id;

    if (user.balance < 500) {
        tg.showAlert("Not enough money!");
        return;
    }

    // Блокируем кнопку
    btn.disabled = true;

    // Анимация тряски
    caseImg.classList.add('shake');
    tg.HapticFeedback.notificationOccurred('warning'); // Вибрация начала

    // Запрос к API (пока кейс трясется)
    const res = await fetch(`${API_URL}/api/open_case`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId })
    });
    const data = await res.json();

    if (data.status !== 'ok') {
        alert(data.message);
        caseImg.classList.remove('shake');
        btn.disabled = false;
        return;
    }

    // Подготовка рулетки
    setTimeout(() => {
        caseImg.classList.remove('shake');
        caseImg.style.display = 'none'; // Скрываем кейс
        roulette.style.display = 'block'; // Показываем рулетку

        startSpin(data.item, data.new_balance);
    }, 1000);
});

function startSpin(targetItem, newBalance) {
    const track = document.getElementById('items-track');
    track.innerHTML = '';

    // Генерируем "фейковые" предметы для прокрутки
    const items = [];
    for (let i = 0; i < 30; i++) {
        items.push({ name: "???", image: "p250_sand.png", rarity: "common" }); // Заглушки
    }
    // Вставляем целевой предмет (например, на 25-ю позицию)
    items[25] = targetItem;

    // Рендер ленты
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = `roulette-item rarity-${item.rarity}`;
        div.innerHTML = `<img src="assets/${item.image}">`; // В реальности нужны полные пути
        track.appendChild(div);
    });

    // Расчет смещения
    // Ширина предмета 100px. Мы хотим, чтобы 25-й предмет встал по центру.
    // Центр экрана (offset) уже учтен в CSS (left: 50%). Нам нужно сдвинуть ленту влево.
    // Сдвиг = (25 * 100) + (половина ширины предмета 50)
    const cardWidth = 100;
    const targetIndex = 25;
    const randomOffset = Math.floor(Math.random() * 80) - 40; // Немного рандома внутри карточки
    const translate = -(targetIndex * cardWidth + 50) + randomOffset;

    // Запуск анимации CSS
    track.style.transition = "transform 4s cubic-bezier(0.1, 1, 0.1, 1)"; // Эффект замедления
    track.style.transform = `translateX(${translate}px)`;

    // Вибрация во время прокрутки (имитация стука)
    let ticks = 0;
    const tickInterval = setInterval(() => {
        ticks++;
        if (ticks > 15) clearInterval(tickInterval);
        tg.HapticFeedback.selectionChanged();
    }, 200);

    // Завершение
    setTimeout(() => {
        showDrop(targetItem);
        user.balance = newBalance;
        document.getElementById('balance').innerText = user.balance;
    }, 4500);
}

function showDrop(item) {
    const modal = document.getElementById('drop-modal');
    document.getElementById('drop-img').src = `assets/${item.image}`;
    document.getElementById('drop-name').innerText = item.name;
    document.getElementById('drop-name').className = `rarity-${item.rarity}`;

    modal.classList.remove('hidden');
    tg.HapticFeedback.notificationOccurred('success'); // Сильная вибрация успеха

    // Эффект свечения в зависимости от редкости
    // Реализовано в CSS через классы
}

function closeModal() {
    document.getElementById('drop-modal').classList.add('hidden');
    // Сброс состояния для нового открытия
    document.getElementById('roulette-window').style.display = 'none';
    document.getElementById('case-img').style.display = 'block';
    document.getElementById('items-track').style.transition = 'none';
    document.getElementById('items-track').style.transform = 'translateX(0)';
    document.getElementById('open-btn').disabled = false;

    init(); // Обновляем инвентарь
}

async function buyItem(type) {
    const userId = tg.initDataUnsafe.user.id;
    const res = await fetch(`${API_URL}/api/create_invoice`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId, type: type })
    });
    const data = await res.json();
    if (data.status === 'ok') {
        tg.openInvoice(data.link, (status) => {
            if (status === 'paid') {
                tg.showAlert("Payment Successful!");
                init();
            }
        });
    }
}

// Запуск
init();