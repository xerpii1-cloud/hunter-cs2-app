const tg = window.Telegram.WebApp;
tg.expand();

// --- НАСТРОЙКИ ---
// Пока ставим true, чтобы проверить визуал без Python-сервера
const USE_MOCK_API = false;
// Сюда потом вставим твой NGROK
const API_URL = 'https://bayleigh-spherelike-sharie.ngrok-free.dev/api';

const userId = tg.initDataUnsafe?.user?.id || 123456789;

// --- ДАННЫЕ ДЛЯ ТЕСТА (Заглушки) ---
const MOCK_INVENTORY = [
    { name: 'P250 | Sand Dune', rarity: 'common', price: 50, img: 'skins/p250_sand.png' },
    { name: 'M4A4 | Neo-Noir', rarity: 'rare', price: 400, img: 'skins/m4a4_neo.png' },
    { name: 'AK-47 | Redline', rarity: 'epic', price: 800, img: 'skins/ak47_redline.png' },
    { name: 'Glock | Fade', rarity: 'legendary', price: 2000, img: 'skins/glock_fade.png' }
];

// --- 1. ЗАГРУЗКА ДАННЫХ ---
async function loadUser() {
    if (USE_MOCK_API) {
        // Имитация ответа сервера
        updateUI(1000, "Tester", 5);
        return;
    }

    try {
        let response = await fetch(`${API_URL}/get_user`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });
        let data = await response.json();
        updateUI(data.balance, tg.initDataUnsafe?.user?.first_name, data.level);
    } catch (e) {
        console.error("Ошибка API:", e);
        document.getElementById('username').innerText = "Offline Mode";
    }
}

function updateUI(balance, name, level) {
    document.getElementById('balance').innerText = balance;
    document.getElementById('username').innerText = name || "User";
    document.getElementById('level-text').innerText = `Lvl ${level}`;
}

// --- 2. ЛОГИКА РУЛЕТКИ ---
const track = document.getElementById('roulette-track');
const wrapper = document.getElementById('roulette-wrapper');
const btnOpen = document.getElementById('btn-open');
const caseImg = document.getElementById('current-case-img');

btnOpen.addEventListener('click', async () => {
    btnOpen.disabled = true;

    let result;

    if (USE_MOCK_API) {
        // Имитация выпадения предмета (случайный из списка)
        const randomItem = MOCK_INVENTORY[Math.floor(Math.random() * MOCK_INVENTORY.length)];
        result = { drop: randomItem, new_balance: 500 }; // Якобы списали 500

        // Маленькая задержка как в реальной жизни
        await new Promise(r => setTimeout(r, 500));
    } else {
        // Тут будет реальный запрос к Python
        // ... (допишем позже)
    }

    startRoulette(result.drop, result.new_balance);
});

function startRoulette(winningItem, newBalance) {
    wrapper.style.display = 'block';
    caseImg.style.display = 'none';

    track.innerHTML = '';
    track.style.transition = 'none';
    track.style.transform = 'translateX(0px)';

    const cardWidth = 104; // 100px ширина + 4px margin
    const winningIndex = 30;
    const totalCards = 35;

    // Генерация ленты
    for (let i = 0; i < totalCards; i++) {
        let item = (i === winningIndex) ? winningItem : getRandomFiller();
        let card = createCard(item);
        track.appendChild(card);
    }

    // Запуск анимации
    setTimeout(() => {
        const wrapperWidth = wrapper.offsetWidth;
        // Расчет смещения, чтобы winningIndex встал по центру
        const scrollPosition = (winningIndex * cardWidth) - (wrapperWidth / 2) + (cardWidth / 2);

        // Рандомизация внутри карточки (чтобы не всегда ровно по центру, а чуть левее/правее)
        const randomOffset = Math.floor(Math.random() * 40) - 20;

        track.style.transition = 'transform 5s cubic-bezier(0.15, 0.9, 0.3, 1)';
        track.style.transform = `translateX(-${scrollPosition + randomOffset}px)`;
    }, 50);

    // Финиш
    setTimeout(() => {
        showWinModal(winningItem);
        document.getElementById('balance').innerText = newBalance;
        btnOpen.disabled = false;

        // Вибрация
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');
    }, 5100);
}

function createCard(item) {
    const div = document.createElement('div');
    div.className = `roulette-card card-${item.rarity}`;
    // ВАЖНО: Путь к картинке assets/...
    div.innerHTML = `<img src="assets/${item.img}" alt="skin">`;
    return div;
}

function getRandomFiller() {
    return MOCK_INVENTORY[Math.floor(Math.random() * MOCK_INVENTORY.length)];
}

// --- 3. МОДАЛКА ---
function showWinModal(item) {
    const modal = document.getElementById('modal-drop');
    document.getElementById('drop-name').innerText = item.name;
    document.getElementById('drop-rarity-title').innerText = item.rarity.toUpperCase();
    // ВАЖНО: Путь к картинке assets/...
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

// Старт
loadUser();