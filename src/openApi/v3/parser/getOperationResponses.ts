import { Model } from '../../../client/interfaces/Model';
import type { OperationResponse } from '../../../client/interfaces/OperationResponse';
import { OpenAPIV3 } from '../../interfaces/OpenApiTypes';
import { Parser } from '../Parser';
import { getOperationResponseCode } from './getOperationResponseCode';

export function getOperationResponses(this: Parser, openApi: OpenAPIV3.Document, responses: OpenAPIV3.ResponsesObject, models: Model[], parentRef = ''): OperationResponse[] {
    const operationResponses: OperationResponse[] = [];

    // Iterate over each response code and get the
    // status code and response message (if any).
    for (const code in responses) {
        if (responses.hasOwnProperty(code)) {
            const response = responses[code] as OpenAPIV3.ResponseObject;
            const responseCode = getOperationResponseCode(code);

            if (responseCode) {
                const operationResponse = this.getOperationResponse(openApi, response, responseCode, parentRef, models);
                operationResponses.push(operationResponse);
            }
        }
    }

    // Sort the responses to 2XX success codes come before 4XX and 5XX error codes.
    return operationResponses.sort((a, b): number => {
        return a.code < b.code ? -1 : a.code > b.code ? 1 : 0;
    });
}
