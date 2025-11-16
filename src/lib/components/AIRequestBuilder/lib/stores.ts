// src/lib/stores.ts

import { writable } from 'svelte/store';

export const notification = writable<string | null>(null);