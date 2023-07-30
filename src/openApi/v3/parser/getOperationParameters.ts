import type { OperationParameters } from '../../../client/interfaces/OperationParameters';
import { sortByRequired } from '../../../utils/sortByRequired';
import { OpenAPIV3 } from '../../interfaces/OpenApiTypes';
import { Parser } from '../Parser';

export function getOperationParameters(this: Parser, openApi: OpenAPIV3.Document, parameters: OpenAPIV3.ParameterObject[]): OperationParameters {
    const operationParameters: OperationParameters = {
        imports: [],
        parameters: [],
        parametersPath: [],
        parametersQuery: [],
        parametersForm: [],
        parametersCookie: [],
        parametersHeader: [],
        parametersBody: null, // Not used in V3 -> @see requestBody
    };

    // Iterate over the parameters
    parameters.forEach(parameterDefinition => {
        const parameter = this.getOperationParameter(openApi, parameterDefinition);

        // We ignore the "api-version" param, since we do not want to add this
        // as the first / default parameter for each of the service calls.
        if (parameter.prop !== 'api-version') {
            switch (parameterDefinition.in) {
                case 'path':
                    operationParameters.parametersPath.push(parameter);
                    operationParameters.parameters.push(parameter);
                    operationParameters.imports.push(...parameter.imports);
                    break;

                case 'query':
                    operationParameters.parametersQuery.push(parameter);
                    operationParameters.parameters.push(parameter);
                    operationParameters.imports.push(...parameter.imports);
                    break;

                case 'formData':
                    operationParameters.parametersForm.push(parameter);
                    operationParameters.parameters.push(parameter);
                    operationParameters.imports.push(...parameter.imports);
                    break;

                case 'cookie':
                    operationParameters.parametersCookie.push(parameter);
                    operationParameters.parameters.push(parameter);
                    operationParameters.imports.push(...parameter.imports);
                    break;

                case 'header':
                    operationParameters.parametersHeader.push(parameter);
                    operationParameters.parameters.push(parameter);
                    operationParameters.imports.push(...parameter.imports);
                    break;
            }
        }
    });

    operationParameters.parameters = operationParameters.parameters.sort(sortByRequired);
    operationParameters.parametersPath = operationParameters.parametersPath.sort(sortByRequired);
    operationParameters.parametersQuery = operationParameters.parametersQuery.sort(sortByRequired);
    operationParameters.parametersForm = operationParameters.parametersForm.sort(sortByRequired);
    operationParameters.parametersCookie = operationParameters.parametersCookie.sort(sortByRequired);
    operationParameters.parametersHeader = operationParameters.parametersHeader.sort(sortByRequired);
    return operationParameters;
}
