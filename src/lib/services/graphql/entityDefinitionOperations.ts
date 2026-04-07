/**
 * EntityDefinition GraphQL operations for the webapp.
 * Matches the deployed AppSync schema (EntityDefinition implements Node & Metadata & Shareable).
 */
import { gql } from 'graphql-tag';

export const ENTITY_DEFINITION_FIELDS = gql`
	fragment EntityDefinitionFields on EntityDefinition {
		id
		entityType
		tenantId
		ownerId
		createdAt
		updatedAt
		deletedAt
		sharingMode
		sourceEntityDefinitionId
		name
		description
		schemaDefinition
		normalizedSchema
		structuralHash
		projectId
		properties {
			name
			dataType
			description
			required
		}
	}
`;

export const Q_GET_ENTITY_DEFINITION = gql`
	query GetEntityDefinition($id: ID!) {
		getEntityDefinition(id: $id) {
			...EntityDefinitionFields
		}
	}
	${ENTITY_DEFINITION_FIELDS}
`;

export const Q_LIST_ENTITY_DEFINITIONS = gql`
	query ListEntityDefinitions($scope: ListScope, $limit: Int, $nextToken: String) {
		listEntityDefinitions(scope: $scope, limit: $limit, nextToken: $nextToken) {
			items {
				...EntityDefinitionFields
			}
			nextToken
		}
	}
	${ENTITY_DEFINITION_FIELDS}
`;

export const Q_LIST_ENTITY_DEFINITIONS_BY_PROJECT = gql`
	query ListEntityDefinitionsByProject($projectId: ID!, $limit: Int, $nextToken: String) {
		listEntityDefinitionsByProject(projectId: $projectId, limit: $limit, nextToken: $nextToken) {
			items {
				...EntityDefinitionFields
			}
			nextToken
		}
	}
	${ENTITY_DEFINITION_FIELDS}
`;

export const Q_GET_ENTITY_DEFINITION_BY_HASH = gql`
	query GetEntityDefinitionByHash($projectId: ID!, $structuralHash: String!) {
		getEntityDefinitionByHash(projectId: $projectId, structuralHash: $structuralHash) {
			...EntityDefinitionFields
		}
	}
	${ENTITY_DEFINITION_FIELDS}
`;

export const M_CREATE_ENTITY_DEFINITION = gql`
	mutation CreateEntityDefinition($input: CreateEntityDefinitionInput!) {
		createEntityDefinition(input: $input) {
			...EntityDefinitionFields
		}
	}
	${ENTITY_DEFINITION_FIELDS}
`;

export const M_UPDATE_ENTITY_DEFINITION = gql`
	mutation UpdateEntityDefinition($id: ID!, $input: UpdateEntityDefinitionInput!) {
		updateEntityDefinition(id: $id, input: $input) {
			...EntityDefinitionFields
		}
	}
	${ENTITY_DEFINITION_FIELDS}
`;

export const M_DELETE_ENTITY_DEFINITION = gql`
	mutation DeleteEntityDefinition($id: ID!) {
		deleteEntityDefinition(id: $id) {
			...EntityDefinitionFields
		}
	}
	${ENTITY_DEFINITION_FIELDS}
`;

export const S_ON_CREATE_ENTITY_DEFINITION = gql`
	subscription OnCreateEntityDefinition {
		onCreateEntityDefinition {
			...EntityDefinitionFields
		}
	}
	${ENTITY_DEFINITION_FIELDS}
`;

export const S_ON_UPDATE_ENTITY_DEFINITION = gql`
	subscription OnUpdateEntityDefinition($id: ID!) {
		onUpdateEntityDefinition(id: $id) {
			...EntityDefinitionFields
		}
	}
	${ENTITY_DEFINITION_FIELDS}
`;

export const S_ON_DELETE_ENTITY_DEFINITION = gql`
	subscription OnDeleteEntityDefinition($id: ID!) {
		onDeleteEntityDefinition(id: $id) {
			...EntityDefinitionFields
		}
	}
	${ENTITY_DEFINITION_FIELDS}
`;

export const S_ON_PROJECT_ENTITY_DEFINITION_CHANGED = gql`
	subscription OnProjectEntityDefinitionChanged($projectId: ID!) {
		onProjectEntityDefinitionChanged(projectId: $projectId) {
			...EntityDefinitionFields
		}
	}
	${ENTITY_DEFINITION_FIELDS}
`;

export const S_ON_PROJECT_ENTITY_DEFINITION_DELETED = gql`
	subscription OnProjectEntityDefinitionDeleted($projectId: ID!) {
		onProjectEntityDefinitionDeleted(projectId: $projectId) {
			...EntityDefinitionFields
		}
	}
	${ENTITY_DEFINITION_FIELDS}
`;
