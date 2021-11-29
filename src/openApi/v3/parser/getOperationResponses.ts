import type { OperationResponse } from '../../../client/interfaces/OperationResponse';
import { Context } from '../../../core/Context';
import type { OpenApi } from '../interfaces/OpenApi';
import type { OpenApiResponse } from '../interfaces/OpenApiResponse';
import type { OpenApiResponses } from '../interfaces/OpenApiResponses';
import { getOperationResponse } from './getOperationResponse';
import { getOperationResponseCode } from './getOperationResponseCode';
import { GetTypeName } from './getType';

export function getOperationResponses(context: Context, openApi: OpenApi, responses: OpenApiResponses, getTypeByRef: GetTypeName): OperationResponse[] {
    const operationResponses: OperationResponse[] = [];

    // Iterate over each response code and get the
    // status code and response message (if any).
    for (const code in responses) {
        if (responses.hasOwnProperty(code)) {
            const responseOrReference = responses[code];
            const response = (responseOrReference.$ref ? (context.get(responseOrReference.$ref) as Record<string, any>) : responseOrReference) as OpenApiResponse;
            const responseCode = getOperationResponseCode(code);

            if (responseCode) {
                const operationResponse = getOperationResponse(openApi, response, responseCode, getTypeByRef, '');
                operationResponses.push(operationResponse);
            }
        }
    }

    // Sort the responses to 2XX success codes come before 4XX and 5XX error codes.
    return operationResponses.sort((a, b): number => {
        return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
    });
}
