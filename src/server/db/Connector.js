import mysql from 'mysql2';
import colors from "../../website/colors.js";

const tables = [
	`
	CREATE TABLE IF NOT EXISTS colors (
		uid int(16) unsigned default 0 not null primary key,
	    color mediumint(8) unsigned default 0 not null,
	    colorname varchar(255) default '' not null
	)`,
	`
	CREATE TABLE IF NOT EXISTS users (
        discordId bigint unsigned not null PRIMARY KEY,
        uid int(16) unsigned not null AUTO_INCREMENT unique,
	    username varchar(255) default '',
	    snowflake bigint unsigned default 0 not null
	    
	)`,
	`
	CREATE TABLE IF NOT EXISTS clicks (
	    uid int(16) unsigned,
	    ts TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP,
		
	    constraint fk_clicks_users FOREIGN KEY (uid) REFERENCES users(uid)
	)
	`,
	`
	CREATE TABLE IF NOT EXISTS user_colors (
	    uid int(16) unsigned primary key,
		color int(16) unsigned NULL,
        ts TIMESTAMP(0) DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	    
        constraint fk_user_colors_users FOREIGN KEY (uid) REFERENCES users(uid)
			ON DELETE SET DEFAULT
			ON UPDATE CASCADE,
        constraint fk_user_colors_colors FOREIGN KEY (color) REFERENCES colors(uid)
            ON DELETE SET DEFAULT
            ON UPDATE CASCADE
	)
	`,
	`
	CREATE TABLE IF NOT EXISTS hp (
	    id int(16) default 0 primary key,
	    hp int(16) default 0
	)
	`
];

class Connector {

	constructor() {
		this.pool = mysql.createPool({
			connectionLimit: 10,
			host: process.env.DBHOST,
			port: process.env.DBPORT,
			database: process.env.DBDB,
			user: process.env.DBUSER,
			password: process.env.DBPASSWORD
		});

		this.pool.getConnection((err, connection) => {
			if (err) {
				console.error(err);
			}
			else {
				this.onConnect(connection);
			}
		})
	}

	onConnect(connection) {
		for (let table of tables) {
			connection.query(table, (err) => {
				if (err) {
					console.log(err);
				}
			});
		}
		connection.query(`INSERT INTO colors (uid, color, colorname) VALUES ${colors.map(color => color.getDBString()).join(',')} ON DUPLICATE KEY UPDATE color = values(color), colorname = values(colorname)`)
	}

	/**
	 * @param query
	 * @param values
	 * @return {Promise<Object[]>}
	 */
	query(query, values) {
		return new Promise((resolve, reject) => {
			this.pool.query(query, values, (err, data) => {
				if (err) {
					reject(err);
				} else {
					resolve(data);
				}
			});
		});
	}

	escape(string) {
		return mysql.escape(string);
	}

	insertUser(id, username, snowflake) {
		return this.query('INSERT INTO users (discordId, username, snowflake) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE username = VALUES(username), snowflake = VALUES(snowflake)', [id, username, snowflake])
	}

	click(snowflake) {
		this.pool.query('INSERT INTO clicks (uid) SELECT uid FROM users WHERE snowflake = ?', snowflake)
	}

	/**
	 * @param discordId
	 * @returns {Promise<int>}
	 */
	getClickCount(discordId) {
		return new Promise(resolve => {
			this.pool.query('SELECT count(*) as count FROM users JOIN clicks ON clicks.uid = users.uid WHERE users.discordId = ?', discordId, (err, result) => {
				if (!err) {
					resolve(result[0]['count']);
				}
			})
		})
	}

	buildClickLeaderboard() {
		return new Promise((resolve, reject) => {
			this.pool.query('SELECT users.username, count(*) as count FROM users JOIN clicks ON clicks.uid = users.uid GROUP BY users.username ORDER BY count DESC', (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}
			})
		})
	}

	buildColorLeaderboard() {
		return new Promise((resolve, reject) => {
			this.pool.query('SELECT users.username, user_colors.color, UNIX_TIMESTAMP(user_colors.ts) as ts FROM user_colors JOIN users ON user_colors.uid = users.uid ORDER BY user_colors.color DESC, ts', (err, result) => {
				if (err) {
					reject(err);
				} else {
					resolve(result);
				}
			})
		})
	}

	getColorOfUser(snowflake) {
		return new Promise((resolve, reject) => {
			this.pool.query('SELECT user_colors.color as color, user_colors.ts FROM user_colors JOIN users ON user_colors.uid = users.uid WHERE users.snowflake = ?', snowflake, ((err, result) => {
				if (err) {
					reject(err)
				} else {
					if (result.length === 0) {
						resolve(false);
					} else {
						resolve(result[0].color);
					}
				}
			}))
		})
	}

	/**
	 * @param snowflake
	 * @param {Color} color
	 * @return {Promise<Object[]>}
	 */
	setColorOfUser(snowflake, color) {
		return this.query('INSERT INTO user_colors (uid, color) SELECT uid, ? as color FROM users WHERE snowflake = ? ON DUPLICATE KEY UPDATE color = VALUES(color)', [color.dbid, snowflake])
	}

	getHP() {
		return this.query('SELECT hp FROM hp WHERE id = 1')
			.then(result => {
				if (result.length > 0) {
					return result[0].hp
				} else {
					return undefined;
				}
			})
	}

	setHP(hp) {
		return this.query('INSERT INTO hp (id, hp) VALUES (1, ?) ON DUPLICATE KEY UPDATE hp = VALUES(hp)', hp);
	}

	getUserInfo(snowflake) {
		return this.query('SELECT users.username, user_colors.color FROM users LEFT JOIN user_colors ON user_colors.uid = users.uid WHERE snowflake = ?', [snowflake])
			.then(result => {
				if (result.length === 0) {
					throw Error('User not present');
				}
				return result[0];
			})
	}

}

const connector = new Connector();

export default connector;
