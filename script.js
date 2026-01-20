const tg = window.Telegram.WebApp;
tg.ready();
tg.expand();

// ⚠️ ЗАМЕНИ НА СВОЙ NGROK
const API_URL = "https://bayleigh-spherelike-sharie.ngrok-free.dev";

let userId = tg.initDataUnsafe?.user?.id || 123456789; // Fallback for testing
let user = {};

// --- INITIALIZATION ---
async function init() {
    try {
        let res = await post('/api/user', { user_id: userId });
        if (res.error) return console.error(res.error);

        user = res;
        updateUI();
        startTimer();
    } catch (e) { console.error("Init failed", e); }
}

function updateUI() {
    document.getElementById('username').innerText = user.username;
    if (user.is_vip) document.getElementById('username').classList.add('vip-name');

    document.getElementById('balance').innerText = user.balance;
    document.getElementById('lvl-badge').innerText = `Lvl ${user.level}`;

    // XP Bar (допустим 1000 на уровень)
    let percent = (user.xp % 1000) / 10;
    document.getElementById('xp-bar').style.width = percent + '%';
}

// --- CASE OPENING LOGIC ---
async function openCase() {
    const btn = document.getElementById('btn-open');
    const caseImg = document.querySelector('.case-img');
    const winDisplay = document.getElementById('win-display');

    btn.disabled = true;
    winDisplay.style.display = 'none';

    // 1. Request
    let res = await post('/api/open_case', { user_id: userId });

    if (res.status === 'no_money') {
        tg.showAlert("Not enough money!");
        btn.disabled = false;
        return;
    }

    // 2. Shake Animation (Haptic)
    caseImg.classList.add('shaking');
    if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('warning');

    // 3. Wait and Reveal
    setTimeout(() => {
        caseImg.classList.remove('shaking');
        if (tg.HapticFeedback) tg.HapticFeedback.notificationOccurred('success');

        // Show result
        winDisplay.style.display = 'block';
        document.getElementById('win-img').src = res.image;
        document.getElementById('win-name').innerText = res.skin;
        document.getElementById('win-rarity').innerText = res.rarity;

        // Glow Color
        let glow = document.getElementById('win-glow');
        if (res.rarity === 'Covert' || res.rarity === 'Gold') glow.style.background = 'red';
        else if (res.rarity === 'Classified') glow.style.background = '#d32ce6';
        else glow.style.background = 'blue';

        // Update Balance & XP
        user.balance = res.new_balance;
        if (res.leveled_up) tg.showAlert("LEVEL UP! 🎉");
        updateUI();

        btn.disabled = false;
    }, 1500);
}

// --- SHOP & STARS ---
async function buyItem(type) {
    let res = await post('/api/create_invoice', { user_id: userId, type: type });
    if (res.link) {
        tg.openInvoice(res.link, (status) => {
            if (status === 'paid') {
                tg.showAlert("Payment Successful!");
                init(); // Reload data
            }
        });
    }
}

// --- INVENTORY ---
async function loadBag() {
    let res = await post('/api/inventory', { user_id: userId });
    let grid = document.getElementById('inv-grid');
    grid.innerHTML = '';

    res.items.forEach(item => {
        let el = document.createElement('div');
        el.className = 'inv-item';
        el.innerHTML = `
            <img src="${item.image}">
            <div class="inv-name" style="color:${getRarityColor(item.rarity)}">${item.name}</div>
            <button class="btn-sell" onclick="sellItem(${item.id})">Sell ${item.price}💰</button>
        `;
        grid.appendChild(el);
    });
}

async function sellItem(id) {
    if (!confirm("Sell item?")) return;
    let res = await post('/api/sell', { user_id: userId, item_id: id });
    if (res.status === 'ok') {
        user.balance = res.new_balance;
        updateUI();
        loadBag(); // Refresh
        if (tg.HapticFeedback) tg.HapticFeedback.selectionChanged();
    }
}

// --- TOP & QUESTS ---
async function checkSub() {
    let res = await post('/api/check_sub', { user_id: userId });
    if (res.status === 'ok') {
        tg.showAlert("+500 Coins!");
        user.balance = res.new_balance;
        updateUI();
    } else if (res.status === 'not_sub') {
        tg.openTelegramLink(res.link);
    } else {
        tg.showAlert("Already claimed!");
    }
}

async function loadTop() {
    let res = await post('/api/leaderboard', {});
    let div = document.getElementById('leaderboard');
    div.innerHTML = res.top.map((u, i) => `<div class="shop-item">#${i + 1} ${u.name} - ${u.balance}💰</div>`).join('');
}

// --- UTILS ---
async function post(url, data) {
    let req = await fetch(API_URL + url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    return await req.json();
}

function getRarityColor(rarity) {
    if (rarity === 'Gold') return '#eb4b4b';
    if (rarity === 'Covert') return '#eb4b4b';
    if (rarity === 'Classified') return '#d32ce6';
    return '#4b69ff';
}

function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(`tab-${tab}`).classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');

    if (tab === 'bag') loadBag();
    if (tab === 'top') loadTop();
}

function startTimer() {
    // Fake timer logic
    let timerEl = document.getElementById('timer');
    setInterval(() => {
        let now = new Date();
        let end = new Date();
        end.setHours(24, 0, 0, 0);
        let diff = end - now;
        let h = Math.floor(diff / 3600000);
        let m = Math.floor((diff % 3600000) / 60000);
        let s = Math.floor((diff % 60000) / 1000);
        timerEl.innerText = `${h}:${m}:${s}`;
    }, 1000);
}

// Invite System
function inviteFriend() {
    let link = `https://t.me/share/url?url=https://t.me/huntercs2bot?start=${userId}&text=Play Hunter CS2 with me!`;
    tg.openTelegramLink(link);
}

// Start
init();