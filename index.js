const express = require("express");
const app = express();
app.use(express.json());

const API_KEY = process.env.API_KEY;
const PORT    = process.env.PORT || 3000;

if (!API_KEY) { console.error("API_KEY missing"); process.exit(1); }

const DEFAULT_USERNAME   = "JinHub Notification";
const DEFAULT_AVATAR_URL = "https://i.imgur.com/your-jinhub-logo.png"; // ganti dengan URL logo JinHub

function parseWebhook(url) {
    const match = url.match(/discord(?:app)?\.com\/api\/webhooks\/(\d+)\/([^/?]+)/);
    if (!match) return null;
    return { id: match[1], token: match[2] };
}

function buildPayload(data) {
    const { title, items, footer, username, avatar_url } = data;
    const containerChildren = [];

    if (title) {
        containerChildren.push({ type: 10, content: `**${title}**` });
        containerChildren.push({ type: 14, divider: true, spacing: 1 });
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const lines = [];
        const labels = item.labels || {
    name: "Name",
    stock: "Stock",
    type: "Info",
    rarity: "Rarity",
    extra: "Time",
    price: "Price"
};

if (item.name)
    lines.push(`**${labels.name} :** ${item.name}`);

if (item.stock !== undefined)
    lines.push(`**${labels.stock} :** ${item.stock}`);

if (item.type)
    lines.push(`**${labels.type} :** ${item.type}`);

if (item.rarity)
    lines.push(`**${labels.rarity} :** ${item.rarity}`);

if (item.extra)
    lines.push(`**${labels.extra} :** ${item.extra}`);

if (item.price)
    lines.push(`**${labels.price} :** ${item.price}`);

        if (item.imageUrl) {
            containerChildren.push({
                type: 9,
                components: [{ type: 10, content: lines.join("\n") }],
                accessory: {
                    type: 11,
                    media: { url: item.imageUrl }
                }
            });
        } else {
            containerChildren.push({ type: 10, content: lines.join("\n") });
        }

        if (i < items.length - 1) {
            containerChildren.push({ type: 14, divider: true, spacing: 1 });
        }
    }

    if (footer) {
        containerChildren.push({ type: 14, divider: false, spacing: 1 });
        containerChildren.push({ type: 10, content: `-# ${footer}` });
    }

    return {
        username:   username   || DEFAULT_USERNAME,
        avatar_url: avatar_url || DEFAULT_AVATAR_URL,
        flags: 1 << 15,
        components: [{ type: 17, components: containerChildren }]
    };
}

app.get("/", (req, res) => res.json({ status: "JinHub Notif OK" }));

app.post("/send", async (req, res) => {
    if (req.headers["x-api-key"] !== API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { webhook_url, title, items, footer, username, avatar_url } = req.body;

    if (!webhook_url) return res.status(400).json({ error: "webhook_url required" });
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "items array required" });
    }

    const wh = parseWebhook(webhook_url);
    if (!wh) return res.status(400).json({ error: "Invalid webhook URL" });

    try {
        const payload = buildPayload({ title, items, footer, username, avatar_url });

        const response = await fetch(
            `https://discord.com/api/webhooks/${wh.id}/${wh.token}?with_components=true`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            }
        );

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            console.error("[Discord Error]", JSON.stringify(err, null, 2));
            return res.status(500).json({
                error: err.message || "Discord API error",
                details: err
            });
        }

        res.json({ success: true });
    } catch (e) {
        console.error("[Error]", e?.message);
        res.status(500).json({ error: e?.message || "Unknown error" });
    }
});

app.listen(PORT, () => console.log(`JinHub Notif running on port ${PORT}`));
