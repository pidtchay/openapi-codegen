import type { Dictionary } from '../../../utils/types';
import { OpenAPIV3 } from '../../interfaces/OpenApiTypes';

export function getMediaType(content: Dictionary<OpenAPIV3.MediaTypeObject>): string | null {
    return (
        Object.keys(content).find(key =>
            ['application/json-patch+json', 'application/json', 'text/json', 'text/plain', 'multipart/mixed', 'multipart/related', 'multipart/batch', 'multipart/form-data'].includes(key)
        ) || null
    );
}
