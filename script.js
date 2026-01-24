const tg = window.Telegram.WebApp;
tg.expand(); 

// --- НАСТРОЙКИ ---
const USE_MOCK_API = false; // Работаем с реальным ботом

// ВСТАВЬ СЮДА СВОЮ ССЫЛКУ NGROK (Обязательно /api в конце)
const API_URL = 'https://bayleigh-spherelike-sharie.ngrok-free.dev/api';

const userId = tg.initDataUnsafe?.user?.id || 123456789;

// --- 1. ЗАГРУЗКА ДАННЫХ ---
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
        // Если ошибка, покажем заглушку
        document.getElementById('username').innerText = "Connection Error";
    }
}

function updateUI(balance, name, level) {
    document.getElementById('balance').innerText = balance;
    // Если имя "?", оставляем как есть, иначе берем из Телеграма
    document.getElementById('username').innerText = name || "Gamer";
    document.getElementById('level-text').innerText = `Lvl ${level}`;
}

// --- 2. ЛОГИКА РУЛЕТКИ ---
const track = document.getElementById('roulette-track');
const wrapper = document.getElementById('roulette-wrapper');
const btnOpen = document.getElementById('btn-open');
const caseImg = document.getElementById('current-case-img');

btnOpen.addEventListener('click', async () => {
    // 1. Блокируем кнопку
    btnOpen.disabled = true;
    
    let result;

    try {
        // Делаем реальный запрос к боту
        let response = await fetch(`${API_URL}/open_case`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });

        if (!response.ok) throw new Error("Ошибка сервера");

        result = await response.json();

        // Проверяем, вдруг денег не хватило
        if (result.status === 'error') {
            alert(result.message);
            btnOpen.disabled = false;
            return;
        }

    } catch (e) {
        console.error(e);
        alert("Ошибка связи с ботом! Проверь интернет или Ngrok.");
        btnOpen.disabled = false;
        return;
    }

    // Если всё ок — запускаем анимацию
    startRoulette(result.drop, result.new_balance);
});

function startRoulette(winningItem, newBalance) {
    wrapper.style.display = 'block';
    caseImg.style.display = 'none';

    track.innerHTML = ''; 
    track.style.transition = 'none'; 
    track.style.transform = 'translateX(0px)'; 

    const cardWidth = 104; 
    const winningIndex = 30; 
    const totalCards = 35; 

    // Генерация ленты
    for (let i = 0; i < totalCards; i++) {
        // Если это победный индекс — ставим предмет с бэкенда
        // Иначе — ставим случайный мусор для красоты
        let item = (i === winningIndex) ? winningItem : getRandomFiller();
        let card = createCard(item);
        track.appendChild(card);
    }

    // Запуск анимации
    setTimeout(() => {
        const wrapperWidth = wrapper.offsetWidth;
        const scrollPosition = (winningIndex * cardWidth) - (wrapperWidth / 2) + (cardWidth / 2);
        const randomOffset = Math.floor(Math.random() * 40) - 20; 

        track.style.transition = 'transform 5s cubic-bezier(0.15, 0.9, 0.3, 1)'; 
        track.style.transform = `translateX(-${scrollPosition + randomOffset}px)`;
    }, 50);

    // Финиш
    setTimeout(() => {
        showWinModal(winningItem);
        document.getElementById('balance').innerText = newBalance;
        btnOpen.disabled = false;
        
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }, 5100);
}

function createCard(item) {
    const div = document.createElement('div');
    div.className = `roulette-card card-${item.rarity}`;
    div.innerHTML = `<img src="assets/${item.img}" alt="skin">`; 
    return div;
}

// Фейковые предметы ТОЛЬКО для прокрутки (не для выигрыша)
function getRandomFiller() {
    const fillers = [
        { img: 'skins/p250_sand.png', rarity: 'common' },
        { img: 'skins/m4a4_neo.png', rarity: 'rare' },
        { img: 'skins/ak47_redline.png', rarity: 'epic' }
    ];
    return fillers[Math.floor(Math.random() * fillers.length)];
}

// --- 3. МОДАЛКА ---
function showWinModal(item) {
    const modal = document.getElementById('modal-drop');
    document.getElementById('drop-name').innerText = item.name;
    document.getElementById('drop-rarity-title').innerText = item.rarity.toUpperCase();
    document.getElementById('drop-img').src = `assets/${item.img}`;
    document.getElementById('drop-price').innerText = item.price;
    
    const colors = { common: '#b0c3d9', rare: '#4b69ff', epic: '#8847ff', legendary: '#eb4b4b' };
    document.getElementById('drop-rarity-title').style.color = colors[item.rarity];

    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('modal-drop').style.display = 'none';
    wrapper.style.display = 'none';
    caseImg.style.display = 'block';
}

// --- ПОКУПКА ЗВЕЗД ---
const btnAddFunds = document.getElementById('btn-add-funds');

btnAddFunds.addEventListener('click', async () => {
    // 1. Спрашиваем юзера (пока просто через prompt, потом сделаем красиво)
    // В реальном проекте тут лучше сделать красивое модальное окно выбора паков
    if (!confirm("Купить 5000 монет за 50 Звезд ⭐?")) return;

    try {
        // 2. Просим бота создать счет
        let response = await fetch(`${API_URL}/create_invoice`, {
            method: 'POST',
            body: JSON.stringify({ stars: 50 }) // Хотим купить за 50 звезд
        });
        
        let data = await response.json();
        
        if (data.link) {
            // 3. Открываем платежку Телеграм
            tg.openInvoice(data.link, (status) => {
                if (status === 'paid') {
                    tg.close(); // Закрываем окно оплаты
                    alert("Успешно! Монеты скоро придут.");
                    // Небольшой хак: обновляем баланс через 2 секунды
                    setTimeout(loadUser, 2000);
                }
            });
        } else {
            alert("Ошибка создания счета");
        }
    } catch (e) {
        console.error(e);
        alert("Ошибка сети");
    }
});

// --- ИНВЕНТАРЬ ---
const modalInv = document.getElementById('modal-inventory');
const invGrid = document.getElementById('inventory-grid');

// Открытие инвентаря
document.getElementById('btn-inventory').addEventListener('click', async () => {
    modalInv.style.display = 'flex';
    invGrid.innerHTML = '<p style="color:#888;">Загрузка...</p>';
    
    try {
        let response = await fetch(`${API_URL}/get_inventory`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });
        let data = await response.json();
        
        renderInventory(data.items);
    } catch (e) {
        invGrid.innerHTML = '<p style="color:red;">Ошибка загрузки</p>';
    }
});

// Отрисовка сетки
function renderInventory(items) {
    invGrid.innerHTML = ''; // Очистить
    let totalVal = 0;

    if (items.length === 0) {
        invGrid.innerHTML = '<p style="margin:auto; color:#666;">Инвентарь пуст</p>';
        return;
    }

    items.forEach(item => {
        totalVal += item.price;
        
        const el = document.createElement('div');
        el.className = `inv-item inv-${item.rarity}`;
        const shortName = item.name.split('|')[0].trim();
        
        // Добавляем кнопку SELL
        // Мы используем onclick="sellItem(...)" и передаем туда ID
        el.innerHTML = `
            <img src="assets/${item.img}">
            <div>${shortName}</div>
            <span class="inv-price">${item.price} 💰</span>
            <button class="btn-sell" onclick="sellItem(${item.id}, this)">SELL</button>
        `;
        invGrid.appendChild(el);
    });
    
    document.getElementById('total-value').innerText = `Стоимость: ${totalVal} 💰`;
}

async function sellItem(itemId, btnElement) {
    // Чтобы нельзя было нажать дважды
    btnElement.disabled = true;
    btnElement.innerText = '...';

    try {
        let response = await fetch(`${API_URL}/sell_item`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, item_id: itemId })
        });
        let data = await response.json();

        if (data.status === 'success') {
            // Обновляем баланс в шапке
            updateUI(data.new_balance, null, document.getElementById('level-text').innerText.replace('Lvl ',''));
            
            // Удаляем карточку визуально (чтобы не перезагружать весь инвентарь)
            btnElement.parentElement.remove();
            
            // Вибрация успеха
            if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
        } else {
            alert("Ошибка продажи");
            btnElement.disabled = false;
        }
    } catch (e) {
        console.error(e);
        btnElement.innerText = 'Error';
    }
}

// --- ПЕРЕКЛЮЧЕНИЕ ВКЛАДОК ---
function switchTab(tabName, btn) {
    // 1. Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    
    // 2. Убираем подсветку кнопок
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    // 3. Показываем нужную
    document.getElementById(`tab-${tabName}`).classList.add('active');
    btn.classList.add('active');

    // Если открыли инвентарь - загружаем его
    if (tabName === 'inventory') {
        loadInventory();
    }
}

// Переписываем функцию загрузки инвентаря (она была привязана к модалке, теперь к вкладке)
async function loadInventory() {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '<p style="color:#666;">Loading...</p>';
    
    try {
        let response = await fetch(`${API_URL}/get_inventory`, {
            method: 'POST', body: JSON.stringify({ user_id: userId })
        });
        let data = await response.json();
        renderInventory(data.items);
    } catch (e) {
        grid.innerHTML = 'Error';
    }
}

// Обновленный рендер карточек (для нового дизайна)
function renderInventory(items) {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    
    if (items.length === 0) {
        grid.innerHTML = '<p>Пусто :(</p>';
        return;
    }

    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'inv-card';
        // Сокращаем имя
        let shortName = item.name.split('|')[0];
        
        div.innerHTML = `
            <img src="assets/${item.img}">
            <div style="font-size:10px; margin-top:5px;">${shortName}</div>
            <div class="inv-price">${item.price} 💰</div>
            <button class="btn-sell-sm" onclick="sellItem(${item.id}, this)">SELL</button>
        `;
        grid.appendChild(div);
    });
}

function closeInventory() {
    modalInv.style.display = 'none';
}

// Старт
loadUser();