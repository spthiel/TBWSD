import express from 'express';
import expressWs from 'express-ws';
import buttonHandler from "./ButtonHandler.js";
import packets from '../website/packets.js';
import ColorHandler from "./ColorHandler.js";
import Connector from "./db/Connector.js";
import discordHandler from './discord.js';
import cookieParser from 'cookie-parser';
import connector from './db/Connector.js';
import leaderboardHandler from "./LeaderboardHandler.js";

const app = express();
const ws = expressWs(app);
const port = process.env.PORT || 4600;

app.use("*", (req, res, next) => {
	if (buttonHandler.getCurrentPercent() <= 0) {
		res.status(404);
		res.end();
	} else {
		next();
	}
})

app.use(cookieParser());

const discord = discordHandler(app);

app.use(express.static('src/website'));

let allSockets = ws.getWss("/button*");
leaderboardHandler.setWS(allSockets);

app.ws("/button*", (ws, req) => {

	let snowflake = req.cookies.snowflake;

	ws.on('message', (msg) => {

		let packet = msg.substring(0, packets.PACKETWIDTH);
		msg = msg.substring(packets.PACKETWIDTH);

		switch (packet) {
			case packets.INIT:
				ws.send(packets.COUNT + buttonHandler.getCurrentPercent());
				discord.getUserinfo(req.cookies.dtoken)
					.then(userinfo => {
						if (!snowflake) {
							snowflake = createSnowflake();
							ws.send(packets.SNOWFLAKE + snowflake);
						} else {
						}
						connector.insertUser(userinfo.id, userinfo.username, snowflake)
							.then(ignored => {
								connector.getColorOfUser(snowflake)
									.then(color => {
										ws.send(packets.COLOR + color);
									})
							});
						ws.send(packets.IDENTIFY + userinfo.username);
						leaderboardHandler.sendToSingle(ws);
						return Connector.getClickCount(userinfo.id);
					})
					.then(clicks => {
						ws.send(packets.CLICK + clicks);
					})
					.catch(() => {
						if (!snowflake) {
							// Give not logged in users default snowflake. No data is ever associated with them anywhere
							// Simply disabled the snowflake checks in other packets
							snowflake = 1;
						}
						leaderboardHandler.sendToSingle(ws);
					});
				break;
			case packets.CLICK:
				if (!snowflake) {break;}
				if(buttonHandler.click()) {
					Connector.click(snowflake);
					ColorHandler.click(snowflake)
						.then(color => {
							if (color) {
								ws.send(packets.COLOR + color.dbid);
							}
						});
					ws.send(packets.CLICK);
				}
				break;
			case packets.CHAT:
				if (!snowflake || snowflake === 1) {break;}
				msg = msg.substring(0, 140);
				Connector.getUserInfo(snowflake)
					.then(userinfo => {
						let chatString = userinfo.username + '\x01' + userinfo.color + '\x01' + msg;
						allSockets.clients.forEach(client => client.send(packets.CHAT + chatString));
					})
					.catch(() => {});

		}

	});

});

setInterval(() => {
	if (buttonHandler.getCurrentPercent() < 0) {
		allSockets.clients.forEach(client => client.send(packets.DESTRUCT));
	}
	let currentPercent = buttonHandler.getCurrentPercent();
	allSockets.clients.forEach(client => client.send(packets.COUNT + currentPercent));
}, 10000);

let increment = 0;

function createSnowflake() {
	let snowflake = BigInt(Date.now());
	snowflake -= 1420070400000n;
	snowflake <<= 22n;
	snowflake += BigInt((Math.random() * 0x3FF) | 0) << 12n;
	snowflake += BigInt(increment++ & 0xFFF);
	return snowflake;
}


app.listen(port, () => {
	console.log("App listening to port " + port)
})
