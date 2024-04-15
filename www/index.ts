import { SudokuAlgorithm } from '../src/algorithm';
import { Game } from '../src/game';
import { HTMLGame } from '../src/visual';
let data = require('../data/3.txt').default;
let game = new Game();
game.initFromString(data);

let visual = new HTMLGame(game);
document.body.append(visual.fieldNode);

let algorithm = new SudokuAlgorithm(game);
algorithm.run();

Object.assign(window, { game, visual, algorithm });
