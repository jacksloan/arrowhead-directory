<script lang="ts">
	import { toast } from 'svelte-sonner';
	import { toggleMode } from 'mode-watcher';
	import ThemePicker from '$lib/components/ThemePicker.svelte';

	// Layout
	import * as Sidebar from '$lib/components/ui/sidebar';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';

	// Display
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Spinner } from '$lib/components/ui/spinner';
	import * as Kbd from '$lib/components/ui/kbd';
	import * as Empty from '$lib/components/ui/empty';

	// Actions
	import { Button } from '$lib/components/ui/button';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import { Toggle } from '$lib/components/ui/toggle';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';

	// Form
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Select from '$lib/components/ui/select';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Switch } from '$lib/components/ui/switch';
	import { Slider } from '$lib/components/ui/slider';

	// Feedback
	import * as Alert from '$lib/components/ui/alert';
	import { Progress } from '$lib/components/ui/progress';
	import { Toaster } from '$lib/components/ui/sonner';

	// Overlays
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as Popover from '$lib/components/ui/popover';
	import * as HoverCard from '$lib/components/ui/hover-card';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';

	// Navigation
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Pagination from '$lib/components/ui/pagination';
	import * as NavigationMenu from '$lib/components/ui/navigation-menu';

	// Data
	import * as Table from '$lib/components/ui/table';
	import * as Accordion from '$lib/components/ui/accordion';

	// Command
	import * as Command from '$lib/components/ui/command';

	// Calendar
	import { Calendar } from '$lib/components/ui/calendar';

	// Icons
	import SunIcon from '@lucide/svelte/icons/sun';
	import MoonIcon from '@lucide/svelte/icons/moon';
	import BellIcon from '@lucide/svelte/icons/bell';
	import CheckIcon from '@lucide/svelte/icons/check';
	import TriangleAlertIcon from '@lucide/svelte/icons/triangle-alert';
	import InfoIcon from '@lucide/svelte/icons/info';
	import BoldIcon from '@lucide/svelte/icons/bold';
	import ItalicIcon from '@lucide/svelte/icons/italic';
	import UnderlineIcon from '@lucide/svelte/icons/underline';
	import AlignLeftIcon from '@lucide/svelte/icons/align-left';
	import AlignCenterIcon from '@lucide/svelte/icons/align-center';
	import AlignRightIcon from '@lucide/svelte/icons/align-right';
	import SearchIcon from '@lucide/svelte/icons/search';
	import PackageIcon from '@lucide/svelte/icons/package';
	import LayoutDashboardIcon from '@lucide/svelte/icons/layout-dashboard';
	import UsersIcon from '@lucide/svelte/icons/users';
	import SettingsIcon from '@lucide/svelte/icons/settings';
	import BarChart2Icon from '@lucide/svelte/icons/bar-chart-2';
	import FileTextIcon from '@lucide/svelte/icons/file-text';
	import InboxIcon from '@lucide/svelte/icons/inbox';
	import GitBranchIcon from '@lucide/svelte/icons/git-branch';
	import ZapIcon from '@lucide/svelte/icons/zap';
	import CalendarIcon from '@lucide/svelte/icons/calendar';

	// State
	let sliderValue = $state([40]);
	let progressValue = $state(65);
	let switchEnabled = $state(true);
	let checkboxChecked = $state(true);
	let radioValue = $state('comfortable');
	let selectValue = $state('');
	let tabsValue = $state('overview');
	let boldActive = $state(false);
	let italicActive = $state(false);
	let underlineActive = $state(false);
	let alignValue = $state('left');
	let calendarValue = $state<import('@internationalized/date').DateValue | undefined>(undefined);

	const sheetSides = ['right', 'left', 'top', 'bottom'] as const;

	const navItems = [
		{ icon: LayoutDashboardIcon, label: 'Dashboard' },
		{ icon: BarChart2Icon, label: 'Analytics' },
		{ icon: UsersIcon, label: 'Team' },
		{ icon: InboxIcon, label: 'Inbox', badge: '12' },
		{ icon: FileTextIcon, label: 'Documents' },
		{ icon: GitBranchIcon, label: 'Deployments' },
	];

	const settingsItems = [
		{ icon: SettingsIcon, label: 'Settings' },
		{ icon: ZapIcon, label: 'Integrations' },
	];

	const tableRows = [
		{ invoice: 'INV-001', status: 'Paid', method: 'Credit Card', amount: '$250.00' },
		{ invoice: 'INV-002', status: 'Pending', method: 'PayPal', amount: '$150.00' },
		{ invoice: 'INV-003', status: 'Overdue', method: 'Bank Transfer', amount: '$430.00' },
		{ invoice: 'INV-004', status: 'Paid', method: 'Credit Card', amount: '$120.00' },
		{ invoice: 'INV-005', status: 'Paid', method: 'Crypto', amount: '$550.00' },
	];

	const statusColor: Record<string, string> = {
		Paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
		Pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
		Overdue: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
	};
</script>

<Toaster />
<Tooltip.Provider>

<Sidebar.Provider>
	<Sidebar.Root>
		<Sidebar.Header>
			<div class="flex items-center gap-2 px-2 py-1">
				<div class="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-lg">
					<PackageIcon class="size-4" />
				</div>
				<div class="flex flex-col leading-tight">
					<span class="text-sm font-semibold">Arrowhead</span>
					<span class="text-muted-foreground text-xs">Component Kitchen Sink</span>
				</div>
			</div>
		</Sidebar.Header>

		<Sidebar.Content>
			<Sidebar.Group>
				<Sidebar.GroupLabel>Platform</Sidebar.GroupLabel>
				<Sidebar.Menu>
					{#each navItems as item}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton>
								<item.icon class="size-4" />
								<span>{item.label}</span>
								{#if item.badge}
									<Sidebar.MenuBadge>{item.badge}</Sidebar.MenuBadge>
								{/if}
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.Group>

			<Sidebar.Group>
				<Sidebar.GroupLabel>Settings</Sidebar.GroupLabel>
				<Sidebar.Menu>
					{#each settingsItems as item}
						<Sidebar.MenuItem>
							<Sidebar.MenuButton>
								<item.icon class="size-4" />
								<span>{item.label}</span>
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>
					{/each}
				</Sidebar.Menu>
			</Sidebar.Group>
		</Sidebar.Content>

		<Sidebar.Footer>
			<div class="flex items-center gap-2 p-2">
				<Avatar.Root class="size-8">
					<Avatar.Image src="https://github.com/shadcn.png" alt="User" />
					<Avatar.Fallback>JD</Avatar.Fallback>
				</Avatar.Root>
				<div class="flex flex-col leading-tight">
					<span class="text-sm font-medium">John Doe</span>
					<span class="text-muted-foreground text-xs">john@example.com</span>
				</div>
			</div>
		</Sidebar.Footer>
		<Sidebar.Rail />
	</Sidebar.Root>

	<Sidebar.Inset>
		<!-- Header -->
		<header class="bg-background/80 sticky top-0 z-10 flex h-14 items-center gap-3 border-b px-4 backdrop-blur">
			<Sidebar.Trigger />
			<Separator orientation="vertical" class="h-5" />
			<Breadcrumb.Root>
				<Breadcrumb.List>
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Home</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<Breadcrumb.Link href="/">Components</Breadcrumb.Link>
					</Breadcrumb.Item>
					<Breadcrumb.Separator />
					<Breadcrumb.Item>
						<span class="text-foreground font-medium">Kitchen Sink</span>
					</Breadcrumb.Item>
				</Breadcrumb.List>
			</Breadcrumb.Root>
			<div class="ml-auto flex items-center gap-2">
				<Badge variant="outline">v1.3.0</Badge>
				<ThemePicker />
				<Button variant="ghost" size="icon" onclick={toggleMode}>
					<SunIcon class="dark:hidden size-4" />
					<MoonIcon class="hidden dark:block size-4" />
				</Button>
				<Button variant="ghost" size="icon" onclick={() => toast('You have 3 new notifications', { description: 'Check your inbox for details.' })}>
					<BellIcon class="size-4" />
				</Button>
			</div>
		</header>

		<!-- Main content -->
		<main class="flex-1 space-y-6 p-6">
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Kitchen Sink</h1>
				<p class="text-muted-foreground text-sm">Every shadcn-svelte component in one place.</p>
			</div>

			<!-- ── Tabs ── -->
			<Tabs.Root bind:value={tabsValue}>
				<Tabs.List>
					<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
					<Tabs.Trigger value="forms">Forms</Tabs.Trigger>
					<Tabs.Trigger value="overlays">Overlays</Tabs.Trigger>
					<Tabs.Trigger value="data">Data</Tabs.Trigger>
				</Tabs.List>

				<!-- ══ Overview tab ══ -->
				<Tabs.Content value="overview" class="space-y-6 pt-4">
					<div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">

						<!-- Buttons -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Buttons</Card.Title>
								<Card.Description>All button variants and sizes.</Card.Description>
							</Card.Header>
							<Card.Content class="flex flex-wrap gap-2">
								<Button>Default</Button>
								<Button variant="secondary">Secondary</Button>
								<Button variant="destructive">Destructive</Button>
								<Button variant="outline">Outline</Button>
								<Button variant="ghost">Ghost</Button>
								<Button variant="link">Link</Button>
								<Button size="sm">Small</Button>
								<Button size="lg">Large</Button>
								<Button size="icon"><SearchIcon class="size-4" /></Button>
								<Button disabled>Disabled</Button>
								<Button>
									<Spinner class="mr-2 size-4" />
									Loading
								</Button>
							</Card.Content>
						</Card.Root>

						<!-- Button Group -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Button Group</Card.Title>
								<Card.Description>Grouped actions and toggle formatting.</Card.Description>
							</Card.Header>
							<Card.Content class="flex flex-col gap-4">
								<ButtonGroup.Root>
									<Button variant="outline">Previous</Button>
									<Button variant="outline">1</Button>
									<Button variant="outline">2</Button>
									<Button variant="outline">3</Button>
									<Button variant="outline">Next</Button>
								</ButtonGroup.Root>
								<div class="flex gap-2">
									<Toggle bind:pressed={boldActive} aria-label="Bold">
										<BoldIcon class="size-4" />
									</Toggle>
									<Toggle bind:pressed={italicActive} aria-label="Italic">
										<ItalicIcon class="size-4" />
									</Toggle>
									<Toggle bind:pressed={underlineActive} aria-label="Underline">
										<UnderlineIcon class="size-4" />
									</Toggle>
								</div>
								<ToggleGroup.Root type="single" bind:value={alignValue}>
									<ToggleGroup.Item value="left" aria-label="Align left">
										<AlignLeftIcon class="size-4" />
									</ToggleGroup.Item>
									<ToggleGroup.Item value="center" aria-label="Align center">
										<AlignCenterIcon class="size-4" />
									</ToggleGroup.Item>
									<ToggleGroup.Item value="right" aria-label="Align right">
										<AlignRightIcon class="size-4" />
									</ToggleGroup.Item>
								</ToggleGroup.Root>
							</Card.Content>
						</Card.Root>

						<!-- Badges & Kbd -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Badges & Kbd</Card.Title>
								<Card.Description>Status indicators and keyboard shortcuts.</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-4">
								<div class="flex flex-wrap gap-2">
									<Badge>Default</Badge>
									<Badge variant="secondary">Secondary</Badge>
									<Badge variant="destructive">Destructive</Badge>
									<Badge variant="outline">Outline</Badge>
								</div>
								<Separator />
								<div class="flex flex-wrap items-center gap-2 text-sm">
									<span class="text-muted-foreground">Save file</span>
									<Kbd.Group>
										<Kbd.Root>⌘</Kbd.Root>
										<Kbd.Root>S</Kbd.Root>
									</Kbd.Group>
								</div>
								<div class="flex flex-wrap items-center gap-2 text-sm">
									<span class="text-muted-foreground">Command palette</span>
									<Kbd.Group>
										<Kbd.Root>⌘</Kbd.Root>
										<Kbd.Root>K</Kbd.Root>
									</Kbd.Group>
								</div>
							</Card.Content>
						</Card.Root>

						<!-- Alerts -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Alerts</Card.Title>
								<Card.Description>Inline feedback messages.</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-3">
								<Alert.Root>
									<InfoIcon class="size-4" />
									<Alert.Title>Heads up!</Alert.Title>
									<Alert.Description>You can add components and dependencies to your app using the CLI.</Alert.Description>
								</Alert.Root>
								<Alert.Root variant="destructive">
									<TriangleAlertIcon class="size-4" />
									<Alert.Title>Error</Alert.Title>
									<Alert.Description>Your session has expired. Please log in again.</Alert.Description>
								</Alert.Root>
							</Card.Content>
						</Card.Root>

						<!-- Avatar -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Avatar</Card.Title>
								<Card.Description>User profile pictures and groups.</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-4">
								<div class="flex items-center gap-3">
									<Avatar.Root class="size-10">
										<Avatar.Image src="https://github.com/shadcn.png" alt="shadcn" />
										<Avatar.Fallback>SC</Avatar.Fallback>
									</Avatar.Root>
									<Avatar.Root class="size-10">
										<Avatar.Fallback>JD</Avatar.Fallback>
									</Avatar.Root>
									<Avatar.Root class="size-8">
										<Avatar.Image src="https://github.com/sveltejs.png" alt="Svelte" />
										<Avatar.Fallback>SV</Avatar.Fallback>
									</Avatar.Root>
								</div>
								<Avatar.Group>
									{#each ['SC', 'JD', 'AB', 'MK'] as initials}
										<Avatar.Root class="ring-background size-8 ring-2">
											<Avatar.Fallback class="text-xs">{initials}</Avatar.Fallback>
										</Avatar.Root>
									{/each}
								</Avatar.Group>
							</Card.Content>
						</Card.Root>

						<!-- Skeleton & Spinner -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Skeleton & Spinner</Card.Title>
								<Card.Description>Loading placeholder states.</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-4">
								<div class="flex items-center gap-3">
									<Skeleton class="size-10 rounded-full" />
									<div class="space-y-2">
										<Skeleton class="h-4 w-36" />
										<Skeleton class="h-3 w-24" />
									</div>
								</div>
								<Skeleton class="h-20 w-full rounded-lg" />
								<div class="flex items-center gap-4">
									<Spinner class="size-4" />
									<Spinner class="size-6" />
									<Spinner class="size-8" />
								</div>
							</Card.Content>
						</Card.Root>

						<!-- Progress -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Progress</Card.Title>
								<Card.Description>Task completion indicators.</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-4">
								<div class="space-y-1">
									<div class="flex justify-between text-sm">
										<span>Storage used</span>
										<span class="text-muted-foreground">{progressValue}%</span>
									</div>
									<Progress value={progressValue} />
								</div>
								<div class="space-y-1">
									<div class="flex justify-between text-sm">
										<span>Upload progress</span>
										<span class="text-muted-foreground">28%</span>
									</div>
									<Progress value={28} />
								</div>
								<div class="space-y-1">
									<div class="flex justify-between text-sm">
										<span>Build complete</span>
										<span class="text-muted-foreground">100%</span>
									</div>
									<Progress value={100} />
								</div>
							</Card.Content>
						</Card.Root>

						<!-- Toasts -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Sonner Toasts</Card.Title>
								<Card.Description>Push transient notifications.</Card.Description>
							</Card.Header>
							<Card.Content class="flex flex-wrap gap-2">
								<Button variant="outline" onclick={() => toast('Event has been created.')}>
									Default
								</Button>
								<Button variant="outline" onclick={() => toast.success('Profile saved successfully.')}>
									Success
								</Button>
								<Button variant="outline" onclick={() => toast.error('Something went wrong.')}>
									Error
								</Button>
								<Button variant="outline" onclick={() => toast.warning('Low disk space.')}>
									Warning
								</Button>
								<Button variant="outline" onclick={() => toast.info('New update available.')}>
									Info
								</Button>
								<Button
									variant="outline"
									onclick={() =>
										toast('Undo available', {
											action: { label: 'Undo', onClick: () => toast.success('Undone!') },
										})}
								>
									With Action
								</Button>
							</Card.Content>
						</Card.Root>

						<!-- Empty State -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Empty State</Card.Title>
								<Card.Description>Zero-data placeholder.</Card.Description>
							</Card.Header>
							<Card.Content>
								<Empty.Root>
									<Empty.Header>
										<Empty.Media>
											<InboxIcon class="text-muted-foreground size-10" />
										</Empty.Media>
										<Empty.Title>No results found</Empty.Title>
										<Empty.Description>Try adjusting your search or filters.</Empty.Description>
									</Empty.Header>
									<Empty.Content>
										<Button size="sm" variant="outline">Clear filters</Button>
									</Empty.Content>
								</Empty.Root>
							</Card.Content>
						</Card.Root>

					</div>
				</Tabs.Content>

				<!-- ══ Forms tab ══ -->
				<Tabs.Content value="forms" class="space-y-6 pt-4">
					<div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">

						<!-- Input & Textarea -->
						<Card.Root class="xl:col-span-1">
							<Card.Header>
								<Card.Title>Input & Textarea</Card.Title>
								<Card.Description>Text entry controls.</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-3">
								<Input placeholder="Search components..." />
								<Input type="email" placeholder="name@example.com" />
								<Input type="password" placeholder="Password" />
								<Input disabled placeholder="Disabled input" />
								<Textarea placeholder="Write a message..." rows={3} />
							</Card.Content>
						</Card.Root>

						<!-- Select -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Select</Card.Title>
								<Card.Description>Dropdown option picker.</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-3">
								<Select.Root type="single" bind:value={selectValue}>
									<Select.Trigger>
										{selectValue || 'Select a framework…'}
									</Select.Trigger>
									<Select.Content>
										<Select.Group>
											<Select.GroupHeading>JavaScript</Select.GroupHeading>
											<Select.Item value="svelte">SvelteKit</Select.Item>
											<Select.Item value="next">Next.js</Select.Item>
											<Select.Item value="nuxt">Nuxt</Select.Item>
										</Select.Group>
										<Select.Separator />
										<Select.Group>
											<Select.GroupHeading>Other</Select.GroupHeading>
											<Select.Item value="astro">Astro</Select.Item>
											<Select.Item value="remix">Remix</Select.Item>
										</Select.Group>
									</Select.Content>
								</Select.Root>
								<Select.Root type="single">
									<Select.Trigger>Theme</Select.Trigger>
									<Select.Content>
										<Select.Item value="light">Light</Select.Item>
										<Select.Item value="dark">Dark</Select.Item>
										<Select.Item value="system">System</Select.Item>
									</Select.Content>
								</Select.Root>
							</Card.Content>
						</Card.Root>

						<!-- Checkbox & Switch -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Checkbox & Switch</Card.Title>
								<Card.Description>Boolean toggles.</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-4">
								<div class="space-y-2">
									<label class="flex items-center gap-2 text-sm">
										<Checkbox bind:checked={checkboxChecked} />
										Accept terms and conditions
									</label>
									<label class="flex items-center gap-2 text-sm">
										<Checkbox checked={false} />
										Send me marketing emails
									</label>
									<label class="flex items-center gap-2 text-sm">
										<Checkbox checked disabled />
										Required setting (disabled)
									</label>
								</div>
								<Separator />
								<div class="space-y-3">
									<label class="flex items-center justify-between text-sm">
										<span>Enable notifications</span>
										<Switch bind:checked={switchEnabled} />
									</label>
									<label class="flex items-center justify-between text-sm">
										<span>Dark mode</span>
										<Switch />
									</label>
									<label class="flex items-center justify-between text-sm">
										<span>Auto-save (disabled)</span>
										<Switch disabled />
									</label>
								</div>
							</Card.Content>
						</Card.Root>

						<!-- Radio Group -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Radio Group</Card.Title>
								<Card.Description>Single-choice selection.</Card.Description>
							</Card.Header>
							<Card.Content>
								<RadioGroup.Root bind:value={radioValue} class="space-y-2">
									<label class="flex items-center gap-2 text-sm">
										<RadioGroup.Item value="default" />
										Default
									</label>
									<label class="flex items-center gap-2 text-sm">
										<RadioGroup.Item value="comfortable" />
										Comfortable
									</label>
									<label class="flex items-center gap-2 text-sm">
										<RadioGroup.Item value="compact" />
										Compact
									</label>
								</RadioGroup.Root>
								<p class="text-muted-foreground mt-3 text-xs">Selected: {radioValue}</p>
							</Card.Content>
						</Card.Root>

						<!-- Slider -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Slider</Card.Title>
								<Card.Description>Range and value selection.</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-5">
								<div class="space-y-2">
									<div class="flex justify-between text-sm">
										<span>Volume</span>
										<span class="text-muted-foreground">{sliderValue[0]}%</span>
									</div>
									<Slider type="multiple" bind:value={sliderValue} min={0} max={100} step={1} />
								</div>
								<div class="space-y-2">
									<div class="flex justify-between text-sm">
										<span>Quality</span>
										<span class="text-muted-foreground">High</span>
									</div>
									<Slider type="multiple" value={[75]} min={0} max={100} step={25} />
								</div>
								<div class="space-y-2">
									<span class="text-sm">Disabled</span>
									<Slider type="multiple" value={[50]} disabled />
								</div>
							</Card.Content>
						</Card.Root>

						<!-- Calendar -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Calendar</Card.Title>
								<Card.Description>Date picker control.</Card.Description>
							</Card.Header>
							<Card.Content class="flex justify-center">
								<Calendar type="single" bind:value={calendarValue} />
							</Card.Content>
							{#if calendarValue}
								<Card.Footer class="pt-0">
									<p class="text-muted-foreground text-xs">
										Selected: {calendarValue.toString()}
									</p>
								</Card.Footer>
							{/if}
						</Card.Root>

					</div>
				</Tabs.Content>

				<!-- ══ Overlays tab ══ -->
				<Tabs.Content value="overlays" class="space-y-6 pt-4">
					<div class="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">

						<!-- Dialog -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Dialog</Card.Title>
								<Card.Description>Modal overlay for focused content.</Card.Description>
							</Card.Header>
							<Card.Content>
								<Dialog.Root>
									<Dialog.Trigger>
										{#snippet child({ props })}
											<Button {...props}>Open Dialog</Button>
										{/snippet}
									</Dialog.Trigger>
									<Dialog.Content>
										<Dialog.Header>
											<Dialog.Title>Edit Profile</Dialog.Title>
											<Dialog.Description>Make changes to your profile here. Click save when done.</Dialog.Description>
										</Dialog.Header>
										<div class="space-y-3 py-4">
											<Input placeholder="Name" />
											<Input placeholder="Username" />
										</div>
										<Dialog.Footer>
											<Dialog.Close>
												{#snippet child({ props })}
													<Button variant="outline" {...props}>Cancel</Button>
												{/snippet}
											</Dialog.Close>
											<Button onclick={() => toast.success('Profile saved!')}>Save changes</Button>
										</Dialog.Footer>
									</Dialog.Content>
								</Dialog.Root>
							</Card.Content>
						</Card.Root>

						<!-- Alert Dialog -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Alert Dialog</Card.Title>
								<Card.Description>Confirmation prompt for destructive actions.</Card.Description>
							</Card.Header>
							<Card.Content>
								<AlertDialog.Root>
									<AlertDialog.Trigger>
										{#snippet child({ props })}
											<Button variant="destructive" {...props}>Delete Account</Button>
										{/snippet}
									</AlertDialog.Trigger>
									<AlertDialog.Content>
										<AlertDialog.Header>
											<AlertDialog.Title>Are you absolutely sure?</AlertDialog.Title>
											<AlertDialog.Description>
												This action cannot be undone. This will permanently delete your account.
											</AlertDialog.Description>
										</AlertDialog.Header>
										<AlertDialog.Footer>
											<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
											<AlertDialog.Action onclick={() => toast.error('Account deleted.')}>
												Continue
											</AlertDialog.Action>
										</AlertDialog.Footer>
									</AlertDialog.Content>
								</AlertDialog.Root>
							</Card.Content>
						</Card.Root>

						<!-- Sheet -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Sheet</Card.Title>
								<Card.Description>Slide-in panel from screen edge.</Card.Description>
							</Card.Header>
							<Card.Content class="flex flex-wrap gap-2">
								{#each sheetSides as side}
									<Sheet.Root>
										<Sheet.Trigger>
											{#snippet child({ props })}
												<Button variant="outline" size="sm" {...props}>{side}</Button>
											{/snippet}
										</Sheet.Trigger>
										<Sheet.Content {side}>
											<Sheet.Header>
												<Sheet.Title>Sheet — {side}</Sheet.Title>
												<Sheet.Description>Slides in from the {side}.</Sheet.Description>
											</Sheet.Header>
											<div class="py-4">
												<Input placeholder="Your name" />
											</div>
											<Sheet.Footer>
												<Button onclick={() => toast.success('Saved!')}>Save</Button>
											</Sheet.Footer>
										</Sheet.Content>
									</Sheet.Root>
								{/each}
							</Card.Content>
						</Card.Root>

						<!-- Popover -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Popover</Card.Title>
								<Card.Description>Floating overlay anchored to a trigger.</Card.Description>
							</Card.Header>
							<Card.Content>
								<Popover.Root>
									<Popover.Trigger>
										{#snippet child({ props })}
											<Button variant="outline" {...props}>Open Popover</Button>
										{/snippet}
									</Popover.Trigger>
									<Popover.Content class="w-64">
										<Popover.Header>
											<Popover.Title>Dimensions</Popover.Title>
											<Popover.Description>Set the dimensions for the layer.</Popover.Description>
										</Popover.Header>
										<div class="space-y-2 pt-2">
											<div class="flex items-center gap-2">
												<span class="text-sm w-12">Width</span>
												<Input placeholder="100%" class="h-8 text-sm" />
											</div>
											<div class="flex items-center gap-2">
												<span class="text-sm w-12">Height</span>
												<Input placeholder="25px" class="h-8 text-sm" />
											</div>
										</div>
									</Popover.Content>
								</Popover.Root>
							</Card.Content>
						</Card.Root>

						<!-- Tooltip & HoverCard -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Tooltip & Hover Card</Card.Title>
								<Card.Description>Contextual information on hover.</Card.Description>
							</Card.Header>
							<Card.Content class="flex flex-col gap-4">
								<div class="flex flex-wrap gap-2">
									<Tooltip.Root>
										<Tooltip.Trigger>
											{#snippet child({ props })}
												<Button variant="outline" size="sm" {...props}>Top</Button>
											{/snippet}
										</Tooltip.Trigger>
										<Tooltip.Content side="top">Tooltip on top</Tooltip.Content>
									</Tooltip.Root>
									<Tooltip.Root>
										<Tooltip.Trigger>
											{#snippet child({ props })}
												<Button variant="outline" size="sm" {...props}>Right</Button>
											{/snippet}
										</Tooltip.Trigger>
										<Tooltip.Content side="right">Tooltip on right</Tooltip.Content>
									</Tooltip.Root>
									<Tooltip.Root>
										<Tooltip.Trigger>
											{#snippet child({ props })}
												<Button variant="outline" size="sm" {...props}>Bottom</Button>
											{/snippet}
										</Tooltip.Trigger>
										<Tooltip.Content side="bottom">Tooltip on bottom</Tooltip.Content>
									</Tooltip.Root>
								</div>
								<Separator />
								<HoverCard.Root>
									<HoverCard.Trigger>
										{#snippet child({ props })}
											<Button variant="link" class="h-auto p-0" {...props}>@shadcn</Button>
										{/snippet}
									</HoverCard.Trigger>
									<HoverCard.Content class="w-64">
										<div class="flex gap-3">
											<Avatar.Root class="size-10">
												<Avatar.Image src="https://github.com/shadcn.png" alt="shadcn" />
												<Avatar.Fallback>SC</Avatar.Fallback>
											</Avatar.Root>
											<div class="space-y-1">
												<p class="text-sm font-medium">@shadcn</p>
												<p class="text-muted-foreground text-xs">Creator of shadcn/ui. Building things.</p>
												<div class="flex items-center gap-1 text-xs text-muted-foreground">
													<CalendarIcon class="size-3" />
													<span>Joined December 2021</span>
												</div>
											</div>
										</div>
									</HoverCard.Content>
								</HoverCard.Root>
							</Card.Content>
						</Card.Root>

						<!-- Command -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Command</Card.Title>
								<Card.Description>Search-driven command palette.</Card.Description>
							</Card.Header>
							<Card.Content>
								<Command.Root class="rounded-lg border shadow-sm">
									<Command.Input placeholder="Type a command or search…" />
									<Command.List>
										<Command.Empty>No results found.</Command.Empty>
										<Command.Group heading="Suggestions">
											<Command.Item>
												<CalendarIcon class="mr-2 size-4" />
												Calendar
												<Command.Shortcut>⌘C</Command.Shortcut>
											</Command.Item>
											<Command.Item>
												<UsersIcon class="mr-2 size-4" />
												Team
												<Command.Shortcut>⌘T</Command.Shortcut>
											</Command.Item>
											<Command.Item>
												<SettingsIcon class="mr-2 size-4" />
												Settings
												<Command.Shortcut>⌘S</Command.Shortcut>
											</Command.Item>
										</Command.Group>
										<Command.Separator />
										<Command.Group heading="Actions">
											<Command.Item>
												<ZapIcon class="mr-2 size-4" />
												Run workflow
											</Command.Item>
											<Command.Item>
												<GitBranchIcon class="mr-2 size-4" />
												Create branch
											</Command.Item>
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Card.Content>
						</Card.Root>

					</div>
				</Tabs.Content>

				<!-- ══ Data tab ══ -->
				<Tabs.Content value="data" class="space-y-6 pt-4">
					<div class="grid gap-6 xl:grid-cols-2">

						<!-- Table -->
						<Card.Root class="xl:col-span-2">
							<Card.Header>
								<Card.Title>Table</Card.Title>
								<Card.Description>Tabular data display.</Card.Description>
							</Card.Header>
							<Card.Content>
								<Table.Root>
									<Table.Header>
										<Table.Row>
											<Table.Head>Invoice</Table.Head>
											<Table.Head>Status</Table.Head>
											<Table.Head>Method</Table.Head>
											<Table.Head class="text-right">Amount</Table.Head>
										</Table.Row>
									</Table.Header>
									<Table.Body>
										{#each tableRows as row}
											<Table.Row>
												<Table.Cell class="font-medium">{row.invoice}</Table.Cell>
												<Table.Cell>
													<span class="rounded-full px-2 py-0.5 text-xs font-medium {statusColor[row.status]}">
														{row.status}
													</span>
												</Table.Cell>
												<Table.Cell>{row.method}</Table.Cell>
												<Table.Cell class="text-right">{row.amount}</Table.Cell>
											</Table.Row>
										{/each}
									</Table.Body>
									<Table.Footer>
										<Table.Row>
											<Table.Cell colspan={3} class="font-medium">Total</Table.Cell>
											<Table.Cell class="text-right font-medium">$1,500.00</Table.Cell>
										</Table.Row>
									</Table.Footer>
								</Table.Root>
							</Card.Content>
						</Card.Root>

						<!-- Accordion -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Accordion</Card.Title>
								<Card.Description>Expandable content sections.</Card.Description>
							</Card.Header>
							<Card.Content>
								<Accordion.Root type="single" class="w-full">
									<Accordion.Item value="item-1">
										<Accordion.Trigger>Is it accessible?</Accordion.Trigger>
										<Accordion.Content>
											Yes. It adheres to the WAI-ARIA design pattern.
										</Accordion.Content>
									</Accordion.Item>
									<Accordion.Item value="item-2">
										<Accordion.Trigger>Is it styled?</Accordion.Trigger>
										<Accordion.Content>
											Yes. It comes with default styles that match the other components' aesthetic.
										</Accordion.Content>
									</Accordion.Item>
									<Accordion.Item value="item-3">
										<Accordion.Trigger>Is it animated?</Accordion.Trigger>
										<Accordion.Content>
											Yes. It's animated by default, but you can disable it if you prefer.
										</Accordion.Content>
									</Accordion.Item>
								</Accordion.Root>
							</Card.Content>
						</Card.Root>

						<!-- Pagination & NavigationMenu -->
						<Card.Root>
							<Card.Header>
								<Card.Title>Pagination</Card.Title>
								<Card.Description>Multi-page navigation controls.</Card.Description>
							</Card.Header>
							<Card.Content class="space-y-4">
								<Pagination.Root count={100} perPage={10}>
									{#snippet children({ pages, currentPage })}
										<Pagination.Content>
											<Pagination.Item>
												<Pagination.Previous />
											</Pagination.Item>
											{#each pages as page (page.key)}
												{#if page.type === 'ellipsis'}
													<Pagination.Item>
														<Pagination.Ellipsis />
													</Pagination.Item>
												{:else}
													<Pagination.Item>
														<Pagination.Link {page} isActive={currentPage === page.value}>
															{page.value}
														</Pagination.Link>
													</Pagination.Item>
												{/if}
											{/each}
											<Pagination.Item>
												<Pagination.Next />
											</Pagination.Item>
										</Pagination.Content>
									{/snippet}
								</Pagination.Root>
							</Card.Content>
						</Card.Root>

					</div>
				</Tabs.Content>
			</Tabs.Root>
		</main>
	</Sidebar.Inset>
</Sidebar.Provider>

</Tooltip.Provider>
