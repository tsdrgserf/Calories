const TelegramBot = require("node-telegram-bot-api");

// 🔑 встав свій токен сюди
const token = "8500744878:AAHknPeiSZrTIKsRzlBlx6wIAHzaiPMhctY";
const bot = new TelegramBot(token, { polling: true });

// база даних в пам’яті
const users = {};

// ---------- BMR ----------
function calculateBMR(weight, height, age, sex) {
    if (sex === "male") {
        return 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
        return 10 * weight + 6.25 * height - 5 * age - 161;
    }
}

// ---------- TDEE ----------
function calculateTDEE(bmr, activity) {
    const map = {
        low: 1.2,
        light: 1.375,
        medium: 1.55,
        high: 1.725,
    };
    return bmr * (map[activity] || 1.2);
}

// ---------- validation ----------
function isValid(value, min, max) {
    return !isNaN(value) && value >= min && value <= max;
}

// ---------- start ----------
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id,
        "Привіт! 🤖\nВикористай /set_profile"
    );
});

// ---------- set_profile ----------
bot.onText(/\/set_profile/, (msg) => {
    const id = msg.chat.id;
    users[id] = { step: "age" };

    bot.sendMessage(id, "Введи вік (10–100):");
});

// ---------- main logic ----------
bot.on("message", (msg) => {
    const id = msg.chat.id;
    const text = msg.text;

    if (!users[id] || text.startsWith("/")) return;

    const u = users[id];

    if (u.step === "age") {
        const age = Number(text);
        if (!isValid(age, 10, 100)) {
            return bot.sendMessage(id, "❌ Вік 10–100:");
        }
        u.age = age;
        u.step = "height";
        return bot.sendMessage(id, "Зріст (100–250):");
    }

    if (u.step === "height") {
        const h = Number(text);
        if (!isValid(h, 100, 250)) {
            return bot.sendMessage(id, "❌ Зріст 100–250:");
        }
        u.height = h;
        u.step = "weight";
        return bot.sendMessage(id, "Вага (30–300):");
    }

    if (u.step === "weight") {
        const w = Number(text);
        if (!isValid(w, 30, 300)) {
            return bot.sendMessage(id, "❌ Вага 30–300:");
        }
        u.weight = w;
        u.step = "sex";
        return bot.sendMessage(id, "Стать (male/female):");
    }

    if (u.step === "sex") {
        if (text !== "male" && text !== "female") {
            return bot.sendMessage(id, "Напиши male або female");
        }
        u.sex = text;
        u.step = "activity";
        return bot.sendMessage(id, "Активність: low / light / medium / high");
    }

    if (u.step === "activity") {
        const allowed = ["low", "light", "medium", "high"];
        if (!allowed.includes(text)) {
            return bot.sendMessage(id, "low / light / medium / high");
        }

        u.activity = text;

        const bmr = calculateBMR(u.weight, u.height, u.age, u.sex);
        const tdee = calculateTDEE(bmr, u.activity);

        u.bmr = Math.round(bmr);
        u.tdee = Math.round(tdee);
        u.step = "done";

        return bot.sendMessage(id,
            `✅ Готово!\nBMR: ${u.bmr}\nTDEE: ${u.tdee}`
        );
    }
});

// ---------- profile ----------
bot.onText(/\/my_profile/, (msg) => {
    const id = msg.chat.id;
    const u = users[id];

    if (!u || u.step !== "done") {
        return bot.sendMessage(id, "Спочатку /set_profile");
    }

    bot.sendMessage(id,
        `👤 Профіль:\n` +
        `Вік: ${u.age}\n` +
        `Зріст: ${u.height}\n` +
        `Вага: ${u.weight}\n` +
        `Активність: ${u.activity}\n` +
        `BMR: ${u.bmr}\n` +
        `TDEE: ${u.tdee}`
    );
});