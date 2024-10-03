export interface Endpoint {
    lambdaArn: string;
    methods: string[];
}

export type Endpoints = Map<string, Endpoint>;

/**
 * Function to define the endpoints dynamically using the Lambda ARN gathered from ESC.
 */
export function createEndpoints(lambdaArn: string): Endpoints {
    return new Map([
        ['/users', {
            lambdaArn,
            methods: ['GET']
        }],
        ['/cities', {
            lambdaArn,
            methods: ['GET']
        }],
        ['/jobs', {
            lambdaArn,
            methods: ['GET']
        }]
    ]);
}