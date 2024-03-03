import {jsonc} from "jsonc"
import * as fs from "node:fs/promises"

import {OutlineVPN} from "outlinevpn-api"
import dotenv from "dotenv"

import {Telegraf} from "telegraf"

import cron from "node-cron"

dotenv.config()

const outlinevpn = new OutlineVPN({
    apiUrl: process.env.OUTLINE_API_URL,
    fingerprint: process.env.OUTLINE_API_FINGERPRINT,
})

const bot = new Telegraf(process.env.TELEGRAM_API_TOKEN)

var config = {}
try {
    config = jsonc.parse(
        await fs.readFile(new URL("./config.jsonc", import.meta.url), {
            encoding: "utf-8",
        }),
    )
} catch (err) {
    console.error(err.message)
}

async function getAllFreeKeys() {
    var users = await outlinevpn.getUsers()
    var freeKeys = []
    for (var i in users) {
        var user = users[i]
        if (user.name.includes("FREE")) {
            var createDate = Date.parse(user.name.split(" ")[1])
            var expiresAfter_days = Number(user.name.split(" ")[2])
            var key = {
                id: user.id,
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
            }
            freeKeys.push(key)
            // console.log(key)
        }
    }
    return freeKeys
}

async function createNewFreeKey(
    limit = config.keyConfig.limit,
    liveDays = config.keyConfig.expiresAfter_days,
) {
    var user = await outlinevpn.createUser()
    var status =
        (await outlinevpn.addDataLimit(user.id, limit * 1_000_000_000)) &&
        (await outlinevpn.renameUser(
            user.id,
            `FREE ${new Date().toLocaleDateString("ru-RU")} ${liveDays}`,
        ))
    var userChanged = await outlinevpn.getUser(user.id)
    return userChanged
}

async function sendKey(
    chatID,
    key,
    subscribeLink = {text: "Subscribe", link: "https://t.me/telegavpn_bot"},
) {
    try {
        await bot.telegram.sendMessage(
            chatID,
            `${config.countries[key.country]} | ${
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

cron.validate(config.keyCreateCron) ? undefined : console.error("Invalid key create expression")
cron.schedule(config.keyCreateCron, async () => {
    try {
        var key = await createNewFreeKey()
        console.log(key)
        for (var i in config.channelIDs) {
            sendKey(config.channelIDs[i], key, config.subscribeLink)
        }
    } catch (err) {
        console.log(err)
    }
})
