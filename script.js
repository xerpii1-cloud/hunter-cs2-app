const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ⚠️ ВСТАВЬ СЮДА ССЫЛКУ NGROK!
const API_URL = "https://bayleigh-spherelike-sharie.ngrok-free.dev";

let userId = 0;

// --- ИНИЦИАЛИЗАЦИЯ ---
async function init() {
    if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
        userId = tg.initDataUnsafe.user.id;
        document.getElementById('username').innerText = tg.initDataUnsafe.user.first_name;

        // ГЛАВНОЕ: Загружаем реальный баланс из базы!
        loadUserData();
    } else {
        document.getElementById('username').innerText = "Тест (ID 123)";
        userId = 123456789; // Тестовый ID
        loadUserData();
    }
}

// Загрузка данных (Фикс сброса баланса)
async function loadUserData() {
    try {
        let res = await fetch(`${API_URL}/api/user?user_id=${userId}`);
        let data = await res.json();
        if (data.balance !== undefined) {
            updateUI(data.balance, data.streak);
        }
    } catch (e) { console.error(e); }
}

function updateUI(balance, streak) {
    document.getElementById('balance').innerText = balance;
    if (streak !== undefined) document.getElementById('streak-val').innerText = streak;
}

// --- ФУНКЦИИ ---

async function claimDaily() {
    let res = await post('/api/daily', { user_id: userId });
    if (res.status === 'ok') {
        alert(`Награда: ${res.reward} монет! Стрик: ${res.streak}`);
        updateUI(res.new_balance, res.streak);
    } else {
        alert(res.message);
    }
}

async function usePromo() {
    let code = document.getElementById('promo-input').value;
    let res = await post('/api/promo', { user_id: userId, code: code });
    if (res.status === 'ok') {
        alert(`Промокод активирован! +${res.amount}`);
        updateUI(res.new_balance);
    } else { alert("Ошибка кода"); }
}

async function openCase() {
    let btn = document.querySelector('.btn-open');
    btn.disabled = true; btn.innerText = "Krutim...";

    let res = await post('/api/open_case', { user_id: userId });
    if (res.status === 'ok') {
        updateUI(res.new_balance);
        // Анимация
        document.getElementById('win-screen').style.display = 'block';
        document.getElementById('win-name').innerText = res.skin;
        document.getElementById('win-rarity').innerText = res.rarity;
        document.getElementById('win-img').src = res.image;
    } else if (res.status === 'no_money') {
        alert("Не хватает денег (нужно 500)");
    }
    btn.disabled = false; btn.innerText = "ОТКРЫТЬ";
}

// Инвентарь
async function loadInventory() {
    let res = await fetch(`${API_URL}/api/inventory?user_id=${userId}`);
    let data = await res.json();
    let grid = document.getElementById('inventory-grid');
    grid.innerHTML = "";

    data.items.forEach(item => {
        let div = document.createElement('div');
        div.className = 'inv-item';
        div.innerHTML = `
            <img src="${item.image}" width="60">
            <div class="inv-name">${item.name}</div>
            <div class="inv-price">${item.price} 💰</div>
            <button onclick="sellItem(${item.id})">Продать</button>
            <button onclick="alert('Заявка на вывод создана!')">Steam</button>
        `;
        grid.appendChild(div);
    });
}

async function sellItem(itemId) {
    if (!confirm("Продать скин за полцены?")) return;
    let res = await post('/api/sell', { user_id: userId, item_id: itemId });
    if (res.status === 'ok') {
        updateUI(res.new_balance);
        loadInventory(); // Обновить список
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
    } catch (e) { alert("Ошибка сети"); return {}; }
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    if (tabName === 'inv') loadInventory();
}

init();