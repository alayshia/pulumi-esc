import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as esc from "@pulumi/esc-sdk";

const config = new pulumi.Config();

// For ESC
const PULUMI_ACCESS_TOKEN = process.env.PULUMI_ACCESS_TOKEN!;
const ORG_NAME = pulumi.getOrganization();
const ENV_NAME = config.require("environmentName");

// Initialize ESC client with Pulumi Access Token
const escConfig = new esc.Configuration({ accessToken: PULUMI_ACCESS_TOKEN });
const client = new esc.EscApi(escConfig);

// IAM role for Lambda function
const lambdaRole = new aws.iam.Role("townLambdaRole", {
    assumeRolePolicy: {
        Version: "2012-10-17",
        Statement: [
            {
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: {
                    Service: "lambda.amazonaws.com",
                },
            },
        ],
    },
});

// Attach policies to the Lambda role for CloudWatch logging
new aws.iam.RolePolicyAttachment("lambdaLoggingPolicy", {
    role: lambdaRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole", 
});

// Lambda Function Creation
const lambdaFunction = new aws.lambda.Function("townLambda", {
    role: lambdaRole.arn,
    handler: "lambda_function.handler",
    runtime: aws.lambda.Runtime.NodeJS18dX,
    code: new pulumi.asset.FileArchive("./lambdaFunction.zip"),
});

// Function to check if the environment needs to be updated, otherwise update it
const updateESCEnvironment = async (arn: string) => {
    try {
        console.log(`Fetching current environment values from ESC for ${ENV_NAME}`);

        // Fetch the existing environment from ESC
        const currentEnv = await client.openAndReadEnvironment(ORG_NAME, ENV_NAME);

        if (!currentEnv?.values || currentEnv.values.lambdaArn !== arn) {
            console.log("Lambda ARN is either missing or incorrect. Proceeding with update.");

            // Create the new environment definition
            const environmentDefinition: esc.EnvironmentDefinition = {
                values: {
                    lambdaArn: arn,  
                },
            };

            console.log(`Updating ESC environment for ${ENV_NAME} with Lambda ARN`);

            // Update the environment definition in ESC (this will overwrite the values)
            await client.updateEnvironment(ORG_NAME, ENV_NAME, environmentDefinition);

            console.log(`Lambda ARN (${arn}) stored in ESC environment: ${ENV_NAME}`);
        } else {
            console.log("Lambda ARN is up to date, no update required.");
        }
    } catch (error) {
        console.error("Failed to update ESC environment:", error);
    }
};

// Apply the update ESC Function
lambdaFunction.arn.apply(updateESCEnvironment);

export const lambdaFunctionArn = lambdaFunction.arn;
