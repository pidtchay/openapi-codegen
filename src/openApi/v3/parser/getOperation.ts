import { Model } from '../../../client/interfaces/Model';
import type { Operation } from '../../../client/interfaces/Operation';
import { sortByRequired } from '../../../utils/sortByRequired';
import { OpenAPIV3 } from '../../interfaces/OpenApiTypes';
import { Parser } from '../Parser';
import { getComment } from './getComment';
import { getOperationErrors } from './getOperationErrors';
import { getOperationName } from './getOperationName';
import { getOperationPath } from './getOperationPath';
import { getOperationResponseHeader } from './getOperationResponseHeader';
import { getOperationResults } from './getOperationResults';

export function getOperation(
    this: Parser,
    openApi: OpenAPIV3.Document,
    url: string,
    method: string,
    op: OpenAPIV3.OperationObject,
    serviceClassName: string,
    models: Model[],
    parentRef = ''
): Operation {
    const operationNameFallback = `${method}${serviceClassName}`;
    const operationName = getOperationName(op.operationId || operationNameFallback);
    const operationPath = getOperationPath(url);

    // Create a new operation object for this method.
    const operation: Operation = {
        service: serviceClassName,
        name: operationName,
        summary: getComment(op.summary),
        description: getComment(op.description),
        deprecated: op.deprecated === true,
        method: method.toUpperCase(),
        path: operationPath,
        parameters: [],
        parametersPath: [],
        parametersQuery: [],
        parametersForm: [],
        parametersHeader: [],
        parametersCookie: [],
        parametersBody: null,
        imports: [],
        errors: [],
        results: [],
        responseHeader: null,
    };

    // const SCHEMA_HTTP_METHODS_ARRAY: string[] = Object.values(OpenAPIV3.HttpMethods);
    // const refsValues = this.context.values();
    // const listOfAllRef = Object.entries(refsValues);
    // listOfAllRef.shift();
    // const operationsList = listOfAllRef.filter(([_definitionName, definition]) => Object.keys(definition).some(key => SCHEMA_HTTP_METHODS_ARRAY.includes(key)));
    // const filterSet = new Set(operationsList);
    // const listOfModelsRef = listOfAllRef.filter(item => filterSet.has(item));
    // console.log(listOfModelsRef);

    // Parse the operation parameters (path, query, body, etc).
    if (op.parameters) {
        const parameters = this.getOperationParameters(openApi, op.parameters as OpenAPIV3.ParameterObject[]);
        operation.imports.push(...parameters.imports);
        operation.parameters.push(...parameters.parameters);
        operation.parametersPath.push(...parameters.parametersPath);
        operation.parametersQuery.push(...parameters.parametersQuery);
        operation.parametersForm.push(...parameters.parametersForm);
        operation.parametersHeader.push(...parameters.parametersHeader);
        operation.parametersCookie.push(...parameters.parametersCookie);
        operation.parametersBody = parameters.parametersBody;
    }

    if (op.requestBody) {
        const requestBodyDefinition = op.requestBody as OpenAPIV3.RequestBodyObject;
        const requestBody = this.getOperationRequestBody(openApi, requestBodyDefinition, models, parentRef);
        // if (requestBody.name == 'formData') {
        //     operation.parameters.push(requestBody);
        //     operation.parameters = operation.parameters.sort(sortByRequired);
        //     operation.parametersFormData = requestBody;
        // } else {
        //     operation.imports.push(...requestBody.imports);
        //     operation.parameters.push(requestBody);
        //     operation.parameters = operation.parameters.sort(sortByRequired);
        //     operation.parametersBody = requestBody;
        // }
        operation.imports.push(...requestBody.imports);
        operation.parameters.push(requestBody);
        operation.parameters = operation.parameters.sort(sortByRequired);
        operation.parametersBody = requestBody;
    }

    // Parse the operation responses.
    if (op.responses) {
        const operationResponses = this.getOperationResponses(openApi, op.responses, models, parentRef);
        const operationResults = getOperationResults(operationResponses);
        operation.errors = getOperationErrors(operationResponses);
        operation.responseHeader = getOperationResponseHeader(operationResults);

        operationResults.forEach(operationResult => {
            operation.results.push(operationResult);
            operation.imports.push(...operationResult.imports);
        });
    }

    return operation;
}
