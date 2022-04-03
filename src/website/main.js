import colors, {defaultColor, findColorById, findColorFor} from "./colors.js";
import packets from "./packets.js";

let loc = window.location, webSocketUri;
if (loc.protocol === "https:") {
	webSocketUri = "wss:";
} else {
	webSocketUri = "ws:";
}
webSocketUri += "//" + loc.host;
webSocketUri += loc.pathname;

let webSocket = new WebSocket(webSocketUri + 'button');

function setCookie(name,value,days) {
	let expires = "";
	if (days) {
		let date = new Date(Date.now() + (days*24*60*60*1000))
		expires = "; expires=" + date.toUTCString();
	}
	document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

function getCookie(name) {
	const nameEQ = name + "=";
	const ca = document.cookie.split(';');
	for(let i=0;i < ca.length;i++) {
		let c = ca[i];
		c = c.trim();
		if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length,c.length);
	}
	return null;
}

const elements = {
	ball: document.getElementById('ball'),
	login: document.getElementById('login'),
	clicks: document.getElementById('clicks'),
	mostClicks: document.getElementById('clickleaderboard'),
	bestColor: document.getElementById('colorleaderboard'),
	messageBox: document.getElementById('message'),
	messageButton: document.getElementById('sendMessage'),
	chat: document.getElementById('messages')
}

let clicks = 0;

webSocket.addEventListener('message', (event) => {
	let packet = event.data.substring(0, packets.PACKETWIDTH);
	let msg = event.data.substring(packets.PACKETWIDTH);

	switch (packet) {
		case packets.COUNT:
			elements.ball.style.left = msg + "%";
			let color = findColorFor(msg);
			elements.ball.style.background = color.getColorHex();
			break;
		case packets.IDENTIFY:
			elements.login.innerText = "Logged in as " + msg;
			elements.messageBox.removeAttribute('disabled');
			elements.messageBox.setAttribute('placeholder', 'Write message');
			elements.messageButton.removeAttribute('disabled');
			break;
		case packets.DESTRUCT:
			window.location.reload();
			break;
		case packets.SNOWFLAKE:
			setCookie('snowflake', msg);
			break;
		case packets.LEADERBOARD:
			loadLeaderboard(msg);
			break;
		case packets.CLICK:
			if (msg) {
				clicks = parseInt(msg);
			} else {
				clicks++;
			}
			elements.clicks.innerText = clicks;
			break;
		case packets.CHAT:
			while(elements.chat.childElementCount > 100) {
				elements.chat.removeChild(elements.chat.firstElementChild);
			}
			let components = msg.split('\x01');
			let message = document.createElement('span');
			message.className = 'message';
			let badge = document.createElement('span');
			badge.className = 'badge';
			badge.style.background = (findColorById(parseInt(components[1])) || defaultColor).getColorHex();
			badge.innerText = components[0] + ":";
			let content = document.createTextNode(" " + components[2]);
			message.appendChild(badge);
			message.appendChild(content);
			elements.chat.appendChild(message);
			break;
	}
});

function loadLeaderboard(msg) {
	let index;
	let bestColor = false;
	let mostClicks = false;
	if ((index = msg.indexOf('\x04')) > 0) {
		bestColor = msg.substring(index + 1);
		bestColor = rebuildJson(bestColor);
		msg = msg.substring(0, index);
	}
	if (msg.startsWith('\x01')) {
		mostClicks = msg.substring(1);
		mostClicks = rebuildJson(mostClicks);
	}

	if (mostClicks) {
		elements.mostClicks.innerHTML = "";
		for (let datum of mostClicks) {
			let span = document.createElement('span');
			span.innerText = datum[0] + " - " + datum[1];
			elements.mostClicks.appendChild(span);
		}
	} else {
		elements.mostClicks.innerHTML = '<span>No data</span>';
	}

	if (bestColor) {
		elements.bestColor.innerHTML = "";
		for (let datum of bestColor) {
			let span = document.createElement('span');
			let color = findColorById(parseInt(datum[2]));
			span.style.background = color.getColorHex();
			span.innerText = datum[0] + " - " + new Date(1000 * datum[1]).toLocaleString();
			span.className = "color-datum";
			elements.bestColor.appendChild(span);
		}
	} else {
		elements.bestColor.innerHTML = '<span>No data</span>';
	}
}

function rebuildJson(string) {
	return string.replace(/\x03$/, '').split('\x03').map(element => element.split('\x02'));
}

let style = document.createElement('style');
let styleString = "";
let first = true;
for (let color of colors) {
	if (!first) {
		styleString += color.getPercent() + "%,";
	}
	styleString += `${color.getColorHex()} ${color.getPercent()}% `
	first = false;
}
style.innerText = `body .track {background: linear-gradient(90deg, ${styleString}80%, #ccc 80%)}`;
document.head.appendChild(style);

webSocket.addEventListener('open', () => {
	webSocket.send(packets.INIT);
})

document.getElementById('mainbutton').addEventListener('click', () => {
	webSocket.send(packets.CLICK);
})

document.getElementById('messageForm').addEventListener('submit', (event) => {
	let message = elements.messageBox.value;
	elements.messageBox.value = "";
	webSocket.send(packets.CHAT + message.substring(0, 140));
	event.preventDefault();
});

let cookie = getCookie('snowflake');
if (!cookie) {
	let explanation = document.getElementById('explanation');
	explanation.removeAttribute('hidden');
	setTimeout(() => {
		let button = explanation.getElementsByTagName('button')[0];
		button.removeAttribute('disabled');
		button.addEventListener('click', () => {
			explanation.setAttribute('hidden', '');
		})
	}, 5000)
}
