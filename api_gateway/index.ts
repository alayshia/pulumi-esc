import { createApiGateway } from './apiGateway';  
import { createEndpoints } from './endpointMapper'; 
import * as pulumi from "@pulumi/pulumi";
import * as esc from "@pulumi/esc-sdk";

async function main() {
    try {
        // Initialize ESC client with Pulumi Access Token
        const PULUMI_ACCESS_TOKEN = process.env.PULUMI_ACCESS_TOKEN!;
        const escConfig = new esc.Configuration({ accessToken: PULUMI_ACCESS_TOKEN });
        const client = new esc.EscApi(escConfig);
        const ORG_NAME = pulumi.getOrganization();
        
        const config = new pulumi.Config();
        const apiName = config.require("apiName");
        const stageName = config.require("stagingName");
        const ENV_NAME = config.require("environmentName");

        // Fetch the Lambda ARN and AWS Region from ESC
        console.log(`Fetching Lambda ARN and AWS Region from ESC for environment: ${ENV_NAME}`);
        const openEnv = await client.openAndReadEnvironment(ORG_NAME, ENV_NAME);

        if (!openEnv || !openEnv.values?.lambdaArn || !openEnv.values?.pulumiConfig || !openEnv.values.pulumiConfig["aws:region"]) {
            throw new Error("Failed to retrieve Lambda ARN or AWS Region from ESC.");
        }

        const lambdaArn = openEnv.values.lambdaArn;
        const awsRegion = openEnv.values.pulumiConfig["aws:region"];
        console.log(`Lambda ARN: ${lambdaArn}`);
        console.log(`AWS Region: ${awsRegion}`);

        // Create the API Gateway endpoints dynamically using the Lambda ARN
        const endpoints = createEndpoints(lambdaArn);

        // Create the API Gateway using the fetched Lambda ARN, AWS region, and dynamic endpoints
        const endpointUrl = await createApiGateway(stageName, apiName, endpoints, awsRegion);

        // Use `apply` to log the API Gateway URL (since it's an Output)
        endpointUrl.apply(url => {
            console.log(`API Gateway created at: ${url}`);
        });

        // Return the endpoint URL
        return { endpointUrl };

    } catch (error) {
        console.error("Failed to create API Gateway:", error);
        throw error;
    }
}

// Export the endpoint URL
export const endpoint = main()
    .then(result => result.endpointUrl)
    .catch(error => console.error("Error during API Gateway setup:", error));