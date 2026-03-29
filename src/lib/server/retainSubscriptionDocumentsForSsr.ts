/**
 * Client code uses these documents in onMount / browser-only paths; SSR bundles still
 * import them via re-exports and Rollup would report them unused. Evaluating print() here
 * keeps the operations in the server graph without changing runtime behavior (module is loaded once).
 */
import { print } from 'graphql';
import {
	S_ON_CREATE_NOTIFICATION,
	S_ON_WORKFLOW_EXECUTION_STATUS_CHANGE
} from '@stratiqai/types-simple';

void (print(S_ON_CREATE_NOTIFICATION).length + print(S_ON_WORKFLOW_EXECUTION_STATUS_CHANGE).length);
