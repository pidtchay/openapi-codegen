import { OpenAPIV3 } from '../../interfaces/OpenApiTypes';

export interface ModelConfig {
    openApi: OpenAPIV3.Document;
    definition: OpenAPIV3.SchemaObject;
    isDefinition?: boolean;
    name?: string;
    path?: string;
    parentRef: string;
}
