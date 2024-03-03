import {OutlineVPN} from "outlinevpn-api"
import dotenv from "dotenv"

import {Telegraf} from "telegraf"

dotenv.config()

const outlinevpn = new OutlineVPN({
    apiUrl: process.env.OUTLINE_API_URL,
    fingerprint: process.env.OUTLINE_API_FINGERPRINT,
})

const bot = new Telegraf(process.env.TELEGRAM_API_TOKEN)

const countries = {
    IT: "🇮🇹 Италия",
    DE: "🇩🇪 Германия",
    SE: "🇸🇪 Швеция",
}

async function getAllFreeKeys() {
    var users = await outlinevpn.getUsers()
    var freeKeys = []
    for (var i in users) {
        var user = users[i]
        if (user.name.includes("FREE")) {
            var createDate = Date.parse(user.name.split(" ")[1])
            var expiresAfter_days = Number(user.name.split(" ")[2])
            freeKeys.push({
                country: user.accessUrl
                    .split("@")[1]
                    .split(".")[0]
                    .toUpperCase(),
                limit: user.dataLimit?.bytes / 1_000_000_000,
                url: user.accessUrl,
                created: isNaN(createDate)
                    ? undefined
                    : new Date(createDate).toLocaleDateString("ru-RU"),
                expiresAfter_days: isNaN(expiresAfter_days)
                    ? undefined
                    : expiresAfter_days,
            })
        }
    }
    return freeKeys
}

async function createNewFreeKey(limit = 25, liveDays = 1) {
    var user = await outlinevpn.createUser()
    var status =
        (await outlinevpn.addDataLimit(user.id, limit * 1_000_000_000)) &&
        (await outlinevpn.renameUser(
            user.id,
            `FREE ${new Date().toLocaleDateString("ru-RU")} ${liveDays}`,
        ))
    var userChanged = await outlinevpn.getUser(user.id)
    return status ? userChanged : user
}

async function sendKey(
    chatID,
    key,
    subscribeLink = {text: "Subscribe", link: "https://t.me/telegavpn_bot"},
) {
    try {
        await bot.telegram.sendMessage(
            chatID,
            `${countries[key.country]} | ${
                isNaN(key.limit) ? "Безлимит" : "Лимит " + key.limit + " ГБ"
            }${
                isNaN(key.expiresAfter_days)
                    ? ""
                    : " | Действует " + key.expiresAfter_days + " дн."
            }\n<code>${key.url}</code>${
                subscribeLink && subscribeLink.text && subscribeLink.link
                    ? '\n\n<a href="' +
                      subscribeLink.link +
                      '">' +
                      subscribeLink.text +
                      "</a>"
                    : ""
            }`,
            {parse_mode: "HTML"},
        )
        console.log(`Message sent to chat with ID: ${chatID}`)
    } catch (error) {
        console.error(`Failed to send message to chat ID: ${chatID}`, error)
    }
}

// console.log(await createNewFreeKey())
const freeKeys = await getAllFreeKeys()
console.log(freeKeys)
// sendKey("-1002023559139", freeKeys[0])
sendKey("946602610", freeKeys[0], {
    text: "Купить VPN",
    link: "https://t.me/protectpulsebot?start=fc1",
})
