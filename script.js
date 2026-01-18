const tg = window.Telegram.WebApp;
tg.expand();

async function openCase() {
    tg.HapticFeedback.impactOccurred("heavy");

    const res = await fetch("/api/open_case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: tg.initDataUnsafe.user.id })
    });

    const data = await res.json();
    if (data.error) return alert("Ошибка!");

    const r = document.getElementById("result");
    r.innerHTML = `
        <h2 class="glow-${data.rarity}">
            ${data.skin} (+${data.price})
        </h2>
    `;
}
