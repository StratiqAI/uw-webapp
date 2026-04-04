/**
 * Prompt GraphQL operations aligned with the deployed AppSync schema (see @stratiqai/types-simple schema).
 * Kept in the webapp so queries stay in sync with the API even when the published types-simple tarball lags.
 */
import { gql } from 'graphql-tag';

export const PROMPT_FIELDS = gql`
	fragment PromptFields on Prompt {
		id
		entityType
		tenantId
		ownerId
		createdAt
		updatedAt
		deletedAt
		sharingMode
		name
		description
		prompt
		systemInstruction
		inputVariables
		model
		version
		isActive
		jsonSchemaId
	}
`;

export const Q_GET_PROMPT = gql`
	query GetPrompt($id: ID!) {
		getPrompt(id: $id) {
			...PromptFields
		}
	}
	${PROMPT_FIELDS}
`;

export const Q_LIST_PROMPTS = gql`
	query ListPrompts($scope: ListScope, $limit: Int, $nextToken: String) {
		listPrompts(scope: $scope, limit: $limit, nextToken: $nextToken) {
			items {
				...PromptFields
			}
			nextToken
		}
	}
	${PROMPT_FIELDS}
`;

export const M_CREATE_PROMPT = gql`
	mutation CreatePrompt($input: CreatePromptInput!) {
		createPrompt(input: $input) {
			...PromptFields
		}
	}
	${PROMPT_FIELDS}
`;

export const M_UPDATE_PROMPT = gql`
	mutation UpdatePrompt($id: ID!, $input: UpdatePromptInput!) {
		updatePrompt(id: $id, input: $input) {
			...PromptFields
		}
	}
	${PROMPT_FIELDS}
`;

export const M_DELETE_PROMPT = gql`
	mutation DeletePrompt($id: ID!) {
		deletePrompt(id: $id) {
			...PromptFields
		}
	}
	${PROMPT_FIELDS}
`;

export const S_ON_CREATE_PROMPT = gql`
	subscription OnCreatePrompt {
		onCreatePrompt {
			...PromptFields
		}
	}
	${PROMPT_FIELDS}
`;

export const S_ON_UPDATE_PROMPT = gql`
	subscription OnUpdatePrompt($id: ID!) {
		onUpdatePrompt(id: $id) {
			...PromptFields
		}
	}
	${PROMPT_FIELDS}
`;

export const S_ON_DELETE_PROMPT = gql`
	subscription OnDeletePrompt($id: ID!) {
		onDeletePrompt(id: $id) {
			...PromptFields
		}
	}
	${PROMPT_FIELDS}
`;

export const M_GENERATE_PROMPT_DRAFT = gql`
	mutation GeneratePromptDraft($input: GeneratePromptDraftInput!) {
		generatePromptDraft(input: $input) {
			prompt
			systemInstruction
			jsonSchema
			suggestedName
		}
	}
`;
