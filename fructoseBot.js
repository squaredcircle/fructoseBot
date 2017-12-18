/* fructoseBot.js
        A novel bot for encouraging shitposting.
 */

"use strict";

const Moment = require('moment')

const config = require('./config.json')
const Telegraf = require('telegraf')
const Database = require('./Database.js')
const User = require('./User.js')

const bot = new Telegraf(config.BOT_TOKEN, {username: config.BOT_USERNAME})
const db = new Database(config.DB_HOST, config.DB_USER, config.DB_PASSWORD, config.DB_DATABASE)

bot.on('message', (ctx,next) => {
    db.updateChat(ctx.message.chat, ctx.message.from)
    db.updateUser(ctx.message.from, function() {
        return next(ctx).then(() => { })
    })
})

function graphPosts(stats, days) {
    let daily_stats = new Array(days).fill(0)
    stats.forEach((stat) => {
        let i = Moment().diff(Moment(stat.date), 'days')

        if (Moment(stat.date).isAfter(Moment().subtract(days, 'days'), 'day')) {
            daily_stats[i] = stat.posts
        }
    })
    let height = 5
    let ratio = Math.max(...daily_stats) / (height-1)
    let normalised_stats = daily_stats.map(v => Math.round(v/ratio)).reverse()

    let lines = ""
    let heights = [...Array(height).keys()].reverse()
    heights.forEach((h) => {
        let line = ""
        normalised_stats.forEach((stat) => {
            line += (stat === h) ? " o " : "   "
        })
        lines += `\n${line}`
    })

    let line = ""
    for (let i = 0; i < days; i++) {
        line += Moment().subtract(days - i,'days').format('dd') + " "
    }
    lines += `\n${line}`

    return `<pre>${lines}</pre>`
}

function getGetOrdinal(n) {
    let s=["th","st","nd","rd"],
        v=n%100;
    return n+(s[(v-20)%10]||s[v]||s[0]);
}

function chatLeaderboard(chat_id, days, next) {
    db.getChatPostLeaderboard(chat_id, days, function(leaderboard) {
        let lines = ""
        leaderboard.forEach((i, index) => {
            lines += `<code>${getGetOrdinal(index+1)}</code> ${User.getFullName(i)} (<i>${i['SUM(posts)']}</i>)\n`
        })
        return next(lines)
    })
}

bot.command('/help', function(ctx, next) {
    const days = 14
    db.getUserChatStats(ctx.message.from.id, ctx.message.chat.id, days, function(stats) {
        const posts_total = stats.reduce((acc,cur) => acc + cur.posts, 0)
        const posts_daily = Math.round(posts_total/days)
//🤙
        chatLeaderboard(ctx.message.chat.id, days, function(leaderboard) {
            ctx.replyWithHTML(
                `👋 Hello, ${User.getTitle(ctx.message.from)}.`
                + `\n\n👉 You've been posting about ${posts_daily} times a day.`
                + `\n<pre>        </pre>Here's your activity graph:`
                + `\n\n` + graphPosts(stats, days)
                + `\n\n👉 Activity leaderboard for this chat:`
                + `\n\n` + leaderboard)
            return next(ctx)
        })
    })
})

bot.startPolling()
