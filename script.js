const tg = Telegram.WebApp;
tg.expand();

// ⚠️ ОБЯЗАТЕЛЬНО заменить на свой NGROK / PROD URL
const API_URL = "https://bayleigh-spherelike-sharie.ngrok-free.dev";

const userId = tg.initDataUnsafe?.user?.id;

const balanceEl = document.getElementById("balance");
const content = document.getElementById("content");

// ---------------- INIT ----------------
async function init() {
    await loadUser();
    showTab("case");
}

async function loadUser() {
    try {
        const r = await fetch(`${API_URL}/api/user?user_id=${userId}`);
        const d = await r.json();
        animateBalance(d.balance);
    } catch (e) {
        balanceEl.innerText = "Loading...";
        setTimeout(loadUser, 2000);
    }
}

function animateBalance(value) {
    let current = 0;
    const step = value / 20;
    const interval = setInterval(() => {
        current += step;
        if (current >= value) {
            current = value;
            clearInterval(interval);
        }
        balanceEl.innerText = Math.floor(current);
    }, 30);
}

// ---------------- TABS ----------------
function showTab(tab) {
    if (tab === "case") renderCase();
    if (tab === "earn") renderEarn();
    if (tab === "bag") loadInventory();
}

// ---------------- CASE ----------------
function renderCase() {
    content.innerHTML = `
        <div class="case-box">
            <button class="action" onclick="openCase()">Open Case — 500 coins</button>
        </div>
    `;
}

async function openCase() {
    tg.HapticFeedback.impactOccurred("medium");

    content.innerHTML = `
        <div class="case-box">
            <img src="https://i.imgur.com/7yUvePI.png">
            <p>Opening...</p>
        </div>
    `;

    setTimeout(async () => {
        try {
            const r = await fetch(`${API_URL}/api/open_case`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId })
            });

            const skin = await r.json();

            content.innerHTML = `
                <h2>${skin.name}</h2>
                <img src="${skin.image}" width="220">
                <p>${skin.rarity}</p>
                <p>Price: ${skin.price}</p>
            `;

            loadUser();
        } catch {
            content.innerHTML = "Error opening case";
        }
    }, 2000);
}

// ---------------- EARN ----------------
function renderEarn() {
    content.innerHTML = `
        <button class="action" onclick="daily()">🎁 Daily Bonus</button>
        <button class="action" onclick="checkSub()">📢 Subscribe Reward</button>

        <hr>

        <h3>💳 Buy Coins</h3>
        <button class="action" onclick="buy('small')">1 000 coins — ⭐50</button>
        <button class="action" onclick="buy('medium')">5 000 coins — ⭐200</button>
        <button class="action" onclick="buy('large')">15 000 coins — ⭐500</button>
    `;
}

async function daily() {
    await fetch(`${API_URL}/api/daily`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId })
    });
    loadUser();
}

async function checkSub() {
    await fetch(`${API_URL}/api/check_sub`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId })
    });
    loadUser();
}

async function buy(pack) {
    await fetch(`${API_URL}/api/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, pack })
    });
}

// ---------------- INVENTORY ----------------
async function loadInventory() {
    const r = await fetch(`${API_URL}/api/inventory?user_id=${userId}`);
    const items = await r.json();

    if (!items.length) {
        content.innerHTML = "Inventory is empty";
        return;
    }

    content.innerHTML = items.map(i => `
        <div class="item">
            <img src="${i.image}">
            <div class="item-info">
                <b>${i.name}</b><br>
                ${i.rarity} — ${i.price}
            </div>
            <button onclick="sell(${i.id}, ${i.price})">Sell</button>
        </div>
    `).join("");
}

async function sell(id, price) {
    await fetch(`${API_URL}/api/sell`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id,
            price,
            user_id: userId
        })
    });
    loadUser();
    loadInventory();
}

// ---------------- START ----------------
init();
