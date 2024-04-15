import {
	concat,
	groupBy,
	isEqual,
	isInteger,
	pick,
	toArray,
	uniq,
	zip,
} from 'lodash';

import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';

type GameEvents = {
	solved: () => void;
	setValue: (value: number) => void;
	setGuess: (guess: number) => void;
	unsetGuess: (guess: number) => void;
};
export class Cell extends (EventEmitter as new () => TypedEmitter<GameEvents>) {
	get column(): Cell[] {
		return this.game.columns[this.x].toSpliced(this.y, 1);
	}
	get row(): Cell[] {
		return this.game.rows[this.y].toSpliced(this.x, 1);
	}
	get region(): Cell[] {
		return this.game.regions[this.regionIndex].filter(e => e != this);
	}

	get connected(): Cell[] {
		return uniq(concat(this.row, this.column, this.region));
	}

	value?: number;
	guesses?: Set<number>;

	constructor(
		public game: Game,
		public x: number,
		public y: number,
		public regionIndex: number,
		value?: number
	) {
		super();
		this.guesses = new Set();
		if (value) this.setValue(value, true);
	}

	clone(game = this.game) {
		let clone = new Cell(game, this.x, this.y, this.regionIndex);
		clone.value = this.value;
		if (this.guesses) clone.guesses = new Set(this.guesses);
		else clone.guesses = undefined;
		return clone;
	}

	private throwIfValue(): asserts this is {
		guesses: Set<number>;
	} {
		if (this.value) throw Error('Value already setted');
	}
	setValue(value: number, skipCheck = false) {
		this.throwIfValue();
		if (
			!skipCheck &&
			(this.game.solution
				? this.game.solution.rows[this.y][this.x].value != value
				: this.connected.find(e => e.value == value))
		)
			throw Error('Wrong value');

		skipCheck ||
			[this, ...this.connected].map(
				e => e.guesses && e.unsetGuess(value)
			);
		this.value = value;
		this.game.numOfSolved++;
		this.guesses = <never>undefined;
		this.emit('setValue', value);
		if (this.game.isSolved) this.emit('solved');
	}

	setGuess(guess: number) {
		this.throwIfValue();
		if (this.connected.find(e => e.value == guess))
			throw Error('Impossible guess');
		let mutated = this.guesses.add(guess);
		if (mutated) this.emit('setGuess', guess);
		return mutated;
	}
	unsetGuess(guess: number) {
		this.throwIfValue();
		let mutated = this.guesses?.has(guess);
		mutated && this.guesses?.delete(guess);
		if (mutated) this.emit('unsetGuess', guess);
		return mutated;
	}
}

export class Game {
	rows: Cell[][] = [];
	columns: Cell[][] = [];
	regions: Cell[][] = [];

	height: number;
	width: number;
	regionWidth: number;
	regionHeight: number;

	solution?: Game;

	numOfSolved: number;

	get maxNumber() {
		return this.regionHeight * this.regionWidth;
	}
	get isSolved() {
		return this.numOfSolved == this.height * this.width;
	}
	get regionsOnRow() {
		return this.width / this.regionWidth;
	}
	get regionsOnColumn() {
		return this.height / this.regionHeight;
	}

	init(data: number[][], regionHeight?: number, regionWidth?: number) {
		console.log(data);
		let height = data.length;
		let width = data[0].length;
		regionHeight ??= height ** 0.5;
		regionWidth ??= width ** 0.5;

		if (
			![
				regionHeight,
				regionWidth,
				height / regionHeight,
				width / regionWidth,
			].some(isInteger) ||
			data.some(row => row.length != data[0].length) ||
			data.flat().some(num => num < 0 || num > regionWidth * regionHeight)
		)
			throw Error('Invalid data');

		Object.assign(this, {
			height,
			width,
			regionHeight,
			regionWidth,
		} satisfies Partial<Game>);

		this.numOfSolved = 0;
		this.rows = data.map((row, y) =>
			row.map(
				(value, x) =>
					new Cell(
						this,
						x,
						y,
						~~(y / regionHeight) * (width / regionWidth) +
							~~(x / regionWidth),
						value ? value : undefined
					)
			)
		);
		this.columns = zip<any>(...this.rows);
		this.regions = toArray(groupBy(this.rows.flat(), e => e.regionIndex));
		this.solution = undefined;
	}

	initFromString(data: string, sep?: string) {
		let rows = data.split(/\r*\n/);
		let hasSpaces = /\s+/.test(rows[0]);
		this.init(
			rows.map(row =>
				row
					.split(sep ?? (hasSpaces ? /\s+/ : ''))
					.map(e => parseInt(e, 16))
			)
		);
	}
	toString(sep = this.maxNumber > 16 ? ' ' : '') {
		return this.rows
			.map(row =>
				row.map(cell => (cell.value ? cell.value : '0')).join(sep)
			)
			.join('\n');
	}

	setSolution(solution: Game) {
		let fields: (keyof Game)[] = [
			'height',
			'width',
			'regionHeight',
			'regionWidth',
		];
		if (!isEqual(pick(this, fields), pick(solution, fields)))
			throw Error('Wrong solution sizes');
		this.solution = solution;
	}

	clone() {
		let clone = new Game();
		Object.assign(
			clone,
			pick<Game, keyof Game>(this, [
				'height',
				'width',
				'regionHeight',
				'regionWidth',
				'numOfSolved',
				'solution',
			])
		);
		clone.rows = this.rows.map(e => e.map(cell => cell.clone(clone)));
		clone.columns = zip<any>(...clone.rows);
		clone.regions = toArray(groupBy(clone.rows.flat(), e => e.regionIndex));
		return clone;
	}
}
