import packets from "../website/packets.js";
import Connector from "./db/Connector.js";

class LeaderboardHandler {

	constructor() {

		this.listeners = {};
		this.listenerId = 0;
		this.start();
		this.leaderboardString = null;

	}

	start() {
		setInterval(() => {
			this.run();
		}, 1 * 60 * 1000);
	}

	run() {
		this.buildLeaderboardString().then(leaderboardString => {
			this.ws.clients.forEach(client => {
				client.send(packets.LEADERBOARD + leaderboardString);
			})
		})
	}

	sendToSingle(client) {
		if (this.leaderboardString === null) {
			this.buildLeaderboardString().then(leaderboardString => {
				client.send(packets.LEADERBOARD + leaderboardString);
			})
		} else {
			client.send(packets.LEADERBOARD + this.leaderboardString);
		}
	}

	buildLeaderboardString() {
		let clickLeaderboardPromise = Connector.buildClickLeaderboard();
		let colorLeaderboardPromise = Connector.buildColorLeaderboard();

		return Promise.all([clickLeaderboardPromise, colorLeaderboardPromise])
			.then(([clickLeaderboard, colorLeaderboard]) => {
				let out = "";
				if (clickLeaderboard.length > 0) {
					out += '\x01';
					for (let datum of clickLeaderboard) {
						out += `${datum.username}\x02${datum.count}\x03`
					}
				}
				if (colorLeaderboard.length > 0) {
					out += '\x04';
					for (let datum of colorLeaderboard) {
						out += `${datum.username}\x02${datum.ts}\x02${datum.color}\x03`
					}
				}
				this.leaderboardString = out;
				return out;
			});
	}

	addUpdateListener() {
		let listener;
		return new Promise(resolve => {
			this.listeners[this.listenerId++] = resolve;
		});
	}

	removeUpdateListener(id) {
		delete this.listeners[id]
	}

	setWS(ws) {
		this.ws = ws;
	}

}

const leaderboardHandler = new LeaderboardHandler();

export default leaderboardHandler;
