import {jsonc} from "jsonc"
import * as fs from "node:fs/promises"

import {OutlineVPN} from "outlinevpn-api"
import dotenv from "dotenv"

import {Telegraf} from "telegraf"

import cron from "node-cron"

dotenv.config()
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

const bot = new Telegraf(process.env.TELEGRAM_API_TOKEN)

async function formatKey(user) {
    if (user.name.includes("FREE ")) {
        var createDate = Date.parse(user.name.split(" ")[1])
        var expiresAfter_days = Number(user.name.split(" ")[2])
        var [h, m, s] = user.name.split(" ")[3].split(":").map(Number)
        createDate = new Date(new Date(createDate).setHours(h, m, s))
        var key = {
            id: user.id,
            country: user.accessUrl.split("@")[1].split(":")[0],
            limit: user.dataLimit?.bytes / 1_000_000_000,
            url: user.accessUrl,
            created: isNaN(createDate) ? undefined : new Date(createDate),
            expiresAfter_days: isNaN(expiresAfter_days)
                ? undefined
                : expiresAfter_days,
        }
        console.log(key)
        return key
    }
}

async function getAllFreeKeys(outlinevpn) {
    var users = await outlinevpn.getUsers()
    var freeKeys = []
    for (var i in users) {
        var user = users[i]
        freeKeys.push(formatKey(user))
    }
    return freeKeys
}

async function createNewFreeKey(
    outlinevpn,
    limit = config.keyConfig.limit,
    liveDays = config.keyConfig.expiresAfter_days,
) {
    var user = await outlinevpn.createUser()
    var status =
        (await outlinevpn.addDataLimit(user.id, limit * 1_000_000_000)) &&
        (await outlinevpn.renameUser(
            user.id,
            `FREE ${new Date().toLocaleDateString(
                "ru-RU",
            )} ${liveDays} ${new Date().toLocaleTimeString("ru-RU")}`,
        ))
    var userChanged = await outlinevpn.getUser(user.id)
    return userChanged
}

async function sendKey(
    chatID,
    key,
    subscribeLink = {text: "Subscribe", link: "https://t.me/telegavpn_bot"},
    autoName = "",
) {
    try {
        var keyAutoName = autoName?.replace(
            "$COUNTRY",
            config.countries[key.country],
        )
        await bot.telegram.sendMessage(
            chatID,
            `${config.countries[key.country]} | ${
                isNaN(key.limit) ? "Unlimited" : "Limit " + key.limit + " GB"
            }${
                isNaN(key.expiresAfter_days)
                    ? ""
                    : " | Expires after " + key.expiresAfter_days + " d."
            }\n<code>${key.url}${autoName ? "#" + keyAutoName : ""}</code>${
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

async function checkExpirations() {
    var servers = config.env.outlineServers
    for (var i in servers) {
        const server = new OutlineVPN({
            apiUrl: servers[i].url,
            fingerprint: servers[i].cert,
        })
        var keys = await getAllFreeKeys(server)
        for (var j in keys) {
            var key = keys[j]
            if (key.expiresAfter_days && key.created) {
                var expiryDate = new Date(key.created)
                expiryDate.setDate(expiryDate.getDate() + key.expiresAfter_days)
                if (new Date() > expiryDate) {
                    await server.deleteUser(key.id)
                    console.log(
                        `Key with ID ${key.id} on server ${key.country} has expired and was deleted`,
                    )
                }
            }
        }
    }
}

// checkExpirations()
var servers = config.env.outlineServers
var serverIter = 0
cron.schedule(config.keyCreateCron, async () => {
    const server = new OutlineVPN({
        apiUrl: servers[serverIter].url,
        fingerprint: servers[serverIter].cert,
    })
    try {
        var key = await formatKey(await createNewFreeKey(server))
        console.log(key)
        for (var i in config.channelIDs) {
            sendKey(
                config.channelIDs[i],
                key,
                config.subscribeLink,
                config.keyConfig.name,
            )
        }
    } catch (err) {
        console.log(err)
    }
    serverIter = serverIter < servers.length - 1 ? serverIter + 1 : 0
})
