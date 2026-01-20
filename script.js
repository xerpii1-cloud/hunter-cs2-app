// web/script.js
const tg = window.Telegram.WebApp;
tg.expand(); // Раскрыть на весь экран

// Получаем ID пользователя из Telegram
const userId = tg.initDataUnsafe?.user?.id || 123456789; // Заглушка для теста в браузере

// Ссылки на API (убедись, что ngrok/domain совпадает с config.py)
// Т.к. фронт лежит там же где и бэк, можно использовать относительные пути
const API_URL = 'https://bayleigh-spherelike-sharie.ngrok-free.dev';

// --- 1. Загрузка данных пользователя ---
async function loadUser() {
    try {
        let response = await fetch(`${API_URL}/get_user`, {
            method: 'POST',
            body: JSON.stringify({ user_id: userId })
        });
        let data = await response.json();

        if (data.error) {
            console.error(data.error);
            return;
        }

        document.getElementById('balance').innerText = data.balance;
        document.getElementById('username').innerText = tg.initDataUnsafe?.user?.first_name || "Stalker";
        document.getElementById('level-text').innerText = `Lvl ${data.level}`;
    } catch (e) {
        console.error("Ошибка сети:", e);
    }
}

// --- 2. Логика рулетки ---
const track = document.getElementById('roulette-track');
const wrapper = document.getElementById('roulette-wrapper');
const btnOpen = document.getElementById('btn-open');
const caseImg = document.getElementById('current-case-img');

btnOpen.addEventListener('click', async () => {
    // Блокируем кнопку
    btnOpen.disabled = true;

    // Запрос к бэкенду
    let response = await fetch(`${API_URL}/open_case`, {
        method: 'POST',
        body: JSON.stringify({ user_id: userId })
    });
    let result = await response.json();

    if (result.status === 'error') {
        alert(result.message);
        btnOpen.disabled = false;
        return;
    }

    // Если всё ок, начинаем анимацию
    startRoulette(result.drop, result.new_balance);
});

function startRoulette(winningItem, newBalance) {
    // 1. Показываем контейнер рулетки, скрываем статик картинку
    wrapper.style.display = 'block';
    caseImg.style.display = 'none';

    // 2. Генерируем "фейковую" ленту предметов
    // Нам нужно много предметов, чтобы прокрутка была долгой.
    // Выигрышный предмет ставим, например, на 30-ю позицию.
    track.innerHTML = ''; // Очистить
    track.style.transition = 'none'; // Сброс анимации
    track.style.transform = 'translateX(0px)'; // Сброс позиции

    const cardWidth = 110; // 100px ширина + 10px отступы (margin)
    const winningIndex = 30; // Индекс победителя
    const totalCards = 35;

    for (let i = 0; i < totalCards; i++) {
        let item = (i === winningIndex) ? winningItem : getRandomFiller();
        let card = createCard(item);
        track.appendChild(card);
    }

    // 3. Запускаем анимацию через небольшую паузу (чтобы браузер отрисовал DOM)
    setTimeout(() => {
        // Вычисляем, на сколько пикселей сдвинуть ленту
        // Нам нужно, чтобы центр 30-й карточки совпал с центром экрана
        // centerScreen = wrapper.width / 2
        // centerCard = winningIndex * cardWidth + (cardWidth / 2)
        // offset = centerCard - centerScreen

        // Для простоты сдвинем так, чтобы 30-я карточка была примерно по центру
        // Добавим немного рандома (±20px), чтобы выглядело живым (но всегда останавливалось на карточке)
        const wrapperWidth = wrapper.offsetWidth;
        const scrollPosition = (winningIndex * cardWidth) - (wrapperWidth / 2) + (cardWidth / 2);

        // Включаем плавность (CSS transition)
        // cubic-bezier(0.1, 0.9, 0.2, 1) - эффект "торможения" в конце
        track.style.transition = 'transform 5s cubic-bezier(0.1, 0.9, 0.2, 1)';
        track.style.transform = `translateX(-${scrollPosition}px)`;

    }, 50);

    // 4. Когда анимация закончится (через 5 сек)
    setTimeout(() => {
        showWinModal(winningItem);
        document.getElementById('balance').innerText = newBalance;
        btnOpen.disabled = false;
        // Можно вернуть кейс обратно, скрыв рулетку, или оставить как есть
    }, 5100);
}

// Вспомогательная функция: создать HTML карточки
function createCard(item) {
    const div = document.createElement('div');
    div.className = `roulette-card card-${item.rarity}`;
    // Важно: путь к картинке должен быть корректным относительно index.html
    // В API мы возвращаем 'skins/name.png', а в HTML нам нужно '../assets/skins/name.png'
    div.innerHTML = `<img src="assets/${item.img}" alt="skin">`;
    return div;
}

// Заглушка для фейковых предметов в рулетке
function getRandomFiller() {
    // В реале лучше передавать список возможных дропов с бэка
    const fillers = [
        { img: 'skins/p250_sand.png', rarity: 'common' },
        { img: 'skins/m4a4_neo.png', rarity: 'rare' },
        { img: 'skins/ak47_redline.png', rarity: 'epic' }
    ];
    return fillers[Math.floor(Math.random() * fillers.length)];
}

// --- 3. Модалка выигрыша ---
function showWinModal(item) {
    const modal = document.getElementById('modal-drop');
    document.getElementById('drop-name').innerText = item.name;
    document.getElementById('drop-rarity-title').innerText = item.rarity.toUpperCase();
    document.getElementById('drop-img').src = `/assets/${item.img}`;
    document.getElementById('drop-price').innerText = item.price;

    // Цвет текста редкости
    const colors = { common: '#b0c3d9', rare: '#4b69ff', epic: '#8847ff', legendary: '#eb4b4b' };
    document.getElementById('drop-rarity-title').style.color = colors[item.rarity] || '#fff';

    modal.style.display = 'flex';

    // Haptic Feedback (вибрация телефона)
    if (tg.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred('success');
    }
}

function closeModal() {
    document.getElementById('modal-drop').style.display = 'none';
    wrapper.style.display = 'none';
    caseImg.style.display = 'block';
}

// Старт
loadUser();