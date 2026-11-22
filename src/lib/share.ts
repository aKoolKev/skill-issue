// A blunder as a picture to share: the board with the move played (red) and the best move
// (green), drawn on a canvas in the browser. Uses the same cburnett pieces as the board.
import { Chess, type PieceSymbol } from 'chess.js';
import pieceCss from 'chessground/assets/chessground.cburnett.css?raw';
import type { Card } from './analysis';
import { explain } from './explain';
import { shortDate } from './games';

const W = 1080;
const H = 1600;
const PAD = 60;
const SQ = (W - PAD * 2) / 8;
const BOARD_Y = 230;
const LIGHT = '#f0d9b5';
const DARK = '#b58863';
const RED = 'rgba(220, 38, 38, 0.85)';
const GREEN = 'rgba(21, 128, 61, 0.85)';
const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

const NAMES: Record<PieceSymbol, string> = {
	p: 'pawn',
	n: 'knight',
	b: 'bishop',
	r: 'rook',
	q: 'queen',
	k: 'king'
};

let pieces: Promise<Map<string, HTMLImageElement>> | undefined;

/** The piece images from chessground's CSS, keyed like "knight.white" */
function loadPieces() {
	pieces ??= Promise.all(
		[...pieceCss.matchAll(/piece\.(\w+)\.(\w+)\s*\{\s*background-image:\s*url\('([^']+)'\)/g)].map(
			([, type, color, src]) =>
				new Promise<[string, HTMLImageElement]>((resolve, reject) => {
					const img = new Image();
					img.onload = () => resolve([`${type}.${color}`, img]);
					img.onerror = reject;
					img.src = src;
				})
		)
	).then((entries) => new Map(entries));
	return pieces;
}

function arrow(
	ctx: CanvasRenderingContext2D,
	from: [number, number],
	to: [number, number],
	color: string
) {
	const [x1, y1] = from;
	const [x2, y2] = to;
	const angle = Math.atan2(y2 - y1, x2 - x1);
	const head = SQ * 0.4;
	const endX = x2 - Math.cos(angle) * head * 0.8;
	const endY = y2 - Math.sin(angle) * head * 0.8;
	ctx.strokeStyle = ctx.fillStyle = color;
	ctx.lineWidth = SQ * 0.18;
	ctx.lineCap = 'round';
	ctx.beginPath();
	ctx.moveTo(x1, y1);
	ctx.lineTo(endX, endY);
	ctx.stroke();
	ctx.beginPath();
	ctx.moveTo(x2, y2);
	ctx.lineTo(x2 - Math.cos(angle - 0.5) * head, y2 - Math.sin(angle - 0.5) * head);
	ctx.lineTo(x2 - Math.cos(angle + 0.5) * head, y2 - Math.sin(angle + 0.5) * head);
	ctx.closePath();
	ctx.fill();
}

/** Writes `text` across the image, breaking lines between words. Returns the last line's y. */
function wrap(ctx: CanvasRenderingContext2D, text: string, y: number, font: string, color: string) {
	ctx.font = font;
	ctx.fillStyle = color;
	const lineHeight = Number(font.match(/(\d+)px/)?.[1] ?? 32) * 1.35;
	let line = '';
	for (const word of text.split(' ')) {
		const next = line ? `${line} ${word}` : word;
		if (line && ctx.measureText(next).width > W - PAD * 2) {
			ctx.fillText(line, PAD, y);
			line = word;
			y += lineHeight;
		} else line = next;
	}
	ctx.fillText(line, PAD, y);
	return y;
}

/** Draws the card and returns it as a PNG */
export async function cardImage(card: Card, username: string): Promise<Blob> {
	const images = await loadPieces();
	const canvas = document.createElement('canvas');
	canvas.width = W;
	canvas.height = H;
	const ctx = canvas.getContext('2d')!;

	ctx.fillStyle = '#18181b';
	ctx.fillRect(0, 0, W, H);

	// Header
	ctx.fillStyle = '#fafafa';
	ctx.beginPath();
	ctx.roundRect(PAD, 56, 72, 72, 14);
	ctx.fill();
	ctx.fillStyle = '#18181b';
	ctx.font = `bold 36px Georgia, serif`;
	ctx.textAlign = 'center';
	ctx.textBaseline = 'middle';
	ctx.fillText('??', PAD + 36, 94);
	ctx.textAlign = 'left';
	ctx.textBaseline = 'alphabetic';
	ctx.fillStyle = '#fafafa';
	ctx.font = `bold 48px ${FONT}`;
	ctx.fillText('Skill Issue', PAD + 96, 108);
	ctx.fillStyle = '#a1a1aa';
	ctx.font = `30px ${FONT}`;
	ctx.fillText(
		`${username} vs ${card.opponent} · move ${card.moveNumber} · ${shortDate(card.endTime)}`,
		PAD,
		190
	);

	// Board, from the player's side
	const flipped = card.color === 'black';
	const center = (square: string): [number, number] => {
		let file = square.charCodeAt(0) - 97;
		let rank = 8 - Number(square[1]);
		if (flipped) {
			file = 7 - file;
			rank = 7 - rank;
		}
		return [PAD + file * SQ + SQ / 2, BOARD_Y + rank * SQ + SQ / 2];
	};
	const board = new Chess(card.fen).board();
	for (let row = 0; row < 8; row++) {
		for (let col = 0; col < 8; col++) {
			const x = PAD + col * SQ;
			const y = BOARD_Y + row * SQ;
			ctx.fillStyle = (row + col) % 2 ? DARK : LIGHT;
			ctx.fillRect(x, y, SQ, SQ);
			const piece = board[flipped ? 7 - row : row][flipped ? 7 - col : col];
			const img =
				piece && images.get(`${NAMES[piece.type]}.${piece.color === 'w' ? 'white' : 'black'}`);
			if (img) ctx.drawImage(img, x, y, SQ, SQ);
		}
	}
	arrow(ctx, center(card.playedUci.slice(0, 2)), center(card.playedUci.slice(2, 4)), RED);
	arrow(ctx, center(card.bestUci.slice(0, 2)), center(card.bestUci.slice(2, 4)), GREEN);

	// The verdict
	const textY = BOARD_Y + SQ * 8 + 90;
	ctx.font = `bold 64px ${FONT}`;
	ctx.fillStyle = '#f87171';
	ctx.fillText(`${card.played}??`, PAD, textY);
	const playedWidth = ctx.measureText(`${card.played}?? `).width;
	ctx.font = `40px ${FONT}`;
	ctx.fillStyle = '#d4d4d8';
	ctx.fillText(
		`${Math.round(card.before * 100)}% → ${Math.round(card.after * 100)}% winning chances`,
		PAD + playedWidth,
		textY
	);
	const why = explain(card);
	let y = textY + 30;
	if (why.played) y = wrap(ctx, why.played, y + 56, `34px ${FONT}`, '#d4d4d8');
	ctx.font = `bold 38px ${FONT}`;
	ctx.fillStyle = '#4ade80';
	ctx.fillText(`Best was ${card.best}`, PAD, y + 76);
	wrap(ctx, why.best, y + 76 + 52, `34px ${FONT}`, '#d4d4d8');

	ctx.font = `26px ${FONT}`;
	ctx.fillStyle = '#71717a';
	ctx.textAlign = 'right';
	ctx.fillText(location.host, W - PAD, H - 40);

	return new Promise((resolve, reject) =>
		canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('No image'))), 'image/png')
	);
}

/** Opens the phone's share sheet with the image, or downloads it where that isn't supported */
export async function shareCard(card: Card, username: string) {
	const blob = await cardImage(card, username);
	const name = `skill-issue-${card.played.replace(/[^\w]/g, '')}-move-${card.moveNumber}.png`;
	const file = new File([blob], name, { type: 'image/png' });
	if (navigator.canShare?.({ files: [file] })) {
		try {
			await navigator.share({ files: [file], title: 'Skill Issue' });
			return;
		} catch (error) {
			if ((error as Error).name === 'AbortError') return; // closed the share sheet
		}
	}
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = name;
	link.click();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}
