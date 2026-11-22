// The library: chess ideas every player should know, each with a short explanation, an example
// position, and for many a puzzle to try. Written for this app. Every position and puzzle is
// checked by `npm run library:check` (legal moves, and Stockfish agrees the answer is best).

export type Category =
	'tactics' | 'checkmates' | 'positional' | 'pawns' | 'endgames' | 'principles';

export const CATEGORIES: Record<Category, { label: string; about: string }> = {
	tactics: { label: 'Tactics', about: 'Short, forcing tricks that win material.' },
	checkmates: { label: 'Checkmates', about: 'Mating patterns that come up again and again.' },
	positional: { label: 'Positional', about: 'Where pieces belong when nothing is forced yet.' },
	pawns: { label: 'Pawn structure', about: 'Pawn shapes, and what they mean for the plans.' },
	endgames: { label: 'Endgames', about: 'Few pieces left: technique you can learn once.' },
	principles: { label: 'Principles', about: 'Rules of thumb and words every player uses.' }
};

/**
 * A board with marks. Each mark is "e2e4" (arrow) or "d5" (circle), green unless prefixed
 * with "r:" (red) or "b:" (blue).
 */
export interface Diagram {
	fen: string;
	marks?: string[];
	caption: string;
}

export interface Puzzle {
	fen: string;
	/** What to look for, e.g. "Win the rook." */
	prompt: string;
	/** SAN moves: yours at even indexes, the opponent's replies at odd ones */
	moves: string[];
	/** Other first moves that work just as well (accepted, ending the puzzle) */
	accept?: string[];
	/** The move shows a rule, not the engine's favorite: skip the "is it best" check */
	rule?: boolean;
}

export interface Concept {
	id: string;
	name: string;
	category: Category;
	/** One sentence: the definition the quiz asks about */
	summary: string;
	/** A few short paragraphs */
	body: string[];
	diagram?: Diagram;
	puzzle?: Puzzle;
}

export const CONCEPTS: Concept[] = [
	// Tactics
	{
		id: 'fork',
		name: 'Fork',
		category: 'tactics',
		summary: 'One piece attacks two or more enemy pieces at the same time.',
		body: [
			'The opponent can only save one of them. Knights are the classic forkers because they jump and attack in ways that are easy to miss, but every piece (even a pawn or the king) can fork.',
			'A fork with check (the king is one of the targets) is the strongest, since the king has to move first.',
			'Look for squares where your piece would touch two undefended or more valuable pieces.'
		],
		puzzle: {
			fen: 'r3k3/6pp/8/3N4/8/8/6PP/4K3 w - - 0 1',
			prompt: 'Win the rook.',
			moves: ['Nc7+', 'Kd7', 'Nxa8']
		}
	},
	{
		id: 'pin',
		name: 'Pin',
		category: 'tactics',
		summary:
			'A piece can’t move (or shouldn’t) because a more valuable piece is behind it on the same line.',
		body: [
			'When the piece behind is the king, the pin is absolute: moving the pinned piece is illegal. Otherwise it’s relative: legal, but it loses the piece behind.',
			'A pinned piece is a sitting target. Attack it again, often with a pawn, and it can’t run away.',
			'Bishops, rooks and queens pin. Knights and pawns can’t.'
		],
		puzzle: {
			fen: '4k3/pp3ppp/2n5/1B6/3P4/8/PP3PPP/4K3 w - - 0 1',
			prompt: 'The knight is pinned to the king. Win it.',
			moves: ['d5']
		}
	},
	{
		id: 'skewer',
		name: 'Skewer',
		category: 'tactics',
		summary:
			'An attack on a valuable piece that has to move out of the way, exposing a piece behind it.',
		body: [
			'A skewer is a pin turned around: the more valuable piece is in front. When it moves, you take what was behind it.',
			'Skewers with check are common in endgames, where kings and rooks stand on open lines.'
		],
		puzzle: {
			fen: '8/8/8/8/r3k3/8/7R/6K1 w - - 0 1',
			prompt: 'The king and rook are on the same rank. Win the rook.',
			moves: ['Rh4+', 'Kd5', 'Rxa4']
		}
	},
	{
		id: 'discovered-attack',
		name: 'Discovered attack',
		category: 'tactics',
		summary: 'Moving one piece out of the way reveals an attack by another piece behind it.',
		body: [
			'Two threats arrive at once: the piece that moved can attack something, while the piece behind it attacks too.',
			'When the revealed attack is a check, it’s a discovered check, and the moving piece can go almost anywhere, even capture a queen.'
		],
		puzzle: {
			fen: '4k3/8/8/q3N3/8/8/4R3/6K1 w - - 0 1',
			prompt: 'The knight is blocking your rook. Move it with a purpose.',
			moves: ['Nc4+', 'Kd8', 'Nxa5'],
			accept: ['Nc6+']
		}
	},
	{
		id: 'double-check',
		name: 'Double check',
		category: 'tactics',
		summary: 'Two pieces give check at once, so the only defense is to move the king.',
		body: [
			'You can’t block two checks or capture two checkers in one move. That makes double check the most forcing move in chess.',
			'It usually comes from a discovered check where the moving piece also gives check.'
		],
		puzzle: {
			fen: '3qkb2/3p1p2/8/8/4N3/8/8/4R1K1 w - - 0 1',
			prompt: 'Checkmate in one with a double check.',
			moves: ['Nd6#'],
			accept: ['Nf6#']
		}
	},
	{
		id: 'removing-the-defender',
		name: 'Removing the defender',
		category: 'tactics',
		summary: 'Capture or chase away the piece that guards something, then take what it guarded.',
		body: [
			'Count what each enemy piece is defending. If one piece holds everything together, it’s a target.',
			'Often you give up material (like a bishop for a knight) because what falls after is worth more.'
		],
		puzzle: {
			fen: '5rk1/5ppp/5n2/6B1/8/3B3Q/8/6K1 w - - 0 1',
			prompt: 'Only the knight stops mate on h7.',
			moves: ['Bxf6', 'gxf6', 'Qxh7#']
		}
	},
	{
		id: 'deflection',
		name: 'Deflection',
		category: 'tactics',
		summary: 'Force a defending piece away from the square or line it has to guard.',
		body: [
			'Attack the defender, or offer it something it must take. Either way it leaves its post.',
			'Back ranks are the usual victims: a piece guarding against mate gets dragged off the eighth rank.'
		]
	},
	{
		id: 'overloading',
		name: 'Overloading',
		category: 'tactics',
		summary: 'One piece has two defensive jobs, so it can’t do both.',
		body: [
			'If a piece guards two things, take one of them. When it recaptures, the other is left undefended.',
			'Overloading and deflection are close cousins: you exploit a defender that is stretched too thin.'
		]
	},
	{
		id: 'zwischenzug',
		name: 'Zwischenzug',
		category: 'tactics',
		summary: 'An in-between move: instead of the expected reply, first play a stronger threat.',
		body: [
			'German for “in-between move”. When a recapture seems forced, check first whether a check or a bigger threat comes first.',
			'The opponent has to answer it, and then you recapture anyway, a tempo better off.'
		]
	},
	{
		id: 'x-ray',
		name: 'X-ray',
		category: 'tactics',
		summary:
			'A piece attacks or defends a square through another piece standing in between on the same line.',
		body: [
			'Rooks stacked on a file, or a queen behind a bishop, work through each other. When the piece in front is traded off, the one behind is already there.',
			'It also explains surprising defenses: a rook can protect a square even though an enemy rook stands between.'
		]
	},
	{
		id: 'trapped-piece',
		name: 'Trapped piece',
		category: 'tactics',
		summary: 'A piece with no safe squares left, so it can be attacked and won.',
		body: [
			'Pieces that go deep into enemy territory, or grab a pawn on the edge, can find every exit covered.',
			'A classic: a bishop takes a pawn on a7 or h7 and gets shut in by a pawn move like ...b6 or ...g6.'
		]
	},
	{
		id: 'desperado',
		name: 'Desperado',
		category: 'tactics',
		summary: 'A piece that is lost anyway takes as much as it can before it goes.',
		body: [
			'If your piece is attacked and can’t be saved, don’t just let it go: capture something with it first.',
			'Common in sequences of trades where both sides have pieces hanging at once.'
		]
	},
	{
		id: 'loose-pieces',
		name: 'Loose pieces drop off',
		category: 'tactics',
		summary: 'Undefended pieces are the ones that get lost to tactics.',
		body: [
			'Most forks, skewers and double attacks only work because a target is undefended.',
			'Before each move, glance at which of your pieces nothing protects. Keeping them defended takes the sting out of most tactics.'
		]
	},

	// Checkmates
	{
		id: 'back-rank-mate',
		name: 'Back-rank mate',
		category: 'checkmates',
		summary: 'A rook or queen mates a king stuck behind its own pawns on the back rank.',
		body: [
			'The pawns in front of a castled king are a shield, but they also block the exits.',
			'The cure is “luft”: a pawn move like h3 or ...h6 that gives the king an escape square.'
		],
		puzzle: {
			fen: '6k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
			prompt: 'Mate in one.',
			moves: ['Rd8#']
		}
	},
	{
		id: 'smothered-mate',
		name: 'Smothered mate',
		category: 'checkmates',
		summary: 'A knight mates a king that is boxed in by its own pieces.',
		body: [
			'Only a knight can do this, since it jumps over the wall around the king.',
			'The famous version sacrifices the queen on g8 to force a rook into the corner, then mates with the knight on f7.'
		],
		puzzle: {
			fen: '6rk/6pp/8/6N1/8/8/8/6K1 w - - 0 1',
			prompt: 'Mate in one.',
			moves: ['Nf7#']
		}
	},
	{
		id: 'scholars-mate',
		name: 'Scholar’s mate',
		category: 'checkmates',
		summary: 'The four-move mate: queen and bishop team up on the f7 (or f2) pawn.',
		body: [
			'Early in the game f7 is defended only by the king, which makes it the weakest square on the board.',
			'It’s easy to stop (…Qe7, …g6 or …Nf6 at the right moment), but you should know it so it never happens to you.'
		],
		puzzle: {
			fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
			prompt: 'Black just played …Nf6. Punish it.',
			moves: ['Qxf7#']
		}
	},
	{
		id: 'ladder-mate',
		name: 'Ladder mate',
		category: 'checkmates',
		summary:
			'Two rooks (or rook and queen) take turns cutting off ranks until the king hits the edge.',
		body: [
			'One rook holds a rank so the king can’t come back; the other gives check one rank further.',
			'Keep the rooks far from the enemy king so it can’t attack them.'
		],
		puzzle: {
			fen: '6k1/8/8/8/8/8/R7/1R4K1 w - - 0 1',
			prompt: 'Mate in two with the rooks.',
			moves: ['Ra7', 'Kf8', 'Rb8#'],
			accept: ['Rb7']
		}
	},
	{
		id: 'arabian-mate',
		name: 'Arabian mate',
		category: 'checkmates',
		summary:
			'A rook mates a king in the corner, protected by a knight that also covers the escape.',
		body: [
			'The knight sits two squares diagonally from the corner and guards the rook and one escape square at once.',
			'One of the oldest recorded mating patterns.'
		],
		puzzle: {
			fen: '7k/1R6/5N2/8/8/8/8/6K1 w - - 0 1',
			prompt: 'Mate in one.',
			moves: ['Rh7#']
		}
	},
	{
		id: 'anastasias-mate',
		name: 'Anastasia’s mate',
		category: 'checkmates',
		summary: 'A knight and rook mate a king trapped on the edge by its own pawn.',
		body: [
			'The knight covers the escape squares in front, the rook checks along the edge file.',
			'Watch for it when the enemy king has castled and a knight lands on e7 (or e2).'
		],
		puzzle: {
			fen: '8/4N1pk/8/3R4/8/8/8/6K1 w - - 0 1',
			prompt: 'Mate in one.',
			moves: ['Rh5#']
		}
	},

	// Positional
	{
		id: 'outpost',
		name: 'Outpost',
		category: 'positional',
		summary: 'A square in enemy territory that no enemy pawn can ever attack, ideal for a knight.',
		body: [
			'A knight on an outpost can’t be chased away by pawns, so it stays there for the whole game, eyeing squares deep in the enemy camp.',
			'Outposts come from pawn moves: once a pawn passes a square, it can never guard it again.'
		],
		diagram: {
			fen: 'r4rk1/pp3ppp/3p4/3Np3/4P3/8/PPP2PPP/R4RK1 w - - 0 1',
			marks: ['d5'],
			caption: 'No black pawn can ever attack d5. The knight is there to stay.'
		}
	},
	{
		id: 'open-file',
		name: 'Open file',
		category: 'positional',
		summary: 'A file with no pawns on it: the highway for rooks.',
		body: [
			'Rooks are strongest on open files, where they can go deep into the enemy position.',
			'If both sides want the file, doubling your rooks on it usually wins the fight. A half-open file (only enemy pawns on it) is good too.'
		],
		diagram: {
			fen: '6k1/pp3ppp/4p3/8/8/4P3/PP3PPP/3R2K1 w - - 0 1',
			marks: ['d1d7'],
			caption: 'The d-file is open, and White’s rook owns it.'
		}
	},
	{
		id: 'seventh-rank',
		name: 'Rook on the seventh',
		category: 'positional',
		summary: 'A rook on the opponent’s second rank attacks pawns from the side and traps the king.',
		body: [
			'Pawns that haven’t moved are easy prey from the side, and the king is pinned to the back rank.',
			'Two rooks on the seventh (“pigs on the seventh”) often win outright.'
		],
		diagram: {
			fen: '6k1/pp1R1ppp/4p3/8/8/4P3/P4PPP/6K1 w - - 0 1',
			marks: ['d7b7', 'd7f7'],
			caption: 'From d7 the rook hits pawns on both sides.'
		}
	},
	{
		id: 'bishop-pair',
		name: 'Bishop pair',
		category: 'positional',
		summary: 'Having both bishops is an advantage, especially in open positions.',
		body: [
			'Together the bishops cover squares of both colors, which no other pair of minor pieces can.',
			'The edge grows as pawns come off the board. Open the position if you have the bishops; keep it closed if you don’t.'
		]
	},
	{
		id: 'bad-bishop',
		name: 'Good and bad bishops',
		category: 'positional',
		summary:
			'A bishop blocked by its own pawns on its color is bad; one with free diagonals is good.',
		body: [
			'Put your pawns on the opposite color to your bishop so they don’t get in its way.',
			'A bad bishop isn’t always useless: it can still defend the pawns that block it. But trading it for a good enemy piece is usually welcome.'
		],
		diagram: {
			fen: '4k3/8/1p1b4/p1pPp3/P1P1P3/1P6/3B4/4K3 w - - 0 1',
			marks: ['r:d6', 'd2'],
			caption: 'Black’s bishop is buried behind its own dark-square pawns. White’s bishop has room.'
		}
	},
	{
		id: 'knight-on-the-rim',
		name: 'A knight on the rim is dim',
		category: 'positional',
		summary: 'Knights on the edge control half as many squares as knights in the center.',
		body: [
			'A knight in the corner covers 2 squares, on the edge 3 or 4, in the center 8.',
			'Sometimes a knight goes to the rim on purpose, on the way somewhere better. Just don’t leave it there.'
		],
		diagram: {
			fen: '4k3/8/8/8/3N4/8/8/N3K3 w - - 0 1',
			marks: ['d4', 'r:a1'],
			caption: 'The centralized knight reaches eight squares; the one in the corner, two.'
		}
	},
	{
		id: 'luft',
		name: 'Luft',
		category: 'positional',
		summary: 'A pawn move that gives the castled king an escape square, to avoid back-rank mates.',
		body: [
			'German for “air”. A quiet move like h3 (or ...h6) costs a tempo but removes a whole family of tactics.',
			'Make it when the heavy pieces start eyeing your back rank, not by reflex on move 5.'
		],
		diagram: {
			fen: '6k1/5pp1/7p/8/8/7P/5PP1/6K1 w - - 0 1',
			marks: ['h2', 'h7'],
			caption: 'Both kings have a square to run to if a rook lands on the back rank.'
		}
	},
	{
		id: 'prophylaxis',
		name: 'Prophylaxis',
		category: 'positional',
		summary: 'Stopping the opponent’s plan before it starts.',
		body: [
			'Before each move, ask: what does my opponent want to do next? Sometimes the best move simply takes that away.',
			'A pawn move that stops a knight jump, or a rook that quietly defends a weak pawn, are typical prophylactic moves.'
		]
	},
	{
		id: 'space',
		name: 'Space advantage',
		category: 'positional',
		summary: 'Pawns further up the board give your pieces more room than the opponent’s.',
		body: [
			'With more space you can move pieces from one side to the other behind your pawns while the opponent’s pieces trip over each other.',
			'The cramped side should trade pieces; the side with space should avoid trades.'
		]
	},

	// Pawn structure
	{
		id: 'isolated-pawn',
		name: 'Isolated pawn',
		category: 'pawns',
		summary: 'A pawn with no friendly pawns on the files next to it.',
		body: [
			'No pawn can ever defend it, so pieces have to, and the square in front of it becomes an outpost for the opponent.',
			'An isolated d-pawn (the “isolani”) also gives open files and active pieces, so it’s a weakness in endgames but often a strength in the middlegame.'
		],
		diagram: {
			fen: '4k3/pp3ppp/8/3p4/8/8/PP3PPP/4K3 w - - 0 1',
			marks: ['r:d5', 'd4'],
			caption:
				'No black pawn on the c- or e-file can defend d5, and d4 in front of it is a perfect square for White.'
		}
	},
	{
		id: 'doubled-pawns',
		name: 'Doubled pawns',
		category: 'pawns',
		summary: 'Two pawns of the same color on the same file.',
		body: [
			'They can’t defend each other and the front one blocks the back one.',
			'In exchange you usually get a half-open file next to them. They are a weakness mostly in the endgame.'
		],
		diagram: {
			fen: '4k3/pp3ppp/2p5/2p5/8/8/PP3PPP/4K3 w - - 0 1',
			marks: ['r:c6', 'r:c5'],
			caption: 'Black’s c-pawns are doubled.'
		}
	},
	{
		id: 'passed-pawn',
		name: 'Passed pawn',
		category: 'pawns',
		summary: 'A pawn with no enemy pawns in front of it or on the files next to it.',
		body: [
			'Nothing but pieces can stop it from queening, which ties the opponent down.',
			'“Passed pawns must be pushed.” The further up the board, the more dangerous it is.'
		],
		diagram: {
			fen: '6k1/5ppp/8/1P6/8/8/5PPP/6K1 w - - 0 1',
			marks: ['b5b8'],
			caption: 'Nothing stands between White’s b-pawn and b8.'
		}
	},
	{
		id: 'backward-pawn',
		name: 'Backward pawn',
		category: 'pawns',
		summary: 'A pawn left behind its neighbours that can’t safely advance.',
		body: [
			'Its neighbours have moved past it, so no pawn can protect it, and the square in front of it is controlled by the enemy.',
			'It’s often on a half-open file, where enemy rooks pile up against it.'
		],
		diagram: {
			fen: '4k3/pp3ppp/3p4/4p3/4P3/8/PPP2PPP/4K3 w - - 0 1',
			marks: ['r:d6', 'd5'],
			caption: 'Black’s d6-pawn is backward: the e-pawn has moved on and d5 belongs to White.'
		}
	},
	{
		id: 'pawn-chain',
		name: 'Pawn chain',
		category: 'pawns',
		summary: 'Pawns linked diagonally, each defending the one in front.',
		body: [
			'The front of the chain is strong; the base, at the back, is the only pawn nothing defends.',
			'Attack the base of the chain. In the French Defense, Black hits d4 with …c5 for exactly that reason.'
		],
		diagram: {
			fen: '4k3/pp3ppp/4p3/3pP3/3P4/8/PP3PPP/4K3 w - - 0 1',
			marks: ['r:d4'],
			caption: 'White’s chain d4–e5. Its base, d4, is where Black should attack.'
		}
	},
	{
		id: 'pawn-majority',
		name: 'Pawn majority',
		category: 'pawns',
		summary: 'More pawns than the opponent on one side of the board, which can make a passed pawn.',
		body: [
			'Three against two on one wing will eventually produce a passed pawn if you push them together.',
			'A queenside majority is usually more valuable, because it’s far from the kings after castling short.'
		],
		diagram: {
			fen: '6k1/pp3ppp/8/8/8/8/PPP2PPP/6K1 w - - 0 1',
			marks: ['a2', 'b2', 'c2'],
			caption: 'White has three queenside pawns against two: a passed pawn is coming.'
		}
	},

	// Endgames
	{
		id: 'opposition',
		name: 'Opposition',
		category: 'endgames',
		summary: 'Kings facing each other with one square between; the side not to move has the edge.',
		body: [
			'Kings can’t step next to each other, so whoever has to move must give way.',
			'In king and pawn endings, getting the opposition often decides whether a pawn queens or the game is drawn.'
		],
		diagram: {
			fen: '8/8/4k3/8/4K3/4P3/8/8 b - - 0 1',
			marks: ['e4', 'e6'],
			caption: 'Black to move must step aside, letting White’s king forward.'
		}
	},
	{
		id: 'square-of-the-pawn',
		name: 'Square of the pawn',
		category: 'endgames',
		summary:
			'A quick way to see if a king can catch a passed pawn: can it step into the pawn’s square?',
		body: [
			'Draw a square from the pawn to its queening square and across. If the king can enter it on its move, it catches the pawn.',
			'It saves counting moves in your head in a race.'
		],
		diagram: {
			fen: '7k/8/8/8/p7/8/8/4K3 w - - 0 1',
			marks: ['b:a4', 'b:d4', 'b:d1', 'b:a1'],
			caption: 'White to move: Kd2 steps into the square and catches the pawn.'
		}
	},
	{
		id: 'lucena',
		name: 'Lucena position',
		category: 'endgames',
		summary:
			'The winning method in rook endings: “build a bridge” with your rook to shield your king.',
		body: [
			'Your pawn is on the seventh with your king in front of it, and the enemy king is cut off. The problem is the checks from behind.',
			'Move your rook to the fourth rank. When the checks come, your king walks out and the rook blocks the last check. That’s the bridge.'
		],
		diagram: {
			fen: '1K1k4/1P6/8/8/8/8/r7/2R5 w - - 0 1',
			marks: ['c1d1', 'b:d4'],
			caption: 'Rd1+ first, then Rd4 to build the bridge.'
		}
	},
	{
		id: 'philidor',
		name: 'Philidor position',
		category: 'endgames',
		summary:
			'The drawing method in rook endings: keep your rook on your third rank, then check from behind.',
		body: [
			'With your king in front of the pawn, your rook stops the enemy king from reaching your third rank.',
			'As soon as the pawn steps onto that rank, the king loses its shelter: swing your rook to the far end and check from behind.'
		],
		diagram: {
			fen: '4k3/R7/1r6/4KP2/8/8/8/8 b - - 0 1',
			marks: ['b:b6'],
			caption: 'Black’s rook holds the sixth rank. If the pawn goes to f6, it checks from b1.'
		}
	},
	{
		id: 'rook-behind-passer',
		name: 'Rooks behind passed pawns',
		category: 'endgames',
		summary: 'Put rooks behind passed pawns, yours or the opponent’s, not in front of them.',
		body: [
			'Behind the pawn, a rook gets more active the further the pawn goes. In front of it, it gets more passive.',
			'Known as Tarrasch’s rule.'
		],
		diagram: {
			fen: '6k1/8/8/P7/8/8/5K2/R7 w - - 0 1',
			marks: ['a1a5'],
			caption: 'White’s rook supports the a-pawn from behind.'
		}
	},
	{
		id: 'zugzwang',
		name: 'Zugzwang',
		category: 'endgames',
		summary: 'Any move makes your position worse, but you have to move.',
		body: [
			'German for “compulsion to move”. It mostly happens in endgames, where few pieces means few safe waiting moves.',
			'Spare pawn moves (tempo moves) are valuable for exactly this reason: they let you pass the move back.'
		]
	},
	{
		id: 'triangulation',
		name: 'Triangulation',
		category: 'endgames',
		summary: 'Walking the king around a triangle to lose a move and hand the opponent the turn.',
		body: [
			'Your king takes three moves to come back to the same square while the enemy king, with less room, can’t do the same.',
			'It’s how you put the opponent in zugzwang when it’s your move in the critical position.'
		]
	},

	// Principles
	{
		id: 'center',
		name: 'Control the center',
		category: 'principles',
		summary: 'Pawns and pieces aimed at e4, d4, e5 and d5 give you more room and better pieces.',
		body: [
			'Pieces in the center reach both sides of the board. A side that controls the center can switch the attack to wherever it’s needed.',
			'You don’t have to occupy the center with pawns: pieces aimed at it from a distance count too.'
		],
		diagram: {
			fen: 'rnbqkbnr/pppppppp/8/8/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 2',
			marks: ['d4', 'e4', 'b:d5', 'b:e5'],
			caption: 'White’s pawns on d4 and e4 claim the center.'
		}
	},
	{
		id: 'develop',
		name: 'Develop your pieces',
		category: 'principles',
		summary: 'In the opening, bring knights and bishops out before moving any piece twice.',
		body: [
			'Every move spent shuffling one piece is a move the opponent uses to bring out another.',
			'Knights before bishops is a good default. Bring the queen out late, since it gets chased around.'
		]
	},
	{
		id: 'castle-early',
		name: 'Castle early',
		category: 'principles',
		summary: 'Castling tucks the king away and brings a rook toward the center in one move.',
		body: [
			'A king in the middle gets in the way once the center opens up.',
			'Castling also connects your rooks, which is the sign your development is complete.'
		]
	},
	{
		id: 'tempo',
		name: 'Tempo',
		category: 'principles',
		summary:
			'A single move, as a unit of time. Gaining a tempo means making progress with a threat.',
		body: [
			'Developing a piece with an attack on the queen “gains a tempo”: the opponent has to spend their move saving it.',
			'Losing tempi (moving the same piece back and forth) lets the opponent get ahead in development.'
		]
	},
	{
		id: 'the-exchange',
		name: 'The exchange',
		category: 'principles',
		summary: 'Winning a rook for a bishop or knight is “winning the exchange”.',
		body: [
			'A rook is worth about two points more than a minor piece (5 against 3).',
			'An exchange sacrifice gives up a rook for a minor piece on purpose, for an attack or a lasting positional edge.'
		]
	},
	{
		id: 'initiative',
		name: 'Initiative',
		category: 'principles',
		summary: 'Making threats that the opponent must answer, so you set the pace of the game.',
		body: [
			'With the initiative, every move forces a reply, and the opponent never gets time for their own plans.',
			'It’s often worth a pawn. Lose it, and the position can swing quickly.'
		]
	},
	{
		id: 'fianchetto',
		name: 'Fianchetto',
		category: 'principles',
		summary:
			'Developing a bishop to b2 or g2 (b7 or g7) after a small pawn move, aimed down the long diagonal.',
		body: [
			'The bishop pressures the center from a distance and protects the castled king.',
			'If that bishop is traded, the squares around the king get weak, so don’t give it up lightly.'
		],
		diagram: {
			fen: 'rnbqkbnr/pppppppp/8/8/8/6P1/PPPPPPBP/RNBQK1NR b KQkq - 1 2',
			marks: ['g2b7'],
			caption: 'The g2 bishop eyes the whole long diagonal.'
		}
	},
	{
		id: 'gambit',
		name: 'Gambit',
		category: 'principles',
		summary:
			'Giving up material in the opening, usually a pawn, for faster development or an attack.',
		body: [
			'The idea is time: while the opponent spends moves keeping the pawn, you bring out your pieces.',
			'Accepting a gambit is fine as long as you give some material back when it’s time to catch up in development.'
		]
	},
	{
		id: 'en-passant',
		name: 'En passant',
		category: 'principles',
		summary:
			'A pawn that moves two squares past an enemy pawn can be captured as if it had moved one.',
		body: [
			'Only possible right after the two-square move, and only by a pawn on the fifth rank (fourth for Black).',
			'The capturing pawn lands on the square the pawn skipped over.'
		],
		puzzle: {
			fen: 'rnbqkbnr/ppp1p1pp/8/3pPp2/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3',
			prompt: 'Black just played …d5. Capture it en passant.',
			moves: ['exd6'],
			rule: true
		}
	},
	{
		id: 'stalemate',
		name: 'Stalemate',
		category: 'principles',
		summary: 'The side to move has no legal move and is not in check: the game is a draw.',
		body: [
			'Easy to stumble into when you’re winning: always check that the losing king has a move left before your last quiet move.',
			'When you’re losing, look for stalemate tricks: get rid of your last pieces so your king has no moves.'
		],
		puzzle: {
			fen: 'k7/8/2K5/1Q6/8/8/8/8 w - - 0 1',
			prompt: 'Mate in one, not stalemate. (Qb6 would be stalemate.)',
			moves: ['Qb7#']
		}
	},
	{
		id: 'cct',
		name: 'Checks, captures, threats',
		category: 'principles',
		summary: 'Before every move, look at all checks, captures and threats, for both sides.',
		body: [
			'Forcing moves first. Most tactics start with one of the three, and so do most blunders you allow.',
			'Do it for the opponent too: what would they do if it were their move?'
		]
	}
];

export const byId = new Map(CONCEPTS.map((concept) => [concept.id, concept]));

export type Mark = { from: string; to: string; color: 'green' | 'red' | 'blue' };

/** "r:e2e4" → an arrow; "d5" → a circle (from = to) */
export function parseMark(mark: string): Mark {
	const [prefix, squares] = mark.includes(':') ? mark.split(':') : ['', mark];
	const color = prefix === 'r' ? 'red' : prefix === 'b' ? 'blue' : 'green';
	return { from: squares.slice(0, 2), to: squares.slice(2, 4) || squares.slice(0, 2), color };
}
