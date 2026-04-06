import { z } from 'zod';

export const brokerCardWidgetDataSchema = z.object({
	title: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	fullName: z.string().min(1),
	company: z.string().min(1),
	phone: z.string().nullable().optional(),
	email: z.string().nullable().optional(),
	/** Up to ~4 characters shown in the avatar circle when no `avatarUrl`. */
	initials: z.string().max(4).nullable().optional(),
	avatarUrl: z.string().url().nullable().optional()
});

export type BrokerCardWidgetData = z.infer<typeof brokerCardWidgetDataSchema>;

export const brokerCardAiOutputSchema = z.object({
	fullName: z.string().describe('Full name of the broker or contact'),
	company: z.string().describe('Company or brokerage name'),
	phone: z.string().nullable().optional().describe('Phone number'),
	email: z.string().nullable().optional().describe('Email address'),
	initials: z.string().nullable().optional().describe('Up to 4-character initials for avatar')
});

export type BrokerCardAiOutput = z.infer<typeof brokerCardAiOutputSchema>;
