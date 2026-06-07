<script lang="ts">
	import Mail from '@lucide/svelte/icons/mail';
</script>

<svelte:head>
	<title>About — Arrowhead Directory</title>
</svelte:head>

<div class="mx-auto max-w-prose">
	<h1 class="mb-6 text-2xl font-bold">About Arrowhead Directory</h1>

	<p class="mb-6 text-muted-foreground">
		Arrowhead Directory is a community-maintained listing of businesses and tradespeople in the
		Arrowhead region of Minnesota. It started as a bulletin board on the Laundromat Facebook group
		and grew into something the whole community uses. Thank you, Chuck!
	</p>

	<div class="mb-8 rounded-lg border p-6">
		<h2 class="mb-2 text-lg font-semibold">Chuck Heller — Primary Admin</h2>
		<p class="mb-4 text-sm text-muted-foreground">
			Chuck has been maintaining this directory and keeping the community connected.
		</p>
		<div class="flex flex-col gap-2 sm:flex-row">
			<a
				href="mailto:chuck@example.com"
				class="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
			>
				<Mail class="size-4" /> chuck@example.com
			</a>
			<a
				href="#"
				target="_blank"
				rel="noopener noreferrer"
				class="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-2 text-sm font-medium text-yellow-900 hover:bg-yellow-300"
			>
				☕ Buy Chuck a coffee
			</a>
		</div>
	</div>

	<div class="mb-8 rounded-lg border p-6">
		<h2 class="mb-2 text-lg font-semibold">Support this site</h2>
		<p class="mb-4 text-sm text-muted-foreground">
			This site costs about $5 a month to operate - that covers the domain name, website hosting,
			database and new feature requests.
		</p>
		<p class="mb-4 text-sm text-muted-foreground">
			This is a free tool with minimal overhead, but your support is greatly appreciated!
		</p>
		<a
			href="https://buymeacoffee.com/tybql1x9bh"
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-2 text-sm font-medium text-yellow-900 hover:bg-yellow-300"
		>
			☕ Buy Jack a coffee
		</a>
	</div>

	<div class="mb-8 rounded-lg border p-6">
		<h2 class="mb-2 text-lg font-semibold">Open source</h2>
		<p class="mb-4 text-sm text-muted-foreground">
			This site is free and open source. If you're a developer and want to help improve it, contributions
			are welcome — take a look at the code on GitHub.
		</p>
		<a
			href="https://github.com/jacksloan/arrowhead-directory"
			target="_blank"
			rel="noopener noreferrer"
			class="inline-flex items-center gap-2 text-sm text-primary underline-offset-4 hover:underline"
		>
			View on GitHub →
		</a>
	</div>

	<!--  <div class="rounded-lg border p-6">-->
	<!--    <h2 class="mb-2 text-lg font-semibold">Jack Sloan — Developer</h2>-->
	<!--    <p class="mb-4 text-sm text-muted-foreground">-->
	<!--      Built the site. Drinks 3 cracked pepper cortados a day. It's expensive.-->
	<!--    </p>-->
	<!--    <a-->
	<!--      href="https://buymeacoffee.com/jacksloan"-->
	<!--      target="_blank"-->
	<!--      rel="noopener noreferrer"-->
	<!--      class="inline-flex items-center gap-2 rounded-md bg-yellow-400 px-4 py-2 text-sm font-medium text-yellow-900 hover:bg-yellow-300"-->
	<!--    >-->
	<!--      ☕ Buy Jack a coffee-->
	<!--    </a>-->
	<!--  </div>-->
</div>
