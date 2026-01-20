// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand();

// Глобальные переменные
let userData = null;
let currentScreen = 'earn';
let currentInventoryPage = 1;
let currentInventoryRarity = 'all';
let currentTopType = 'balance';
let selectedItemToSell = null;

// Инициализация приложения
async function initApp() {
    try {
        // Получаем данные пользователя из Telegram
        const initData = tg.initData;
        const user = tg.initDataUnsafe.user;

        if (!user) {
            showNotification('Ошибка: Пользователь не найден', 'error');
            return;
        }

        // Загружаем данные пользователя с сервера
        const response = await fetch('/api/user', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: user.id
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка загрузки данных пользователя');
        }

        userData = await response.json();
        updateUI();

        // Загружаем начальный экран
        loadScreenData();

        // Проверяем, есть ли ежедневный бонус
        checkDailyBonus();

    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showNotification('Ошибка загрузки приложения', 'error');
    }
}

// Обновление UI на основе данных пользователя
function updateUI() {
    if (!userData) return;

    // Обновляем информацию в шапке
    document.getElementById('username').textContent = userData.username || 'Игрок';
    document.getElementById('balance').textContent = userData.balance.toLocaleString();
    document.getElementById('level').textContent = `Ур. ${userData.level}`;

    // XP бар
    const xpForNextLevel = calculateXPForNextLevel(userData.level);
    const xpProgress = (userData.xp / xpForNextLevel) * 100;
    document.getElementById('xpProgress').style.width = `${xpProgress}%`;
    document.getElementById('xpText').textContent = `${userData.xp}/${xpForNextLevel} XP`;

    // VIP бейдж
    const vipBadge = document.getElementById('vipBadge');
    if (userData.is_vip) {
        vipBadge.classList.add('active');
        document.getElementById('username').classList.add('vip');
    } else {
        vipBadge.classList.remove('active');
        document.getElementById('username').classList.remove('vip');
    }

    // Обновляем прогресс квестов
    document.getElementById('casesProgress').textContent = `${userData.cases_opened || 0}/5`;
    document.getElementById('inviteCount').textContent = userData.referrals || 0;
}

// Расчет XP для следующего уровня
function calculateXPForNextLevel(level) {
    const requirements = [0, 100, 300, 600, 1000, 1500, 2100, 2800, 3600, 4500];
    return requirements[level] || requirements[requirements.length - 1];
}

// Переключение экранов
function showScreen(screenName) {
    // Скрываем текущий экран
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });

    // Скрываем навигацию кейсов
    document.getElementById('caseOpening').style.display = 'none';
    document.getElementById('caseResult').style.display = 'none';

    // Показываем выбранный экран
    document.getElementById(`${screenName}Screen`).classList.add('active');

    // Обновляем навигацию
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.nav-btn[data-screen="${screenName}"]`).classList.add('active');

    currentScreen = screenName;
    loadScreenData();
}

// Загрузка данных для экрана
async function loadScreenData() {
    switch (currentScreen) {
        case 'inventory':
            await loadInventory();
            break;
        case 'top':
            await loadTop();
            break;
        case 'earn':
            updateQuestProgress();
            break;
    }
}

// Открытие кейса
async function openCase(caseType) {
    try {
        if (!userData) return;

        // Проверяем баланс
        const casePrice = getCasePrice(caseType);
        if (userData.balance < casePrice) {
            showNotification('Недостаточно средств', 'error');
            return;
        }

        // Показываем анимацию открытия
        showCaseAnimation();

        // Отправляем запрос на открытие кейса
        const response = await fetch('/api/open-case', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userData.user_id,
                case_type: caseType
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка открытия кейса');
        }

        const result = await response.json();

        // Обновляем данные пользователя
        userData.balance = result.new_balance;
        userData.xp += result.xp_gained;

        if (result.level_up) {
            userData.level++;
            showNotification(`🎉 Уровень повышен! Теперь уровень ${userData.level}`, 'success');
        }

        // Показываем результат
        showCaseResult(result.item);

        // Обновляем UI
        updateUI();

        // Вибрация (если поддерживается)
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 100]);
        }

    } catch (error) {
        console.error('Ошибка открытия кейса:', error);
        showNotification('Ошибка открытия кейса', 'error');
    }
}

// Показ анимации открытия кейса
function showCaseAnimation() {
    const caseOpening = document.getElementById('caseOpening');
    const caseShake = document.getElementById('caseShake');
    const spinLine = document.getElementById('spinLine');

    // Показываем контейнер
    caseOpening.style.display = 'block';

    // Анимация тряски кейса
    caseShake.classList.add('shaking');

    // Очищаем ленту прокрутки
    spinLine.innerHTML = '';

    // Создаем элементы для прокрутки
    const itemsContainer = document.createElement('div');
    itemsContainer.className = 'spin-items';

    // Добавляем несколько случайных предметов
    const allItems = [
        ...CASES.basic_case.items,
        ...(CASES.premium_case?.items || [])
    ];

    for (let i = 0; i < 20; i++) {
        const randomItem = allItems[Math.floor(Math.random() * allItems.length)];
        const itemDiv = document.createElement('div');
        itemDiv.className = 'spin-item';
        itemDiv.innerHTML = `
            <div style="background: ${getRarityColor(randomItem.rarity)}; 
                       width: 80px; height: 80px; border-radius: 8px; 
                       display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 24px;">🎮</span>
            </div>
        `;
        itemsContainer.appendChild(itemDiv);
    }

    spinLine.appendChild(itemsContainer);

    // Запускаем анимацию
    setTimeout(() => {
        caseShake.classList.remove('shaking');
    }, 500);
}

// Показ результата открытия кейса
function showCaseResult(item) {
    const result = document.getElementById('caseResult');
    const skinName = document.getElementById('resultSkin').querySelector('.skin-name');
    const skinRarity = document.getElementById('resultSkin').querySelector('.skin-rarity');
    const skinPrice = document.getElementById('resultSkin').querySelector('.skin-price');

    // Устанавливаем данные
    skinName.textContent = item.name;
    skinRarity.textContent = getRarityName(item.rarity);
    skinRarity.className = `skin-rarity ${item.rarity}`;
    skinPrice.textContent = `${item.price.toLocaleString()} монет`;

    // Устанавливаем цвет свечения
    result.style.setProperty('--glow-color', getRarityColor(item.rarity));

    // Показываем результат
    result.style.display = 'block';

    // Анимация
    result.style.animation = 'none';
    setTimeout(() => {
        result.style.animation = 'slideUp 0.5s ease';
    }, 10);
}

// Загрузка инвентаря
async function loadInventory() {
    try {
        if (!userData) return;

        const response = await fetch(`/api/inventory?user_id=${userData.user_id}&page=${currentInventoryPage}&rarity=${currentInventoryRarity}`);

        if (!response.ok) {
            throw new Error('Ошибка загрузки инвентаря');
        }

        const data = await response.json();
        displayInventory(data.items);
        updatePagination(data);

    } catch (error) {
        console.error('Ошибка загрузки инвентаря:', error);
        showNotification('Ошибка загрузки инвентаря', 'error');
    }
}

// Отображение инвентаря
function displayInventory(items) {
    const grid = document.getElementById('inventoryGrid');
    grid.innerHTML = '';

    if (items.length === 0) {
        grid.innerHTML = '<div class="empty-inventory">Инвентарь пуст</div>';
        return;
    }

    items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'inventory-item';
        itemDiv.innerHTML = `
            <div class="item-image" style="background: ${getRarityColor(item.rarity)}">
                <span>🔫</span>
            </div>
            <div class="item-name">${item.skin_name}</div>
            <div class="item-rarity ${item.rarity}">${getRarityName(item.rarity)}</div>
            <div class="item-price">${item.price.toLocaleString()} монет</div>
            <button class="sell-btn" onclick="showSellModal(${item.id}, '${item.skin_name}', ${item.price})">
                Продать
            </button>
        `;
        grid.appendChild(itemDiv);
    });
}

// Обновление пагинации
function updatePagination(data) {
    const pagination = document.getElementById('pagination');
    const pageInfo = pagination.querySelector('.page-info');

    pageInfo.textContent = `Страница ${data.page} из ${data.pages || 1}`;

    // Показываем/скрываем кнопки
    pagination.querySelectorAll('.page-btn')[0].style.display = data.page > 1 ? 'inline-block' : 'none';
    pagination.querySelectorAll('.page-btn')[1].style.display = data.page < data.pages ? 'inline-block' : 'none';
}

// Переход на предыдущую страницу
function prevPage() {
    if (currentInventoryPage > 1) {
        currentInventoryPage--;
        loadInventory();
    }
}

// Переход на следующую страницу
function nextPage() {
    currentInventoryPage++;
    loadInventory();
}

// Фильтрация по редкости
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        currentInventoryRarity = this.dataset.rarity;
        currentInventoryPage = 1;
        loadInventory();
    });
});

// Покупка валюты
async function buyCurrency(packType) {
    try {
        if (!userData) return;

        const response = await fetch('/api/buy-currency', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userData.user_id,
                pack_type: packType
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка покупки валюты');
        }

        const result = await response.json();

        // Обновляем баланс
        userData.balance += result.coins_added;
        updateUI();

        showNotification(`Получено ${result.coins_added.toLocaleString()} монет!`, 'success');

    } catch (error) {
        console.error('Ошибка покупки валюты:', error);
        showNotification('Ошибка покупки валюты', 'error');
    }
}

// Создание крипто инвойса
async function createCryptoInvoice(amount) {
    try {
        if (!userData) return;

        const response = await fetch('/api/crypto-invoice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userData.user_id,
                amount: amount
            })
        });

        const result = await response.json();

        if (result.success) {
            const invoice = result.result;
            document.getElementById('cryptoInfo').innerHTML = `
                <p>Инвойс создан! Оплатите ${invoice.amount} ${invoice.currency}</p>
                <a href="${invoice.pay_url}" target="_blank" class="btn btn-primary">
                    Перейти к оплате
                </a>
                <p><small>ID: ${invoice.invoice_id}</small></p>
            `;
        } else {
            showNotification('Ошибка создания инвойса', 'error');
        }

    } catch (error) {
        console.error('Ошибка создания инвойса:', error);
        showNotification('Ошибка создания инвойса', 'error');
    }
}

// Ежедневный бонус
async function claimDaily() {
    try {
        if (!userData) return;

        const response = await fetch('/api/daily-login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userData.user_id
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка получения бонуса');
        }

        const result = await response.json();

        // Обновляем данные пользователя
        userData.balance += result.coins;
        userData.xp += result.xp;
        userData.streak = result.streak;

        updateUI();

        let message = `🎉 Ежедневный бонус! +${result.coins} монет, +${result.xp} XP`;
        if (result.streak > 1) {
            message += ` (стрик: ${result.streak} дней)`;
        }
        if (result.free_case) {
            message += `\n🎁 Бесплатный кейс: ${result.free_case}`;
        }

        showNotification(message, 'success');

    } catch (error) {
        console.error('Ошибка получения бонуса:', error);
        showNotification('Ошибка получения бонуса', 'error');
    }
}

// Проверка ежедневного бонуса
function checkDailyBonus() {
    // Здесь можно добавить проверку последнего входа
    // и предложить забрать бонус
}

// Обновление прогресса квестов
function updateQuestProgress() {
    // Обновляем отображение прогресса квестов
    // (уже обновляется в updateUI)
}

// Загрузка топа
async function loadTop() {
    try {
        const response = await fetch(`/api/top?type=${currentTopType}&limit=10`);

        if (!response.ok) {
            throw new Error('Ошибка загрузки топа');
        }

        const data = await response.json();
        displayTop(data.users);

    } catch (error) {
        console.error('Ошибка загрузки топа:', error);
        showNotification('Ошибка загрузки топа', 'error');
    }
}

// Отображение топа
function displayTop(users) {
    const topList = document.getElementById('topList');
    topList.innerHTML = '';

    users.forEach((user, index) => {
        const position = index + 1;
        const topItem = document.createElement('div');
        topItem.className = 'top-item';

        let value = '';
        switch (currentTopType) {
            case 'balance':
                value = `${user.balance.toLocaleString()} монет`;
                break;
            case 'level':
                value = `Уровень ${user.level}`;
                break;
            case 'cases':
                value = `${user.cases_opened} кейсов`;
                break;
            case 'spent':
                value = `${user.total_spent.toLocaleString()} монет`;
                break;
        }

        topItem.innerHTML = `
            <div class="top-position">${position}</div>
            <div class="top-user-info">
                <div class="top-username">${user.username || 'Игрок'}</div>
                <div class="top-value">${value}</div>
            </div>
        `;

        topList.appendChild(topItem);
    });
}

// Переключение типа топа
document.querySelectorAll('.top-filter').forEach(btn => {
    btn.addEventListener('click', function () {
        document.querySelectorAll('.top-filter').forEach(b => b.classList.remove('active'));
        this.classList.add('active');

        currentTopType = this.dataset.type;
        loadTop();
    });
});

// Показ модального окна продажи
function showSellModal(itemId, itemName, itemPrice) {
    selectedItemToSell = itemId;

    const sellPrice = Math.floor(itemPrice * 0.8); // 80% от цены

    document.getElementById('sellItemName').textContent = itemName;
    document.getElementById('sellPrice').textContent = sellPrice.toLocaleString();

    document.getElementById('sellModal').style.display = 'flex';
}

// Закрытие модального окна
function closeModal() {
    document.getElementById('sellModal').style.display = 'none';
    selectedItemToSell = null;
}

// Подтверждение продажи
async function confirmSell() {
    try {
        if (!userData || !selectedItemToSell) return;

        const response = await fetch('/api/sell-item', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userData.user_id,
                item_id: selectedItemToSell
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка продажи предмета');
        }

        const result = await response.json();

        // Обновляем баланс
        userData.balance += result.sell_price;
        updateUI();

        // Обновляем инвентарь
        await loadInventory();

        showNotification(`Предмет продан за ${result.sell_price.toLocaleString()} монет!`, 'success');

        closeModal();

    } catch (error) {
        console.error('Ошибка продажи предмета:', error);
        showNotification('Ошибка продажи предмета', 'error');
    }
}

// Показ пригласительного диалога
function showInviteDialog() {
    if (tg.platform !== 'unknown') {
        tg.showPopup({
            title: 'Пригласить друга',
            message: 'Поделитесь ссылкой с другом, чтобы получить награду!',
            buttons: [
                { id: 'share', type: 'default', text: 'Поделиться' },
                { type: 'cancel' }
            ]
        }, (buttonId) => {
            if (buttonId === 'share') {
                tg.shareUrl(
                    `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=Присоединяйся к Hunter CS2!`,
                    'Пригласить друга'
                );
            }
        });
    } else {
        const link = window.location.href;
        navigator.clipboard.writeText(link);
        showNotification('Ссылка скопирована в буфер обмена!', 'success');
    }
}

// Показ уведомлений
function showNotification(message, type = 'info') {
    const notifications = document.getElementById('notifications');

    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    notifications.appendChild(notification);

    // Автоматическое удаление через 5 секунд
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease reverse';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// Вспомогательные функции
function getCasePrice(caseType) {
    return CASES[caseType]?.price || 0;
}

function getRarityColor(rarity) {
    const colors = {
        'common': '#5e98d9',
        'uncommon': '#4b69ff',
        'rare': '#8847ff',
        'legendary': '#d32ce6',
        'mythical': '#ffd700'
    };
    return colors[rarity] || colors.common;
}

function getRarityName(rarity) {
    const names = {
        'common': 'Обычный',
        'uncommon': 'Необычный',
        'rare': 'Редкий',
        'legendary': 'Легендарный',
        'mythical': 'Мифический'
    };
    return names[rarity] || 'Обычный';
}

// Запуск таймера для ограниченного кейса
function startLimitedCaseTimer() {
    const timerElement = document.getElementById('premiumTimer');
    if (!timerElement) return;

    let hours = 48;
    let minutes = 0;
    let seconds = 0;

    function updateTimer() {
        seconds--;
        if (seconds < 0) {
            seconds = 59;
            minutes--;
            if (minutes < 0) {
                minutes = 59;
                hours--;
                if (hours < 0) {
                    // Время вышло
                    timerElement.textContent = 'Время вышло!';
                    return;
                }
            }
        }

        timerElement.textContent =
            `${hours.toString().padStart(2, '0')}:` +
            `${minutes.toString().padStart(2, '0')}:` +
            `${seconds.toString().padStart(2, '0')}`;
    }

    // Обновляем таймер каждую секунду
    setInterval(updateTimer, 1000);
    updateTimer();
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function () {
    initApp();
    startLimitedCaseTimer();

    // Закрытие модального окна по клику вне его
    document.getElementById('sellModal').addEventListener('click', function (e) {
        if (e.target === this) {
            closeModal();
        }
    });
});

// Обработчик нажатия кнопки "Назад" в Telegram
tg.BackButton.onClick(() => {
    if (currentScreen !== 'earn') {
        showScreen('earn');
    } else {
        tg.close();
    }
});

// Показываем кнопку "Назад" если не на главном экране
function updateBackButton() {
    if (currentScreen !== 'earn') {
        tg.BackButton.show();
    } else {
        tg.BackButton.hide();
    }
}

// Обновляем кнопку "Назад" при смене экрана
const originalShowScreen = showScreen;
showScreen = function (screenName) {
    originalShowScreen(screenName);
    updateBackButton();
};