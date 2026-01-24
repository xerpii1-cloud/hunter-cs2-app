const tg = window.Telegram.WebApp;
tg.expand();

// --- НАСТРОЙКИ ---
// ВСТАВЬ СЮДА СВОЮ ССЫЛКУ NGROK (Обязательно /api в конце)
const API_URL = 'https://bayleigh-spherelike-sharie.ngrok-free.dev/api'; 
const userId = tg.initDataUnsafe?.user?.id || 123456789;

// --- 1. ЗАГРУЗКА ПРИ СТАРТЕ ---
document.addEventListener('DOMContentLoaded', () => {
    // Сразу ставим "Загрузка...", чтобы не пугать нулем
    document.getElementById('balance').innerText = '...';
    loadUser();
});

async function loadUser() {
    try {
        let response = await fetch(`${API_URL}/get_user`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });
        
        if (!response.ok) throw new Error("Ошибка сети");

        let data = await response.json();
        updateUI(data.balance, tg.initDataUnsafe?.user?.first_name, data.level);
    } catch (e) {
        console.error("Ошибка API:", e);
        document.getElementById('username').innerText = "Connection Error";
    }
}

function updateUI(balance, name, level) {
    document.getElementById('balance').innerText = balance;
    // Если есть данные из телеграма - ставим их, иначе то, что пришло с бека (или заглушку)
    const realName = tg.initDataUnsafe?.user?.first_name || name || "Gamer";
    document.getElementById('username').innerText = realName;
    document.getElementById('level-text').innerText = `Lvl ${level}`;
}

// --- 2. ЛОГИКА РУЛЕТКИ (Адаптировано под новый дизайн) ---
const btnOpen = document.getElementById('btn-open');
const rouletteWrapper = document.getElementById('roulette-wrapper');
const rouletteTrack = document.getElementById('roulette-track');

btnOpen.addEventListener('click', async () => {
    btnOpen.disabled = true;
    btnOpen.innerText = "⏳ ОТКРЫВАЕМ..."; // Визуальный отклик
    
    try {
        let response = await fetch(`${API_URL}/open_case`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });

        let result = await response.json();

        if (result.status === 'error') {
            alert(result.message);
            btnOpen.disabled = false;
            btnOpen.innerText = "ОТКРЫТЬ ЗА 500 💰";
            return;
        }

        // Запуск анимации
        startRoulette(result.drop, result.new_balance);

    } catch (e) {
        console.error(e);
        alert("Ошибка связи с сервером.");
        btnOpen.disabled = false;
        btnOpen.innerText = "ОТКРЫТЬ ЗА 500 💰";
    }
});

function startRoulette(winningItem, newBalance) {
    // 1. Показываем контейнер рулетки
    rouletteWrapper.style.display = 'block';
    
    // 2. Очищаем и сбрасываем трек
    rouletteTrack.innerHTML = '';
    rouletteTrack.style.transition = 'none';
    rouletteTrack.style.transform = 'translateX(0px)';

    const cardWidth = 118; // 110px ширина + 8px отступы (margin 0 4px)
    const winningIndex = 30; // Индекс победителя
    const totalCards = 35; 

    // 3. Генерируем ленту
    for (let i = 0; i < totalCards; i++) {
        let item = (i === winningIndex) ? winningItem : getRandomFiller();
        let card = createCard(item);
        rouletteTrack.appendChild(card);
    }

    // 4. Запускаем вращение (через 50мс, чтобы браузер успел отрисовать DOM)
    setTimeout(() => {
        // Ширина видимой области рулетки
        const containerWidth = rouletteWrapper.offsetWidth;
        
        // Вычисляем центр победителя
        // (winningIndex * cardWidth) -> начало карточки
        // + (cardWidth / 2) -> центр карточки
        // - (containerWidth / 2) -> сдвигаем так, чтобы этот центр был по центру экрана
        const scrollPosition = (winningIndex * cardWidth) + (cardWidth / 2) - (containerWidth / 2);
        
        // Добавляем рандом, чтобы останавливалось не идеально по центру (живее)
        const randomOffset = Math.floor(Math.random() * 20) - 10; 

        rouletteTrack.style.transition = 'transform 5s cubic-bezier(0.15, 0.9, 0.3, 1)'; 
        rouletteTrack.style.transform = `translateX(-${scrollPosition + randomOffset}px)`;
    }, 50);

    // 5. Финиш
    setTimeout(() => {
        showWinModal(winningItem);
        document.getElementById('balance').innerText = newBalance;
        btnOpen.disabled = false;
        btnOpen.innerText = "ОТКРЫТЬ ЗА 500 💰";
        
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }, 5100);
}

// Создание HTML карточки для рулетки
function createCard(item) {
    const div = document.createElement('div');
    div.className = `card-item r-${item.rarity}`; // r-rarity для цвета полоски
    // Важно: путь assets/...
    div.innerHTML = `<img src="assets/${item.img}" alt="skin">`; 
    return div;
}

// Фейковые предметы для массовки
function getRandomFiller() {
    const fillers = [
        { img: 'skins/p250_sand.png', rarity: 'common' },
        { img: 'skins/m4a4_neo.png', rarity: 'rare' },
        { img: 'skins/ak47_redline.png', rarity: 'epic' }
    ];
    return fillers[Math.floor(Math.random() * fillers.length)];
}

// --- 3. ВКЛАДКИ (TABS) ---
window.switchTab = function(tabName, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tabName}`).classList.add('active');
    btn.classList.add('active');

    if (tabName === 'inventory') {
        loadInventory();
    }
}

// --- 4. ИНВЕНТАРЬ ---
async function loadInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '<p style="color:#666; width:100%; text-align:center;">Loading...</p>';
    
    try {
        let response = await fetch(`${API_URL}/get_inventory`, {
            method: 'POST', body: JSON.stringify({ user_id: userId })
        });
        let data = await response.json();
        renderInventory(data.items);
    } catch (e) {
        grid.innerHTML = '<p>Ошибка загрузки</p>';
    }
}

function renderInventory(items) {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    
    if (items.length === 0) {
        grid.innerHTML = '<p style="width:100%; text-align:center; margin-top:20px;">Инвентарь пуст 🕸️</p>';
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'inv-card';
        let shortName = item.name.split('|')[0];
        
        div.innerHTML = `
            <img src="assets/${item.img}">
            <div style="font-size:10px; margin-top:5px; color:#aaa;">${shortName}</div>
            <div class="inv-price">${item.price} 💰</div>
            <button class="btn-sell-sm" onclick="sellItem(${item.id}, this)">SELL</button>
        `;
        grid.appendChild(div);
    });
}

window.sellItem = async function(itemId, btnElement) {
    btnElement.disabled = true;
    btnElement.innerText = '...';

    try {
        let response = await fetch(`${API_URL}/sell_item`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, item_id: itemId })
        });
        let data = await response.json();

        if (data.status === 'success') {
            document.getElementById('balance').innerText = data.new_balance;
            btnElement.parentElement.remove(); // Удаляем карточку
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
            alert("Ошибка продажи");
            btnElement.disabled = false;
        }
    } catch (e) {
        console.error(e);
        btnElement.innerText = 'Err';
    }
}

// --- 5. МОДАЛКИ И ПОКУПКА ---
const modalDrop = document.getElementById('modal-drop');

window.closeModal = function() {
    modalDrop.style.display = 'none';
    rouletteWrapper.style.display = 'none'; // Скрываем рулетку после закрытия
}

function showWinModal(item) {
    document.getElementById('drop-name').innerText = item.name;
    document.getElementById('drop-title').innerText = item.rarity.toUpperCase();
    document.getElementById('drop-img').src = `assets/${item.img}`;
    
    const colors = { common: '#b0c3d9', rare: '#4b69ff', epic: '#8847ff', legendary: '#eb4b4b' };
    document.getElementById('drop-title').style.color = colors[item.rarity];

    modalDrop.style.display = 'flex';
}

document.getElementById('btn-add-funds').addEventListener('click', async () => {
    if (!confirm("Купить 5000 монет за 50 Звезд ⭐?")) return;
    try {
        let response = await fetch(`${API_URL}/create_invoice`, {
            method: 'POST', body: JSON.stringify({ stars: 50 })
        });
        let data = await response.json();
        if (data.link) tg.openInvoice(data.link, (status) => {
             if (status === 'paid') {
                 tg.close();
                 setTimeout(loadUser, 2000);
             }
        });
    } catch (e) { alert("Ошибка сети"); }
});