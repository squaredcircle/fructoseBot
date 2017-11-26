/* fructoseBot.js
        A novel bot for encouraging shitposting.
 */

"use strict";

const config = require('./config.json')
const Telegraf = require('telegraf')
const mysql = require('mysql')

const bot = new Telegraf(config.BOT_TOKEN)
const db = mysql.createConnection({
    host:       config.DB_HOST,
    user:       config.DB_USER,
    password:   config.DB_PASSWORD,
    database:   config.DB_DATABASE
});
db.connect()

function updateUserInDatabase(user, next)
{
    db.query('SELECT * FROM users WHERE id = ?', [user.id], function(error, results)
    {
        if (results.length > 0)
        {
            db.query('UPDATE users SET is_bot = ?, first_name = ?, last_name = ?, username = ?, language_code = ? WHERE id = ?',
                [user.is_bot, user.first_name, user.last_name, user.username, user.language_code, user.id])
        }
        else
        {
            db.query('INSERT INTO users (id, is_bot, first_name, last_name, username, language_code) VALUES (?, ?, ?, ?, ?, ?)',
                [user.id, user.is_bot, user.first_name, user.last_name, user.username, user.language_code])
        }
        user.level = results[0].level;
        user.coin = results[0].coin;
        user.income_last = results[0].income_last;
        return next(user);
    })
}

function updateChatInDatabase(chat, user)
{
    db.query('SELECT * FROM chats WHERE id = ?', [chat.id], function(error, results)
    {
        if (results.length > 0)
        {
            db.query('UPDATE chats SET title = ?, username = ?, first_name = ?, last_name = ?, description = ?, invite_link = ?',
                [chat.title, chat.username, chat.first_name, chat.last_name, chat.description, chat.invite_link])
        }
        else
        {
            db.query('INSERT INTO chats (id, type, title, username, first_name, last_name, description, invite_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [chat.id, chat.type, chat.title, chat.username, chat.first_name, chat.last_name, chat.description, chat.invite_link])
        }
    })

    if (user.id !== chat.id)
    {
        db.query('SELECT * from users_in_chats WHERE (chat_id = ? AND user_id = ?)', [chat.id, user.id], function (error, results) {
            if (!results.length) {
                db.query('INSERT INTO users_in_chats (user_id, chat_id) VALUES (?, ?)', [user.id, chat.id])
            }
        })
    }

    db.query('SELECT * FROM user_chat_stats WHERE user_id = ? AND chat_id = ? AND date = CURDATE()', [user.id, chat.id], function(error, results)
    {
        if (results.length > 0)
        {
            db.query('UPDATE user_chat_stats SET posts = posts + 1 WHERE user_id = ? AND chat_id = ? AND date = CURDATE()', [user.id, chat.id])
        }
        else
        {
            db.query('INSERT INTO user_chat_stats (user_id, chat_id, date, posts) VALUES (?, ?, CURDATE(), ?)', [user.id, chat.id, 1])
        }
    })
}

bot.use((ctx,next) => {

    updateChatInDatabase(ctx.message.chat, ctx.message.from)
    updateUserInDatabase(ctx.message.from, function(user) {
        console.log(user)

        ctx.reply(ctx.message)
        return next(ctx).then(() => {
            console.log('END')
        })
    })
})

bot.startPolling()
