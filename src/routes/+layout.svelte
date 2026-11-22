<script lang="ts">
	import './layout.css';
	import { AppBar } from '@skeletonlabs/skeleton-svelte';
	import { resolve } from '$app/paths';
	import { Library } from '@lucide/svelte';

	let { children } = $props();
</script>

<svelte:head>
	<title>Skill Issue</title>
</svelte:head>

<div class="flex min-h-dvh flex-col bg-surface-50-950">
	<AppBar class="border-b border-surface-200-800 bg-surface-50-950 px-4 py-3">
		<AppBar.Toolbar class="mx-auto flex w-full max-w-5xl items-center justify-between">
			<AppBar.Lead>
				<a href={resolve('/')} class="flex items-center gap-2 text-lg font-bold">
					<span
						class="flex size-8 items-center justify-center rounded-base preset-filled-surface-900-100 font-serif text-sm"
						aria-hidden="true">??</span
					>
					Skill Issue
				</a>
			</AppBar.Lead>
			<AppBar.Trail>
				<a href={resolve('/library')} class="btn btn-sm hover:preset-tonal">
					<Library class="size-4" /> Library
				</a>
			</AppBar.Trail>
		</AppBar.Toolbar>
	</AppBar>

	<div class="flex-1">
		{@render children()}
	</div>

	<footer class="border-t border-surface-200-800 px-4 py-6 text-center text-xs text-muted">
		<p>
			Games from chess.com’s public API · Not affiliated with chess.com · Analysis by
			<a class="anchor" href="https://stockfishchess.org" target="_blank" rel="noreferrer"
				>Stockfish</a
			>
			· Openings from
			<a
				class="anchor"
				href="https://github.com/lichess-org/chess-openings"
				target="_blank"
				rel="noreferrer">lichess-org/chess-openings</a
			>
		</p>
		<p class="mt-1">Everything is saved in this browser only.</p>
	</footer>
</div>
