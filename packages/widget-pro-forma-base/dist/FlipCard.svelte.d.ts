import type { Snippet } from 'svelte';
interface Props {
    isFlipped: boolean;
    shellClass: string;
    flipBackClass: string;
    front: Snippet;
    back: Snippet;
}
declare const FlipCard: import("svelte").Component<Props, {}, "">;
type FlipCard = ReturnType<typeof FlipCard>;
export default FlipCard;
