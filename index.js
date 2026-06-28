const express = require("express");
const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");

const app = express();
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_KEY   = process.env.API_KEY;
const PORT      = process.env.PORT || 3000;

if (!BOT_TOKEN) { console.error("BOT_TOKEN missing"); process.exit(1); }
if (!API_KEY)   { console.error("API_KEY missing");   process.exit(1); }

const rest = new REST({ version: "10" }).setToken(BOT_TOKEN);

// Parse webhook URL → { id, token }
function parseWebhook(url) {
    const match = url.match(/discord\.com\/api\/webhooks\/(\d+)\/([^/?]+)/);
    if (!match) return null;
    return { id: match[1], token: match[2] };
}

// Build Components V2 payload
function buildPayload(data) {
    const { title, items, footer } = data;

    const components = [];

    // Container start
    const containerChildren = [];

    // Header
    if (title) {
        containerChildren.push({
            type: 10,
            content: `**${title}**`
        });
        containerChildren.push({ type: 14, spacing: 1, divider: true });
    }

    // Sections per item
    for (let i = 0; i < items.length; i++) {
        const item = items[i];

        // Build text lines
        const lines = [];
        if (item.name)    lines.push(`**Name :** ${item.name}`);
        if (item.stock !== undefined) lines.push(`**Stock :** ${item.stock}`);
        if (item.type)    lines.push(`**Type :** ${item.type}`);
        if (item.rarity)  lines.push(`**Rarity :** ${item.rarity}`);
        if (item.price)   lines.push(`**Price :** ¢${item.price}`);
        if (item.extra)   lines.push(`**Extra :** ${item.extra}`);

        const section = {
            type: 9,
            components: [
                { type: 10, content: lines.join("\n") }
            ]
        };

        if (item.imageUrl) {
            section.accessory = {
                type: 11,
                media: { url: item.imageUrl }
            };
        }

        containerChildren.push(section);

        // Separator between items (not after last)
        if (i < items.length - 1) {
            containerChildren.push({ type: 14, spacing: 1, divider: true });
        }
    }

    // Footer
    if (footer) {
        containerChildren.push({ type: 14, spacing: 1, divider: false });
        containerChildren.push({
            type: 10,
            content: `-# ${footer}`
        });
    }

    components.push({
        type: 17,
        accent_color: data.color || 0x2b5ce6,
        components: containerChildren
    });

    return {
        flags: 32768,
        components
    };
}

// Health check
app.get("/", (req, res) => res.json({ status: "JinHub Notif OK" }));

// Main endpoint
app.post("/send", async (req, res) => {
    // Auth
    if (req.headers["x-api-key"] !== API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { webhook_url, title, items, footer, color } = req.body;

    if (!webhook_url) return res.status(400).json({ error: "webhook_url required" });
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "items array required" });
    }

    const wh = parseWebhook(webhook_url);
    if (!wh) return res.status(400).json({ error: "Invalid webhook URL" });

    try {
        const payload = buildPayload({ title, items, footer, color });

        // Kirim via bot REST ke webhook URL user dengan ?with_components=true
        // Bot REST otomatis set Authorization header → jadi application-owned request
        await rest.post(
            `/webhooks/${wh.id}/${wh.token}?with_components=true`,
            { body: payload }
        );

        res.json({ success: true });
    } catch (e) {
        console.error("[Error]", e?.rawError || e?.message || e);
        res.status(500).json({ error: e?.rawError?.message || e?.message || "Unknown error" });
    }
});

app.listen(PORT, () => console.log(`JinHub Notif running on port ${PORT}`));
