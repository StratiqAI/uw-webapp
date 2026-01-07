/** 
 * mqtt-store.svelte.ts 
 */
import Ajv, { type Schema } from 'ajv';
import addFormats from 'ajv-formats';

const ajv = new Ajv({ allErrors: true, useDefaults: true });
addFormats(ajv);

export class ValidatedTopicStore {
	#tree = $state<Record<string, any>>({});
	#schemas = new Map<string, { validate: any; raw: Schema }>();
	#errors = $state<Record<string, any>>({});

	/**
	 * Register a JSON Schema for a specific topic pattern.
	 * Supports wildcards (e.g., "sensors/#" or "projects/+/status")
	 */
	registerSchema(pattern: string, schema: Schema) {
		const validate = ajv.compile(schema);
		this.#schemas.set(pattern, { validate, raw: schema });
	}

	/**
	 * Finds the best matching schema for a topic
	 */
	#getValidator(topic: string) {
		// Priority 1: Exact Match
		if (this.#schemas.has(topic)) return this.#schemas.get(topic);

		// Priority 2: Simple Wildcard matching (this is a simplified logic)
		for (const [pattern, entry] of this.#schemas.entries()) {
			const regex = new RegExp('^' + pattern.replace('+', '[^/]+').replace('#', '.*') + '$');
			if (regex.test(topic)) return entry;
		}
		return null;
	}

	publish(topic: string, value: any): boolean {
		const entry = this.#getValidator(topic);

		if (entry) {
			const isValid = entry.validate(value);
			if (!isValid) {
				this.#errors[topic] = entry.validate.errors;
				console.error(`Validation failed for ${topic}:`, entry.validate.errors);
				return false;
			}
		}

		// Clear errors on success and update state
		delete this.#errors[topic];
		this.#setPath(topic, value);
		return true;
	}

	#setPath(path: string, value: any) {
		const parts = path.split('/');
		let current = this.#tree;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			if (i === parts.length - 1) {
				current[part] = value;
			} else {
				if (!(part in current)) current[part] = {};
				current = current[part];
			}
		}
	}

	at<T>(topic: string): T | undefined {
		return topic.split('/').reduce((obj, key) => obj?.[key], this.#tree) as T;
	}

	/**
	 * AI UTILITY: Export a prompt fragment for a topic
	 */
	getAISchemaPrompt(topic: string): string {
		const entry = this.#getValidator(topic);
		if (!entry) return "Any valid JSON object.";
		
		return `You must return valid JSON that adheres to this schema for the topic "${topic}":
\`\`\`json
${JSON.stringify(entry.raw, null, 2)}
\`\`\``;
	}

	get errors() { return this.#errors; }
	get tree() { return this.#tree; }
}

export const store = new ValidatedTopicStore();