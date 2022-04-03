import colors, {findColorById, findColorFor} from "../website/colors.js";
import ButtonHandler from "./ButtonHandler.js";
import Connector from "./db/Connector.js";

class ColorHandler {

	constructor() {

		this.cache = {};

	}

	start() {
		setInterval(() => {
			this.run();
		}, 30 * 60 * 1000);
	}

	run() {
		this.clearCache();
	}

	clearCache() {
		this.cache = {};
	}

	async click(snowflake) {
		let percent = ButtonHandler.getCurrentPercent();
		let color = findColorFor(percent)
		if (color.isDefault()) {
			return;
		}
		let oldUserColor
		if (this.cache[snowflake]) {
			oldUserColor = this.cache[snowflake];
		} else {
			this.cache[snowflake] = color;
			oldUserColor = await Connector.getColorOfUser(snowflake);
			oldUserColor = findColorById(oldUserColor);
		}

		if (this.isBetterColor(oldUserColor, color)) {
			this.cache[snowflake] = color;
			Connector.setColorOfUser(snowflake, color);
			return color;
		} else {
			this.cache[snowflake] = oldUserColor;
			return false;
		}
	}

	/**
	 * @param {false|Color} oldColor
	 * @param {Color} newColor
	 * @returns {boolean}
	 */
	isBetterColor(oldColor, newColor) {
		if (!oldColor) {
			return true;
		}
		return newColor.getPercent() < oldColor.getPercent();

	}

}

const colorHandler = new ColorHandler();

export default colorHandler;
