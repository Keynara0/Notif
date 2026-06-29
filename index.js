const express = require("express");
const { REST } = require("@discordjs/rest");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_KEY   = process.env.API_KEY;
const PORT      = process.env.PORT || 3000;

if (!BOT_TOKEN) { console.error("BOT_TOKEN missing"); process.exit(1); }
if (!API_KEY)   { console.error("API_KEY missing");   process.exit(1); }

const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

function parseWebhook(url) {
    const match = url.match(/discord(?:app)?\.com\/api\/webhooks\/(\d+)\/([^/?]+)/);
    if (!match) return null;
    return { id: match[1], token: match[2] };
}

function buildPayload(data) {
    const { title, items, footer } = data;
    const containerChildren = [];

    if (title) {
        containerChildren.push({ type: 10, content: `**${title}**` });
        containerChildren.push({ type: 14, divider: true, spacing: 1 });
    }

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const lines = [];
        if (item.name)               lines.push(`**Name :** ${item.name}`);
        if (item.stock !== undefined) lines.push(`**Stock :** ${item.stock}`);
        if (item.type)               lines.push(`**Info :** ${item.type}`);
        if (item.rarity)             lines.push(`**Rarity :** ${item.rarity}`);
        if (item.extra)              lines.push(`**Time :** ${item.extra}`);
        if (item.price)              lines.push(`**Price :** ${item.price}`);

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
        flags: 1 << 15,
        components: [{ type: 17, components: containerChildren }]
    };
}

app.get("/", (req, res) => res.json({ status: "JinHub Notif OK" }));

app.post("/send", async (req, res) => {
    if (req.headers["x-api-key"] !== API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { webhook_url, title, items, footer } = req.body;

    if (!webhook_url) return res.status(400).json({ error: "webhook_url required" });
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "items array required" });
    }

    const wh = parseWebhook(webhook_url);
    if (!wh) return res.status(400).json({ error: "Invalid webhook URL" });

    try {
        const payload = buildPayload({ title, items, footer });

        await rest.post(
            `/webhooks/${wh.id}/${wh.token}?with_components=true`,
            { body: payload }
        );

        res.json({ success: true });
    } catch (e) {
        console.error("[Error]", JSON.stringify(e?.rawError, null, 2) || e?.message);
        res.status(500).json({
            error: e?.rawError?.message || e?.message || "Unknown error",
            details: e?.rawError
        });
    }
});

app.listen(PORT, () => console.log(`JinHub Notif running on port ${PORT}`));
