const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ⚠️ ВНИМАНИЕ: Сюда вставь актуальную ссылку из ngrok!
const API_URL = "https://bayleigh-spherelike-sharie.ngrok-free.dev";

let userId = 0;

// --- ИНИЦИАЛИЗАЦИЯ ---
async function init() {
    // Ставим "..." пока грузимся, чтобы не пугать нулем
    document.getElementById('balance').innerText = "...";

    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        userId = tg.initDataUnsafe.user.id;
        document.getElementById('username').innerText = tg.initDataUnsafe.user.first_name;
        // Загружаем данные с сервера
        loadUserData();
    } else {
        // Режим тестирования в браузере
        document.getElementById('username').innerText = "Тестер (ПК)";
        userId = 123456789;
        loadUserData();
    }
}

// Загрузка баланса
async function loadUserData() {
    try {
        let res = await fetch(`${API_URL}/api/user?user_id=${userId}`);
        let data = await res.json();

        if (data.balance !== undefined) {
            updateUI(data.balance, data.streak);
        } else {
            // Если пользователя нет в базе (первый вход)
            document.getElementById('balance').innerText = "0";
        }
    } catch (e) {
        console.error("Ошибка загрузки:", e);
        // Если ошибка сети - даем знать
        document.getElementById('balance').innerText = "Err";
    }
}

function updateUI(balance, streak) {
    document.getElementById('balance').innerText = balance;
    // Анимация изменения цифр (визуальный эффект)
    animateValue("balance", parseInt(document.getElementById('balance').innerText) || 0, balance, 1000);

    if (streak !== undefined) document.getElementById('streak-val').innerText = streak;
}

// --- ФУНКЦИИ ---

async function claimDaily() {
    let btn = document.querySelector('.btn-task');
    btn.innerText = "⏳...";
    let res = await post('/api/daily', { user_id: userId });

    if (res.status === 'ok') {
        tg.showAlert(`Награда: ${res.reward} монет! Стрик: ${res.streak} дн.`);
        updateUI(res.new_balance, res.streak);
        btn.innerText = "✅ Получено";
    } else {
        tg.showAlert(res.message);
        btn.innerText = "📅 Ежедневный бонус";
    }
}

// 🔥 ОТКРЫТИЕ КЕЙСА С АНИМАЦИЕЙ
async function openCase() {
    let btn = document.querySelector('.btn-open');
    let winScreen = document.getElementById('win-screen');
    let caseImg = document.querySelector('.case-img');

    btn.disabled = true;
    btn.innerText = "ОТКРЫВАЕМ...";
    winScreen.style.display = 'none'; // Скрываем прошлый приз

    // 1. Делаем запрос к серверу (узнаем результат заранее)
    let res = await post('/api/open_case', { user_id: userId });

    if (res.status === 'ok') {
        // 2. АНИМАЦИЯ (Трясем кейс)
        caseImg.style.transform = "scale(1.1) rotate(5deg)";
        setTimeout(() => caseImg.style.transform = "scale(1.1) rotate(-5deg)", 100);
        setTimeout(() => caseImg.style.transform = "scale(1.1) rotate(5deg)", 200);
        setTimeout(() => caseImg.style.transform = "scale(1)", 300);

        // Ждем 1 секунду для напряжения...
        setTimeout(() => {
            // 3. Показываем результат
            updateUI(res.new_balance);

            winScreen.style.display = 'block';
            document.getElementById('win-name').innerText = res.skin;
            document.getElementById('win-rarity').innerText = res.rarity;
            document.getElementById('win-img').src = res.image;

            // Цвет редкости
            let color = "#ccc";
            if (res.rarity === 'Covert') color = "#eb4b4b"; // Красный
            if (res.rarity === 'Classified') color = "#d32ce6"; // Розовый
            if (res.rarity === 'Restricted') color = "#8847ff"; // Фиолетовый
            if (res.rarity === 'Gold') color = "#ffd700"; // Золото
            document.getElementById('win-rarity').style.color = color;
            document.getElementById('win-name').style.color = color;

            btn.disabled = false;
            btn.innerText = "ОТКРЫТЬ ЕЩЕ (500 💰)";

            // Вибрация успеха
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

        }, 1000); // <-- Задержка анимации

    } else if (res.status === 'no_money') {
        tg.showAlert("Не хватает денег! Нужно 500 монет.");
        btn.disabled = false;
        btn.innerText = "ОТКРЫТЬ";
    } else {
        tg.showAlert("Ошибка: " + JSON.stringify(res));
        btn.disabled = false;
        btn.innerText = "ОТКРЫТЬ";
    }
}

// Инвентарь
async function loadInventory() {
    let grid = document.getElementById('inventory-grid');
    grid.innerHTML = "<div style='color:#777; grid-column:span 2;'>Загрузка...</div>";

    let res = await fetch(`${API_URL}/api/inventory?user_id=${userId}`);
    let data = await res.json();

    grid.innerHTML = "";

    if (data.items.length === 0) {
        grid.innerHTML = "<div style='color:#777; grid-column:span 2;'>Пусто ☹️</div>";
        return;
    }

    data.items.forEach(item => {
        let div = document.createElement('div');
        div.className = 'inv-item';
        div.innerHTML = `
            <img src="${item.image}">
            <div class="inv-name">${item.name}</div>
            <div class="inv-price">${item.price} 💰</div>
            <button class="inv-btn-sell" onclick="sellItem(${item.id})">ПРОДАТЬ</button>
        `;
        grid.appendChild(div);
    });
}

async function sellItem(itemId) {
    if (!confirm("Точно продать этот скин?")) return;

    let res = await post('/api/sell', { user_id: userId, item_id: itemId });
    if (res.status === 'ok') {
        updateUI(res.new_balance);
        loadInventory(); // Обновляем список
        tg.showAlert(`Продано за ${res.price} монет!`);
    }
}

// --- УТИЛИТЫ ---
async function post(url, data) {
    try {
        let req = await fetch(`${API_URL}${url}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await req.json();
    } catch (e) { return { error: "Network error" }; }
}

function switchTab(tabName) {
    // Переключение вкладок
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');

    // Подсветка кнопок
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    // Тут можно добавить логику подсветки активной кнопки, если добавить им ID

    if (tabName === 'inv') loadInventory();
}

// Простая анимация чисел (чтобы баланс красиво крутился)
function animateValue(id, start, end, duration) {
    if (start === end) return;
    let range = end - start;
    let current = start;
    let increment = end > start ? 10 : -10;
    let stepTime = Math.abs(Math.floor(duration / (range / increment)));
    if (stepTime < 10) stepTime = 10;

    let obj = document.getElementById(id);
    let timer = setInterval(function () {
        current += increment;
        if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
            current = end;
            clearInterval(timer);
        }
        obj.innerHTML = current;
    }, stepTime);
}

// Запуск (с задержкой для надежности)
setTimeout(init, 100);