<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Search } from '@lucide/svelte';
	import { readLocal, writeLocal } from '$lib/storage';

	// Look up a chess.com username. Remembers the last few searches on this device.
	let { autofocus = false }: { autofocus?: boolean } = $props();

	let username = $state('');
	let recent = $state(readLocal<string[]>('recent', []));

	// chess.com usernames: letters, numbers, - and _
	const valid = $derived(/^[A-Za-z0-9_-]{3,25}$/.test(username.trim()));

	function open(name: string) {
		const clean = name.trim();
		recent = [clean, ...recent.filter((r) => r.toLowerCase() !== clean.toLowerCase())].slice(0, 5);
		writeLocal('recent', recent);
		goto(resolve('/u/[username]', { username: clean }));
	}
</script>

<form
	class="flex w-full flex-col gap-2"
	onsubmit={(event) => {
		event.preventDefault();
		if (valid) open(username);
	}}
>
	<label class="label" for="username">
		<span class="label-text">chess.com username</span>
	</label>
	<div class="field-group grid-cols-[1fr_auto]">
		<!-- svelte-ignore a11y_autofocus -->
		<input
			id="username"
			class="input"
			type="text"
			placeholder="e.g. hikaru"
			autocomplete="off"
			autocapitalize="off"
			spellcheck="false"
			{autofocus}
			bind:value={username}
		/>
		<button type="submit" class="btn preset-filled-primary-500" disabled={!valid}>
			<Search class="size-4" /> Go
		</button>
	</div>

	{#if recent.length}
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<span class="text-muted">Recent:</span>
			{#each recent as name (name)}
				<button type="button" class="chip preset-tonal" onclick={() => open(name)}>{name}</button>
			{/each}
		</div>
	{/if}
</form>
