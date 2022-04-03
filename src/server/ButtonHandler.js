import Connector from "./db/Connector.js";

class ButtonHandler {

	constructor() {
		this.max = 86400;
		this.current = 0;
		Connector.getHP().then(value => {
			if (value === undefined) {
				this.current = this.max;
			} else {
				this.current = value;
			}
		}).catch(err => {
			this.current = this.max;
		})
		this.start();
	}

	click() {
		if (this.current < 0) {
			return false;
		}
		if (this.current < this.max) {
			this.current++;
			return true;
		} else {
			return false;
		}
	}

	getCurrentPercent() {
		return (100*this.current/this.max).toFixed(3);
	}

	start() {
		setInterval(() => {
			this.deplete();
		}, 1000);
	}

	deplete() {
		this.current--;
		Connector.setHP(this.current);
	}

}

const buttonHandler = new ButtonHandler();

export default buttonHandler;
