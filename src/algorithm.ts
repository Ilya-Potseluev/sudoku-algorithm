import {
	chunk,
	concat,
	difference,
	isEqual,
	random,
	remove,
	zip,
} from 'lodash';
import { Cell, Game } from './game';

function subsets<T>(arr: T[], maxSubsetLength = Infinity) {
	return arr
		.reduce(
			(subsets: T[][], value) =>
				subsets.concat(subsets.map(set => [value, ...set])),
			[[]]
		)
		.filter(e => e.length && e.length <= maxSubsetLength);
}

type EmptyCell = Cell & { guesses: Set<number> };
type FullCell = Cell & { value: number };

export class SudokuAlgorithm {
	get rows() {
		return this.game.rows.map(this.empty);
	}
	get columns() {
		return this.game.columns.map(this.empty);
	}
	get regionRows() {
		return chunk(this.game.regions, this.game.regionsOnRow);
	}
	get regionColumns(): Cell[][][] {
		return zip<any>(...this.regionRows);
	}

	hasBeenModified = false;
	regions: EmptyCell[][];

	constructor(
		public game: Game,
		public noBruteForce = false,
		public useRandomBrute = false
	) {
		this.regions = <EmptyCell[][]>game.regions.map(e => [...e]);
	}

	clone() {
		let clone = new SudokuAlgorithm(this.game.clone());
		clone.regions = clone.regions.map(this.empty);
		return clone;
	}

	apply(rows: FullCell[][]) {
		for (const cell of this.regions.flat())
			this.setValue(cell, rows[cell.y][cell.x].value);
	}

	forAll(f: (cell: EmptyCell, value: number) => any) {
		for (let value = 1; value <= this.game.maxNumber; value++) {
			for (const cell of this.regions.flat()) {
				if (!cell.guesses) {
					remove(this.regions[cell.regionIndex], cell);
					continue;
				}
				f(<EmptyCell>cell, value);
			}
		}
	}

	setGuesses() {
		this.forAll((cell, value) => {
			if (!cell.connected.find(e => e.value == value))
				cell.setGuess(value);
		});
	}

	solve() {
		this.hasBeenModified = true;
		while (this.hasBeenModified) {
			this.hasBeenModified = false;
			this.iterate();
		}
		if (!this.game.isSolved && !this.noBruteForce) {
			let cells = this.regions.flat();
			let cell =
				cells[this.useRandomBrute ? random(0, cells.length - 1) : 0];
			for (const guess of cell.guesses) {
				let clone = this.clone();
				clone.setValue(clone.game.rows[cell.y][cell.x], guess);
				if (clone.solve()) {
					this.apply(<FullCell[][]>clone.game.rows);
					return true;
				}
			}
		}
		return this.game.isSolved;
	}

	run() {
		this.setGuesses();
		this.solve();
	}

	hasnot(cells: Cell[], value: number) {
		return cells.every(
			cell =>
				(cell.value && cell.value != value) ||
				(cell.guesses && !cell.guesses.has(value))
		);
	}
	empty(cells: Cell[]): EmptyCell[] {
		return cells.filter((e): e is EmptyCell => !!e.guesses);
	}
	setValue(cell: Cell, value: number) {
		cell.setValue(value);
		this.hasBeenModified = true;
		remove(this.regions[cell.regionIndex], cell);
	}
	unsetGuess(cell: Cell, guess: number) {
		if (cell.unsetGuess(guess)) this.hasBeenModified = true;
	}
	iterate() {
		// Очевидное открытие клеток, где может быть только одно значение
		this.forAll((cell, value) => {
			if (cell.guesses.size == 1) {
				let [newValue] = cell.guesses.values();
				this.setValue(cell, newValue);
			} else if (
				cell.guesses.has(value) &&
				(this.hasnot(cell.region, value) ||
					this.hasnot(cell.row, value) ||
					this.hasnot(cell.column, value))
			)
				this.setValue(cell, value);
		});
		// Снятие предположений для случаев, когда ряды занимаются полностью внутри регионов
		for (const [coord, dir] of [
			['y', this.regionRows],
			['x', this.regionColumns],
		] as const)
			for (let value = 1; value <= this.game.maxNumber; value++)
				for (const row of dir)
					row.map(region => ({
						region,
						coordSet: region.reduce(
							(set, e) =>
								(e.guesses?.has(value) && set.add(e[coord])) ||
								set,
							new Set<number>()
						),
					})).forEach((a, _i, sets) => {
						let same = sets.filter(b =>
							isEqual(b.coordSet, a.coordSet)
						);

						if (same.length == a.coordSet.size)
							for (const { region } of difference(sets, same))
								for (const cell of region)
									if (
										cell.guesses &&
										a.coordSet.has(cell[coord])
									)
										this.unsetGuess(cell, value);
					});
		// Снятие предположений для случаев полного занятия области определенными значениями
		for (const region of concat(this.regions, this.rows, this.columns))
			for (const subset of subsets(region, region.length - 1)) {
				let guessesOnlyInSubset = new Set<number>();
				for (const cell of subset)
					for (const guess of cell.guesses)
						if (
							!difference(region, subset).find(e =>
								e.guesses.has(guess)
							)
						)
							guessesOnlyInSubset.add(guess);

				if (guessesOnlyInSubset.size == subset.length)
					for (const cell of subset)
						for (const guess of cell.guesses)
							if (!guessesOnlyInSubset.has(guess))
								this.unsetGuess(cell, guess);
			}
	}
}
