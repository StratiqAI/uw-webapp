<script lang="ts">
	type TitleParagraphProps = {
		title: string;
		paragraph: string;
	};

	let { title = 'Title', paragraph = 'Paragraph' }: TitleParagraphProps = $props();

	import { Card, Dropdown, DropdownItem, Heading, P } from 'flowbite-svelte';
	import { CogOutline, ClockOutline, TrashBinOutline } from 'flowbite-svelte-icons';

	let isClicked = $state(false);
	let cardElement: any;

	function handleClick() {
		isClicked = !isClicked;
		if (isClicked) {
			cardElement.$$.ctx[0].focus();
		}
	}

	function handleBlur() {
		isClicked = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			isClicked = false;
			cardElement.$$.ctx[0].blur();
		}
	}
</script>

<Card
	bind:this={cardElement}
	class="relative w-full max-w-none cursor-pointer p-4 transition-all duration-300 sm:p-5 md:p-7 {isClicked
		? 'shadow-2xl shadow-blue-400/50 ring-1 ring-blue-500 drop-shadow-2xl'
		: 'hover:shadow-md'}"
	onclick={handleClick}
	onblur={handleBlur}
	onkeydown={handleKeydown}
	tabindex={0}
>
	<img
		src="/images/icons/brain.svg"
		alt="Brain"
		class="absolute right-2 top-2 z-10 h-10 w-10 rounded p-1 ring-0 ring-gray-400 transition-colors duration-200 hover:bg-gray-100"
	/>
	<Dropdown
		class="absolute right-12 top-2 z-20 min-w-[200px] list-none rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
	>
		<DropdownItem
			class="flex list-none items-center gap-3 px-4 py-2 text-sm font-medium transition-colors duration-150 hover:bg-blue-50 hover:text-blue-700"
		>
			<CogOutline class="h-4 w-4" />
			Add custom AI instructions
		</DropdownItem>
		<DropdownItem
			class="flex list-none items-center gap-3 px-4 py-2 text-sm font-medium transition-colors duration-150 hover:bg-blue-50 hover:text-blue-700"
		>
			<ClockOutline class="h-4 w-4" />
			History of Data Sources
		</DropdownItem>
		<DropdownItem
			class="mt-1 flex list-none items-center gap-3 border-t border-gray-100 px-4 py-2 pt-3 text-sm font-medium transition-colors duration-150 hover:bg-red-50 hover:text-red-700"
		>
			<TrashBinOutline class="h-4 w-4" />
			Delete
		</DropdownItem>
	</Dropdown>
	<div class="flex flex-col items-center pb-4">
		<Heading tag="h3" class="text-md mb-4 font-extrabold  md:text-lg lg:text-xl">{title}</Heading>
		<P class="mb-3 text-lg font-normal leading-tight text-gray-700 dark:text-gray-400"
			>{paragraph}</P
		>
	</div>
</Card>
