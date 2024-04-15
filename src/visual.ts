import { find } from 'lodash';
import { Cell, Game } from './game';
import './visual.scss';
function createDiv(...clses: string[]) {
	let div = document.createElement('div');
	div.classList.add(...clses);
	return div;
}

interface CellNode extends HTMLDivElement {
	cell: Cell;
	visual: HTMLGame;
}

export class HTMLCell {
	static create(visual: HTMLGame, cell: Cell): CellNode {
		let cellNode = createDiv('cell') as CellNode;
		cellNode.visual = visual;
		cellNode.cell = cell;
		cellNode.onclick = () => console.log(cell);
		Array(visual.game.maxNumber)
			.fill(0)
			.map((_, i) => {
				let guessNode = createDiv('guess');
				guessNode.dataset.guess = (i + 1).toString(16);
				cellNode.appendChild(guessNode);
			});
		if (cell.value) HTMLCell.setValue.call(cellNode, cell.value);
		(['setGuess', 'unsetGuess', 'setValue'] as const).map(e =>
			cell.on(e, HTMLCell[e].bind(cellNode))
		);
		cell.on('solved', () => console.log('Solved'));
		return cellNode;
	}

	static setValue(this: CellNode, value: number) {
		this.dataset.value = value.toString(16);
		this.innerText = value.toString(16);
	}
	static setGuess(this: CellNode, guess: number) {
		(<HTMLDivElement>(
			find(
				this.childNodes,
				(e: HTMLDivElement) => e.dataset.guess == guess.toString(16)
			)
		)).innerText = guess.toString(16);
	}
	static unsetGuess(this: CellNode, guess: number) {
		(<HTMLDivElement>(
			find(
				this.childNodes,
				(e: HTMLDivElement) => e.dataset.guess == guess.toString(16)
			)
		)).innerText = '';
	}
}
export class HTMLGame {
	fieldNode = createDiv('field');
	constructor(public game: Game) {
		game.regions.map(region => {
			let regionNode = createDiv('region');
			region.map(cell => {
				regionNode.append(HTMLCell.create(this, cell));
			});
			this.fieldNode.append(regionNode);
		});
	}
}
