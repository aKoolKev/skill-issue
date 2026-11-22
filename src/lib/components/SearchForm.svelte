<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { Pin, PinOff, Search, X } from '@lucide/svelte';
	import { readLocal, writeLocal } from '$lib/storage';

	// Look up a chess.com username. Remembers the last few searches on this device, and keeps
	// pinned names (like your own) at the front so they never drop off.
	let { autofocus = false }: { autofocus?: boolean } = $props();

	let username = $state('');
	let recent = $state(readLocal<string[]>('recent', []));
	let pinned = $state(readLocal<string[]>('pinned', []));

	const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
	const isPinned = (name: string) => pinned.some((p) => same(p, name));
	/** Recent searches that aren't already pinned */
	const unpinned = $derived(recent.filter((name) => !isPinned(name)));

	// chess.com usernames: letters, numbers, - and _
	const valid = $derived(/^[A-Za-z0-9_-]{3,25}$/.test(username.trim()));

	function open(name: string) {
		const clean = name.trim();
		if (!isPinned(clean)) {
			recent = [clean, ...recent.filter((r) => !same(r, clean))].slice(0, 5);
			writeLocal('recent', recent);
		}
		goto(resolve('/u/[username]', { username: clean }));
	}

	function remove(name: string) {
		recent = recent.filter((r) => !same(r, name));
		writeLocal('recent', recent);
	}

	function pin(name: string) {
		pinned = [...pinned, name];
		writeLocal('pinned', pinned);
		remove(name);
	}

	function unpin(name: string) {
		pinned = pinned.filter((p) => !same(p, name));
		writeLocal('pinned', pinned);
		recent = [name, ...recent].slice(0, 5);
		writeLocal('recent', recent);
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

	{#snippet chip(name: string, isPin: boolean)}
		<span class="chip gap-0 p-0 {isPin ? 'preset-filled-primary-500' : 'preset-tonal'}">
			<button type="button" class="py-1 pr-1 pl-3" onclick={() => open(name)}>{name}</button>
			<button
				type="button"
				class="p-1 opacity-60 hover:opacity-100 {isPin ? 'pr-2' : ''}"
				aria-label={isPin ? `Unpin ${name}` : `Pin ${name}`}
				title={isPin ? 'Unpin' : 'Pin'}
				onclick={() => (isPin ? unpin(name) : pin(name))}
			>
				{#if isPin}<PinOff class="size-3.5" />{:else}<Pin class="size-3.5" />{/if}
			</button>
			{#if !isPin}
				<button
					type="button"
					class="py-1 pr-2 pl-1 opacity-60 hover:opacity-100"
					aria-label="Remove {name} from recent searches"
					title="Remove"
					onclick={() => remove(name)}
				>
					<X class="size-3.5" />
				</button>
			{/if}
		</span>
	{/snippet}

	{#if pinned.length}
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<span class="text-muted">Pinned:</span>
			{#each pinned as name (name)}
				{@render chip(name, true)}
			{/each}
		</div>
	{/if}

	{#if unpinned.length}
		<div class="flex flex-wrap items-center gap-2 text-sm">
			<span class="text-muted">Recent:</span>
			{#each unpinned as name (name)}
				{@render chip(name, false)}
			{/each}
		</div>
	{/if}
</form>
