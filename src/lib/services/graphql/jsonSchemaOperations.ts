/**
 * @deprecated Use Extraction-based data flow instead. The Extraction type
 * stores schemas inline, eliminating the need for a separate JsonSchema entity.
 *
 * JsonSchema GraphQL operations for the webapp — kept for backward compatibility.
 */
import { gql } from 'graphql-tag';

export const JSON_SCHEMA_FIELDS = gql`
	fragment JsonSchemaFields on JsonSchema {
		id
		entityType
		tenantId
		ownerId
		createdAt
		updatedAt
		deletedAt
		sharingMode
		sourceJsonSchemaId
		name
		description
		schemaDefinition
	}
`;

export const Q_GET_JSON_SCHEMA = gql`
	query GetJsonSchema($id: ID!) {
		getJsonSchema(id: $id) {
			...JsonSchemaFields
		}
	}
	${JSON_SCHEMA_FIELDS}
`;

export const Q_LIST_JSON_SCHEMAS = gql`
	query ListJsonSchemas($scope: ListScope, $limit: Int, $nextToken: String) {
		listJsonSchemas(scope: $scope, limit: $limit, nextToken: $nextToken) {
			items {
				...JsonSchemaFields
			}
			nextToken
		}
	}
	${JSON_SCHEMA_FIELDS}
`;

export const M_CREATE_JSON_SCHEMA = gql`
	mutation CreateJsonSchema($input: CreateJsonSchemaInput!) {
		createJsonSchema(input: $input) {
			...JsonSchemaFields
		}
	}
	${JSON_SCHEMA_FIELDS}
`;

export const M_UPDATE_JSON_SCHEMA = gql`
	mutation UpdateJsonSchema($id: ID!, $input: UpdateJsonSchemaInput!) {
		updateJsonSchema(id: $id, input: $input) {
			...JsonSchemaFields
		}
	}
	${JSON_SCHEMA_FIELDS}
`;

export const M_DELETE_JSON_SCHEMA = gql`
	mutation DeleteJsonSchema($id: ID!) {
		deleteJsonSchema(id: $id) {
			...JsonSchemaFields
		}
	}
	${JSON_SCHEMA_FIELDS}
`;

export const S_ON_CREATE_JSON_SCHEMA = gql`
	subscription OnCreateJsonSchema {
		onCreateJsonSchema {
			...JsonSchemaFields
		}
	}
	${JSON_SCHEMA_FIELDS}
`;

export const S_ON_UPDATE_JSON_SCHEMA = gql`
	subscription OnUpdateJsonSchema($id: ID!) {
		onUpdateJsonSchema(id: $id) {
			...JsonSchemaFields
		}
	}
	${JSON_SCHEMA_FIELDS}
`;

export const S_ON_DELETE_JSON_SCHEMA = gql`
	subscription OnDeleteJsonSchema($id: ID!) {
		onDeleteJsonSchema(id: $id) {
			...JsonSchemaFields
		}
	}
	${JSON_SCHEMA_FIELDS}
`;
