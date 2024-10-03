import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { Endpoint, Endpoints } from './endpointMapper';

// Function to create the AWS Provider using the region
function createAwsProvider(awsRegion: pulumi.Input<aws.Region>) {
    return new aws.Provider('aws-provider', { region: awsRegion });
}

// Function to create the API Gateway
const createApi = (name: string, apiName: string, provider: aws.Provider) => {
    return new aws.apigateway.RestApi(name, {
        name: apiName,
        endpointConfiguration: {
            types: 'REGIONAL',
        },
    }, { provider });
};

// Function to create a resource
const createResource = (name: string, api: aws.apigateway.RestApi, pathPart: string, provider: aws.Provider, parentId: pulumi.Output<string>) => {
    return new aws.apigateway.Resource(name, {
        restApi: api.id,
        parentId: api.rootResourceId,
        pathPart,
    }, { provider });
};

// Function to create a method
const createMethod = (name: string, api: aws.apigateway.RestApi, resource: aws.apigateway.Resource, method: string, provider: aws.Provider): aws.apigateway.Method => {
    return new aws.apigateway.Method(name, {
        restApi: api.id,
        resourceId: resource.id,
        httpMethod: method.toUpperCase(),
        authorization: 'NONE',
    }, { provider });
};

// Function to create a Lambda permission for API Gateway
const createPermission = (
    name: string, 
    api: aws.apigateway.RestApi, 
    endpoint: Endpoint, 
    provider: aws.Provider
) => {
    return new aws.lambda.Permission(name, {
        action: 'lambda:InvokeFunction',
        function: endpoint.lambdaArn,
        principal: 'apigateway.amazonaws.com',
        sourceArn: api.executionArn.apply(arn => `${arn}/*/*/*`),
    }, { provider });
};

// Function to create an integration between API Gateway and Lambda
const createIntegration = (
    name: string, 
    api: aws.apigateway.RestApi, 
    resource: aws.apigateway.Resource, 
    method: aws.apigateway.Method, 
    lambdaArn: string, 
    provider: aws.Provider
): aws.apigateway.Integration => {
    return new aws.apigateway.Integration(name, {
        restApi: api.id,
        resourceId: resource.id,
        httpMethod: method.httpMethod,
        integrationHttpMethod: 'POST',
        type: 'AWS_PROXY',
        uri: pulumi.interpolate`arn:aws:apigateway:${provider.region}:lambda:path/2015-03-31/functions/${lambdaArn}/invocations`,
    }, { provider });
};

// Main function to create the API Gateway
export async function createApiGateway(
    name: string, 
    apiName: string, 
    endpoints: Endpoints, 
    awsRegion: pulumi.Input<aws.Region>
) {
    console.log('Creating API Gateway');

    const awsProvider = createAwsProvider(awsRegion);
    const api = createApi(`${apiName}-api`, apiName, awsProvider);

    let dependencies: pulumi.Resource[] = [];
    const resourceMap: Map<string, aws.apigateway.Resource> = new Map();
    const permissionMap: Map<string, aws.lambda.Permission> = new Map();

    endpoints.forEach((endpoint, path) => {
        const segments = path.split('/').filter(Boolean);
        const finalPathSegment = segments.pop();
        if (!finalPathSegment) {
            throw new Error(`Invalid path segment for path: ${path}`);
        }
        const parentPath = segments.join('/');

        // Determine the parent ID for nested resources, or use the API root
        const parentId = resourceMap.get(parentPath)?.id || api.rootResourceId;

        // Create resource
        const formattedPathSegment = path.replace(/^\//, '').replace(/\//g, '-');
        const resource = createResource(`${apiName}-${formattedPathSegment}-resource`, api, finalPathSegment, awsProvider, parentId);
        resourceMap.set(path, resource);
        dependencies.push(resource);

        if (endpoint) {
            endpoint.methods.forEach(method => {
                // Create method
                const apiMethod = createMethod(`${apiName}-${formattedPathSegment}-${method}-method`, api, resource, method, awsProvider);
                dependencies.push(apiMethod);

                // Create integration using the Lambda ARN
                const integration = createIntegration(`${apiName}-${formattedPathSegment}-${method}-integration`, api, resource, apiMethod, endpoint.lambdaArn, awsProvider);
                dependencies.push(integration);

                // Create permission for API Gateway to invoke Lambda function
                if (!permissionMap.get(endpoint.lambdaArn)) {
                    const permission = createPermission(`${apiName}-${formattedPathSegment}-permission`, api, endpoint, awsProvider);
                    dependencies.push(permission);
                    permissionMap.set(endpoint.lambdaArn, permission);
                }
            });
        }
    });

    // Create the API Gateway deployment and stage
    const deployment = new aws.apigateway.Deployment(`${apiName}-deployment`, {
        restApi: api.id,
        triggers: {
            redeployment: Date.now().toString(), // Use a timestamp as a trigger to force redeployment
        },
    }, { dependsOn: dependencies });

    const stage = new aws.apigateway.Stage(`${apiName}-stage`, {
        restApi: api.id,
        deployment: deployment.id,
        stageName: name,
    }, { provider: awsProvider });

    return pulumi.interpolate`https://${api.id}.execute-api.${awsRegion}.amazonaws.com/prod`;
}