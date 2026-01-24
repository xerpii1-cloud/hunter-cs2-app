const tg = window.Telegram.WebApp;
tg.expand();

// --- НАСТРОЙКИ ---
// ВСТАВЬ СЮДА СВОЮ ССЫЛКУ NGROK (Обязательно /api в конце)
const API_URL = 'https://bayleigh-spherelike-sharie.ngrok-free.dev/api'; 
const userId = tg.initDataUnsafe?.user?.id || 123456789;

// --- 1. ЗАГРУЗКА ПРИ СТАРТЕ ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('balance').innerText = '...';
    loadUser();
});

async function loadUser() {
    try {
        let response = await fetch(`${API_URL}/get_user`, {
            method: 'POST', body: JSON.stringify({ user_id: userId })
        });
        
        if (!response.ok) throw new Error("Ошибка сети");

        let data = await response.json();
        updateUI(data.balance, tg.initDataUnsafe?.user?.first_name, data.level);
        
        // Инициализируем ссылки профиля
        initProfile(data.user_id);
        
    } catch (e) {
        console.error("Ошибка API:", e);
        document.getElementById('username').innerText = "Connection Error";
    }
}

function updateUI(balance, name, level) {
    document.getElementById('balance').innerText = balance;
    const realName = tg.initDataUnsafe?.user?.first_name || name || "Gamer";
    document.getElementById('username').innerText = realName;
    document.getElementById('level-text').innerText = `Lvl ${level}`;
}

// --- 2. РУЛЕТКА ---
const btnOpen = document.getElementById('btn-open');
const rouletteWrapper = document.getElementById('roulette-wrapper');
const rouletteTrack = document.getElementById('roulette-track');

btnOpen.addEventListener('click', async () => {
    btnOpen.disabled = true;
    btnOpen.innerText = "⏳ ..."; 
    
    try {
        let response = await fetch(`${API_URL}/open_case`, {
            method: 'POST', body: JSON.stringify({ user_id: userId })
        });
        let result = await response.json();

        if (result.status === 'error') {
            alert(result.message);
            btnOpen.disabled = false;
            btnOpen.innerText = "ОТКРЫТЬ ЗА 500 💰";
            return;
        }
        startRoulette(result.drop, result.new_balance);

    } catch (e) {
        alert("Ошибка связи с сервером.");
        btnOpen.disabled = false;
        btnOpen.innerText = "ОТКРЫТЬ ЗА 500 💰";
    }
});

function startRoulette(winningItem, newBalance) {
    rouletteWrapper.style.display = 'block';
    rouletteTrack.innerHTML = '';
    rouletteTrack.style.transition = 'none';
    rouletteTrack.style.transform = 'translateX(0px)';

    const cardWidth = 118; 
    const winningIndex = 30; 
    const totalCards = 35; 

    for (let i = 0; i < totalCards; i++) {
        let item = (i === winningIndex) ? winningItem : getRandomFiller();
        let card = createCard(item);
        rouletteTrack.appendChild(card);
    }

    setTimeout(() => {
        const containerWidth = rouletteWrapper.offsetWidth;
        const scrollPosition = (winningIndex * cardWidth) + (cardWidth / 2) - (containerWidth / 2);
        const randomOffset = Math.floor(Math.random() * 20) - 10; 

        rouletteTrack.style.transition = 'transform 5s cubic-bezier(0.15, 0.9, 0.3, 1)'; 
        rouletteTrack.style.transform = `translateX(-${scrollPosition + randomOffset}px)`;
    }, 50);

    setTimeout(() => {
        showWinModal(winningItem);
        document.getElementById('balance').innerText = newBalance;
        btnOpen.disabled = false;
        btnOpen.innerText = "ОТКРЫТЬ ЗА 500 💰";
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }, 5100);
}

function createCard(item) {
    const div = document.createElement('div');
    div.className = `card-item r-${item.rarity}`;
    div.innerHTML = `<img src="assets/${item.img}" alt="skin">`; 
    return div;
}

function getRandomFiller() {
    const fillers = [
        { img: 'skins/p250_sand.png', rarity: 'common' },
        { img: 'skins/m4a4_neo.png', rarity: 'rare' },
        { img: 'skins/ak47_redline.png', rarity: 'epic' }
    ];
    return fillers[Math.floor(Math.random() * fillers.length)];
}

// --- 3. ВКЛАДКИ ---
window.switchTab = function(tabName, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
    btn.classList.add('active');

    if (tabName === 'inventory') loadInventory();
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
    const totalValEl = document.getElementById('inv-total-value');
    grid.innerHTML = '';
    
    if (items.length === 0) {
        grid.innerHTML = '<p style="width:100%; text-align:center; margin-top:20px; color:#555">Пусто 🕸️</p>';
        totalValEl.innerText = "Стоимость: 0 💰";
        return;
    }

    let totalVal = 0;
    items.forEach(item => {
        totalVal += item.price;
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
    totalValEl.innerText = `Стоимость: ${totalVal} 💰`;
}

window.sellItem = async function(itemId, btnElement) {
    btnElement.disabled = true;
    btnElement.innerText = '...';

    try {
        let response = await fetch(`${API_URL}/sell_item`, {
            method: 'POST', body: JSON.stringify({ user_id: userId, item_id: itemId })
        });
        let data = await response.json();

        if (data.status === 'success') {
            document.getElementById('balance').innerText = data.new_balance;
            btnElement.parentElement.remove(); 
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
            alert("Ошибка продажи");
            btnElement.disabled = false;
        }
    } catch (e) {
        btnElement.innerText = 'Err';
    }
}

// --- 5. ПРОФИЛЬ И ЗАДАНИЯ ---
function initProfile(uid) {
    // Генерируем реф. ссылку
    const refUrl = `https://t.me/hunter_cs2_bot?start=${uid}`;
    document.getElementById('ref-link').value = refUrl;
    
    // Ссылка на канал (Вставь свою!)
    document.getElementById('btn-sub-link').href = "https://t.me/huntercs2bot"; 
}

window.copyRef = function() {
    const copyText = document.getElementById("ref-link");
    copyText.select();
    document.execCommand("copy");
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('selection');
    alert("Ссылка скопирована!");
}

window.checkSub = async function(btn) {
    btn.disabled = true;
    btn.innerText = "⏳";
    
    try {
        let response = await fetch(`${API_URL}/check_sub`, {
            method: 'POST', body: JSON.stringify({ user_id: userId })
        });
        let data = await response.json();
        
        if (data.status === 'success') {
            document.getElementById('balance').innerText = data.new_balance;
            btn.innerText = "✅";
            btn.style.background = "#4CAF50";
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
            alert(data.message);
            btn.innerText = "CHECK";
            btn.disabled = false;
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('error');
        }
    } catch (e) {
        btn.innerText = "ERR";
    }
}

// --- 6. МОДАЛКИ И ПОКУПКА ---
const modalDrop = document.getElementById('modal-drop');

window.closeModal = function() {
    modalDrop.style.display = 'none';
    rouletteWrapper.style.display = 'none';
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