class Color {

	/**
	 * @param {string} name
	 * @param {string} color
	 * @param {int} id
	 * @param {int} percent
	 */
	constructor(name, color, id, percent) {
		/**
		 * @private
		 * @type {Number}
		 */
		this.color = this.getColorFromHex(color);
		/**
		 * @private
		 * @type {string}
		 */
		this.name = name;
		/**
		 * @internal
		 * @type {number}
		 */
		this.dbid = id;

		/**
		 * @private
		 * @type {Number}
		 */
		this.percent = percent;

		this.default = this.name === "";
	}

	/**
	 * @private
	 * @param color
	 * @returns {number}
	 */
	getColorFromHex(color) {
		if (color.startsWith('#')) {
			color = color.substring(1);
		}
		return parseInt(color, 16);
	}

	/**
	 * @public
	 * @returns {string}
	 */
	getColorHex() {
		let hex = this.color.toString(16);
		return "#" + "000000".substring(0, 6-hex.length) + hex;
	}

	/**
	 * @internal
	 * @returns {string}
	 */
	getDBString() {
		return `(${this.dbid}, ${this.color}, "${this.name}")`;
	}

	getPercent() {
		return this.percent;
	}

	isDefault() {
		return this.default;
	}
}

export const defaultColor = new Color('', '#cccccc', 0, 80);

const colors = [
	new Color('Eagle', '#90ee90', 1, 60),
	new Color('Birdie', '#adff2f', 2, 40),
	new Color('Par', '#f0e68c', 3, 20),
	new Color('Bogey', '#f08080', 4, 5),
	new Color('Double Bogey', '#ed143d', 5, 0)
]
	.sort((a, b) => a.getPercent() - b.getPercent());


export default colors;

export function findColorFor(percent) {
	if (percent >= defaultColor.getPercent()) {
		return defaultColor;
	}
	for (let i = colors.length-1; i >= 0; i--){
		let color = colors[i];
		if (color.getPercent() <= percent) {
			return color;
		}
	}
	throw Error('Eh what are you doing? Button is dead.');
}

export function findColorById(id) {
	for (let color of colors) {
		if (color.dbid === id) {
			return color;
		}
	}
	return undefined;
}
