<script lang="ts">
	import { resolve } from '$app/paths';
	import {
		BookOpen,
		CalendarCheck,
		ChartPie,
		Cpu,
		Layers,
		Library,
		Lock,
		Search,
		Target,
		TrendingDown,
		Zap
	} from '@lucide/svelte';
	import SearchForm from '$lib/components/SearchForm.svelte';
	import { CONCEPTS } from '$lib/data/library';

	const steps = [
		{
			icon: Search,
			title: 'Search your username',
			text: 'Your last six months of chess.com games load in seconds. No sign-in.'
		},
		{
			icon: Cpu,
			title: 'Stockfish checks every move',
			text: 'Right in your browser. It finds the moves that lost the game and sorts them into patterns.'
		},
		{
			icon: CalendarCheck,
			title: 'Practice ten minutes a day',
			text: 'Your own mistakes come back as puzzles until you stop making them.'
		}
	];

	const features = [
		{
			icon: Layers,
			title: 'Blunder flashcards',
			text: 'Every move that threw a game becomes a card: the position, and you find the move you missed. Cards you get wrong come back sooner, like Anki.'
		},
		{
			icon: ChartPie,
			title: 'Your blunder patterns',
			text: 'Each mistake is tagged: hung piece, allowed fork, missed tactic, missed mate. See which one keeps costing you, and whether it’s the opening, middlegame or endgame.'
		},
		{
			icon: Target,
			title: 'Missed wins',
			text: 'The times your opponent blundered and you let them off the hook. Learn to punish mistakes, not just avoid them.'
		},
		{
			icon: BookOpen,
			title: 'Opening lessons',
			text: 'Every opening you actually play, as White and as Black, with your record in each line. Step through it, then play it from memory.'
		},
		{
			icon: TrendingDown,
			title: 'Openings that cost you',
			text: 'Openings ranked by points lost against what your rating says you should score. Fix the leaks first, not the ones you play most.'
		},
		{
			icon: Zap,
			title: 'Daily session and streak',
			text: 'One short session mixes the cards that are due with the lines that hurt most. Keep the streak going and watch the same mistakes disappear.'
		}
	];
</script>

<main class="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-12 sm:py-16">
	<section class="flex flex-col items-center gap-4 text-center">
		<h1 class="h1 text-balance">It’s not bad luck. It’s a skill issue.</h1>
		<p class="max-w-2xl text-lg text-balance text-muted">
			Search any chess.com player. Their blunders become flashcards you drill until they stick, and
			their openings become lessons for the lines they actually play.
		</p>
	</section>

	<section class="mx-auto w-full max-w-2xl card preset-filled-surface-100-900 p-5 sm:p-6">
		<SearchForm autofocus />
	</section>

	<!-- Why: the pitch -->
	<section class="flex flex-col items-center gap-3 text-center">
		<h2 class="h3 text-balance">You keep losing the same way.</h2>
		<p class="max-w-2xl text-balance text-muted">
			Most games aren’t lost to brilliant play. They’re lost to the same few mistakes, made again
			and again: a hung knight, a missed fork, an opening you never learned past move six. Generic
			puzzles and videos don’t know which mistakes are yours. Skill Issue does, because it learns
			them from your own games.
		</p>
	</section>

	<!-- How it works -->
	<section class="flex flex-col gap-4">
		<h2 class="text-center h4">How it works</h2>
		<ol class="grid gap-4 sm:grid-cols-3">
			{#each steps as step, i (step.title)}
				<li class="flex flex-col items-center gap-2 p-2 text-center">
					<span
						class="flex size-10 items-center justify-center rounded-full preset-filled-primary-500 font-bold"
						>{i + 1}</span
					>
					<step.icon class="size-5 text-primary-600-400" />
					<h3 class="font-bold">{step.title}</h3>
					<p class="text-sm text-muted">{step.text}</p>
				</li>
			{/each}
		</ol>
	</section>

	<!-- Every feature -->
	<section class="flex flex-col gap-4">
		<h2 class="text-center h4">Everything you get</h2>
		<ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each features as feature (feature.title)}
				<li class="flex flex-col gap-2 card border border-surface-200-800 p-5">
					<feature.icon class="size-6 text-primary-600-400" />
					<h3 class="h5">{feature.title}</h3>
					<p class="text-sm text-muted">{feature.text}</p>
				</li>
			{/each}
		</ul>
	</section>

	<!-- The library: no username needed -->
	<a
		href={resolve('/library')}
		class="flex flex-col gap-2 card border border-surface-200-800 p-5 transition-colors hover:preset-tonal sm:flex-row sm:items-center sm:gap-4"
	>
		<Library class="size-6 shrink-0 text-primary-600-400" />
		<div class="flex flex-col gap-1">
			<h2 class="h5">The library</h2>
			<p class="text-sm text-muted">
				Forks, pins, back-rank mates, outposts, the Lucena position: {CONCEPTS.length} ideas every player
				should know, with examples, puzzles and a quiz. No username needed.
			</p>
		</div>
	</a>

	<!-- Trust -->
	<section
		class="flex flex-col items-center gap-2 card preset-filled-surface-100-900 p-5 text-center"
	>
		<Lock class="size-5 text-primary-600-400" />
		<p class="font-semibold">Free. No account. No server.</p>
		<p class="max-w-xl text-sm text-balance text-muted">
			Everything runs in your browser, the engine included, and your progress is saved on this
			device only.
		</p>
	</section>
</main>
