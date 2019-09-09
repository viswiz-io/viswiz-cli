import ProgressBar from 'progress';
import { getCI, log } from './utils';

const ci = getCI();

class Progress {
	constructor(total, current = 0) {
		this.current = current;
		this.total = total;
		this.percent = 0;

		this.ci = ci.isCi;
		this.format = ':percent (:current/:total images)';

		log('');

		if (!this.ci) {
			this.bar = new ProgressBar(`[:bar] ${this.format}`, {
				curr: current,
				incomplete: ' ',
				total,
				width: 30,
			});
		}

		this.render();
	}

	render() {
		if (!this.ci) {
			this.bar.render();
			return;
		}

		const lastPercent = this.percent;

		this.percent = Math.floor((this.current / this.total) * 100);

		if (this.percent !== lastPercent) {
			const msg = this.format
				.replace(':percent', `${this.percent}%`)
				.replace(':current', this.current)
				.replace(':total', this.total);

			log(msg);
		}
	}

	tick() {
		this.current++;

		if (this.ci) {
			this.render();
		} else {
			this.bar.tick();
		}

		if (this.current >= this.total) {
			log('');
		}
	}
}

export default Progress;
