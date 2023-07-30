import type { Dictionary } from '../../../utils/types';
import { OpenAPIV3 } from '../../interfaces/OpenApiTypes';

// enum EApplicationMediaType {
//     JSON_PATCH = 'application/json-patch+json',
//     JSON = 'application/json',
// }

// enum ETextMediaType {
//     JSON = 'text/json',
//     PLAIN = 'text/plain',
// }

// enum EMultiPartMediaType {
//     MIXED = 'multipart/mixed',
//     RELATED = 'multipart/related',
//     BATCH = 'multipart/batch',
//     FORM_DATA = 'multipart/form-data',
// }

export function getContent(content: Dictionary<OpenAPIV3.MediaTypeObject>): OpenAPIV3.SchemaObject | null {
    /* prettier-ignore */
    return (
        content['application/json-patch+json'] &&
        content['application/json-patch+json'].schema as any
    ) || (
        content['application/json'] &&
        content['application/json'].schema
    ) || (
        content['text/json'] &&
        content['text/json'].schema
    ) || (
        content['text/plain'] &&
        content['text/plain'].schema
    ) || (
        content['multipart/mixed'] &&
        content['multipart/mixed'].schema
    ) || (
        content['multipart/related'] &&
        content['multipart/related'].schema
    ) || (
        content['multipart/batch'] &&
        content['multipart/batch'].schema
    ) || (
        content['multipart/form-data'] &&
        content['multipart/form-data'].schema
    ) || null;
}
