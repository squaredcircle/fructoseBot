class User
{
    constructor()
    {

    }

    static getFullName (user)
    {
        return typeof user.last_name === 'undefined'
            ? `<b>${user.first_name}</b>` : `<b>${user.first_name} ${user.last_name}</b>`
    }

    static getTitle (user)
    {
        return `${this.getFullName(user)}, the <b>Level ${user.level} Plebeian</b>`
    }
}

module.exports = User