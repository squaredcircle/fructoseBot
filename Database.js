const mysql = require('mysql')

class Database
{
    constructor (db_host, db_user, db_password, db_database)
    {
        this.con = mysql.createConnection({
            host:       db_host,
            user:       db_user,
            password:   db_password,
            database:   db_database
        });
        this.con.connect()
    }

    updateUser (user, next)
    {
        this.con.query('SELECT * FROM users WHERE id = ?', [user.id], (error, results) =>
        {
            if (results.length > 0)
            {
                this.con.query('UPDATE users SET is_bot = ?, first_name = ?, last_name = ?, username = ?, language_code = ? WHERE id = ?',
                    [user.is_bot, user.first_name, user.last_name, user.username, user.language_code, user.id])
                user.level = results[0].level
                user.coin = results[0].coin
                user.income_last = results[0].income_last
            }
            else
            {
                this.con.query('INSERT INTO users (id, is_bot, first_name, last_name, username, language_code) VALUES (?, ?, ?, ?, ?, ?)',
                    [user.id, user.is_bot, user.first_name, user.last_name, user.username, user.language_code])
                user.level = 0
                user.coin = 0
                user.income_last = null
            }

            return next();
        })
    }

    updateChat (chat, user)
    {
        this.con.query('SELECT * FROM chats WHERE id = ?', [chat.id], (error, results) =>
        {
            if (results.length > 0)
            {
                this.con.query('UPDATE chats SET title = ?, username = ?, first_name = ?, last_name = ?, description = ?, invite_link = ? WHERE id = ?',
                    [chat.title, chat.username, chat.first_name, chat.last_name, chat.description, chat.invite_link, chat.id])
            }
            else
            {
                this.con.query('INSERT INTO chats (id, type, title, username, first_name, last_name, description, invite_link) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [chat.id, chat.type, chat.title, chat.username, chat.first_name, chat.last_name, chat.description, chat.invite_link])
            }
        })

        if (user.id !== chat.id)
        {
            this.con.query('SELECT * from users_in_chats WHERE (chat_id = ? AND user_id = ?)', [chat.id, user.id], (error, results) => {
                if (!results.length) {
                    this.con.query('INSERT INTO users_in_chats (user_id, chat_id) VALUES (?, ?)', [user.id, chat.id])
                }
            })
        }

        this.con.query('SELECT * FROM user_chat_stats WHERE user_id = ? AND chat_id = ? AND date = CURDATE()', [user.id, chat.id], (error, results) =>
        {
            if (results.length > 0)
            {
                this.con.query('UPDATE user_chat_stats SET posts = posts + 1 WHERE user_id = ? AND chat_id = ? AND date = CURDATE()', [user.id, chat.id])
            }
            else
            {
                this.con.query('INSERT INTO user_chat_stats (user_id, chat_id, date, posts) VALUES (?, ?, CURDATE(), ?)', [user.id, chat.id, 1])
            }
        })
    }

    getUserChatStats (user_id, chat_id, days, next)
    {
        this.con.query('SELECT * FROM user_chat_stats WHERE user_id = ? AND chat_id = ?' +
            (typeof days === 'undefined' ? '' : ' AND date > DATE(NOW()) + INTERVAL -? DAY'),
            [user_id, chat_id, days], function(error, results) { next(results) }
        )
    }

    getChatPostLeaderboard (chat_id, days, next)
    {
        this.con.query(
            `SELECT user_id, SUM(posts), first_name, last_name, username, level, coin 
            FROM fructosebot.user_chat_stats AS s 
            INNER JOIN fructosebot.users as u
            ON s.user_id = u.id 
            WHERE chat_id = ?` +
            (typeof days === 'undefined' ? '' : ' AND s.date > DATE(NOW()) + INTERVAL -? DAY')
            + ` ORDER BY SUM(posts) DESC`,
            [chat_id, days], function(error, results) { next(results) }
        )
    }
}

module.exports = Database

