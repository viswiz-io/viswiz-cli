export const instances = [];

export default class Progress {
	constructor(total, current) {
		this.current = current;
		this.total = total;
		instances.push(this);
	}

	tick() {
		this.current++;
	}
}
