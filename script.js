const tg = window.Telegram.WebApp;
tg.expand();

// ❗ ВАЖНО: ВСТАВЬ СЮДА СВОЙ NGROK
const API = "https://bayleigh-spherelike-sharie.ngrok-free.dev";

let user_id = null;

async function init() {
    if (!tg.initDataUnsafe || !tg.initDataUnsafe.user) {
        document.getElementById("content").innerText = "Open via Telegram";
        return;
    }

    user_id = tg.initDataUnsafe.user.id;
    await loadUser();
    showCase();
}

async function loadUser() {
    try {
        const r = await fetch(`${API}/api/user?user_id=${user_id}`);
        const data = await r.json();

        document.getElementById("balance").innerText =
            `💰 ${data.balance} coins`;

    } catch {
        document.getElementById("balance").innerText = "Loading...";
        setTimeout(loadUser, 1500);
    }
}

function showCase() {
    document.getElementById("content").innerHTML = `
        <h2>🎁 Open Case</h2>
        <button onclick="openCase()">Open Case — 500 coins</button>
        <div id="result"></div>
    `;
}

async function openCase() {
    tg.HapticFeedback.impactOccurred("medium");

    const res = await fetch(`${API}/api/open_case`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id })
    });

    const data = await res.json();

    if (data.error) {
        alert(data.error);
        return;
    }

    document.getElementById("result").innerHTML = `
        <p>${data.skin.name}</p>
        <p>${data.skin.rarity}</p>
    `;

    loadUser();
}

function showEarn() {
    document.getElementById("content").innerHTML = `
        <h2>💰 Earn</h2>
        <button onclick="daily()">Daily reward</button>
    `;
}

async function daily() {
    const r = await fetch(`${API}/api/daily`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id })
    });
    const d = await r.json();
    alert(`+${d.reward} coins`);
    loadUser();
}

function showBag() {
    document.getElementById("content").innerHTML = `
        <h2>🎒 Inventory</h2>
        <p>(Coming soon)</p>
    `;
}

init();
