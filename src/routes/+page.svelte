<script lang="ts">
	import { BookOpen, Layers } from '@lucide/svelte';
	import SearchForm from '$lib/components/SearchForm.svelte';
</script>

<main class="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 sm:py-16">
	<section class="flex flex-col gap-4">
		<h1 class="h1 text-balance">It’s not bad luck. It’s a skill issue.</h1>
		<p class="text-lg text-balance text-muted">
			Search any chess.com player. Their blunders become flashcards you drill until they stick, and
			their openings become lessons for the lines they actually play.
		</p>
	</section>

	<section class="card preset-filled-surface-100-900 p-5 sm:p-6">
		<SearchForm autofocus />
	</section>

	<section class="grid gap-4 sm:grid-cols-2">
		<article class="flex flex-col gap-2 card border border-surface-200-800 p-5">
			<Layers class="size-6 text-primary-600-400" />
			<h2 class="h5">Blunder flashcards</h2>
			<p class="text-sm text-muted">
				Stockfish checks your games right in your browser and finds the moves that threw the game.
				Each one becomes a card: the position, and you find the move you missed. Cards you miss come
				back sooner.
			</p>
		</article>
		<article class="flex flex-col gap-2 card border border-surface-200-800 p-5">
			<BookOpen class="size-6 text-primary-600-400" />
			<h2 class="h5">Opening lessons</h2>
			<p class="text-sm text-muted">
				Every opening you play, with your record in each line. Step through the main lines move by
				move, then practice them until you can play them from memory.
			</p>
		</article>
	</section>
</main>
