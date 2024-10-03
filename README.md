# Pulumi AWS Lambda & API Gateway with ESC Integration

This project demonstrates how to deploy an AWS Lambda function integrated with API Gateway using Pulumi, and how to securely manage the Lambda ARN and other environment values using Pulumi's ESC (Environment and Secrets Configuration) SDK. It includes a dynamic approach to updating ESC with new Lambda ARNs while preserving existing environment values.

## Table of Contents

- [Pulumi AWS Lambda \& API Gateway with ESC Integration](#pulumi-aws-lambda--api-gateway-with-esc-integration)
  - [Table of Contents](#table-of-contents)
  - [Project Overview](#project-overview)
  - [Architecture](#architecture)
  - [Pre-requisites](#pre-requisites)
  - [Setup](#setup)
  - [Environment Configuration with ESC](#environment-configuration-with-esc)
  - [Deploying Lambda Function](#deploying-lambda-function)
    - [Lambda Function (function.js)](#lambda-function-functionjs)
    - [Lambda Deployment (index.ts)](#lambda-deployment-indexts)
    - [API Gateway Integration](#api-gateway-integration)
    - [Logging and Monitoring](#logging-and-monitoring)
  - [Running the Project](#running-the-project)
    - [1. Lambda Function](#1-lambda-function)
    - [2. API Gateway](#2-api-gateway)
  - [Testing the Project](#testing-the-project)

## Project Overview

This Pulumi project creates an AWS Lambda function, deploys it via an API Gateway, and updates the associated Lambda ARN in the ESC environment configuration. This ensures that the Lambda ARN can be referenced dynamically across the environment without overwriting other existing values.

## Architecture

1. **Lambda Function**:
   - Handles HTTP GET requests to various endpoints (`/users`, `/cities`, `/jobs`) and returns mock data.
   - Logs each event for visibility in AWS CloudWatch.

2. **API Gateway**:
   - Integrates with the Lambda function, enabling it to serve as a RESTful API with different HTTP methods (GET).
   - Deploys with Pulumi, and its endpoint URL is generated dynamically.

3. **ESC Integration**:
   - Environment values (like `lambdaArn`) are stored in ESC.
   - The Lambda ARN is read from ESC and updated when necessary without overwriting other values.

## Pre-requisites

Before getting started, ensure you have the following:

1. **Pulumi CLI**: Install from [Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. **AWS CLI**: Ensure your AWS credentials are configured.
3. **Node.js**: Install Node.js, along with npm or yarn.
4. **Pulumi ESC SDK**: For managing environment secrets and configurations.
5. **AWS IAM Roles**: Ensure you have permissions to create Lambda, IAM Roles, and API Gateway resources in AWS.

## Setup

1. **Install Dependencies**:

   Run the following command to install Pulumi and the necessary AWS and ESC SDK packages:

   ```bash
   npm install 
   ```

   _NOTE: Within `api_gateway` and `lambda_creation`_

2. **Configuration**:

    In your Pulumi stack configuration, ensure the following values are set:

    ```bash
    
    # For the lambda_creation, cd into folder and run
    cd lambda_creation
    pulumi config set environmentName <your-env-name>
    pulumi config set apiName <your-api-name>
    pulumi config set pulumi:accessToken <your-pulumi-access-token>

    # For the api_gateway, cd into folder and run
    cd api_gateway
    pulumi config set environmentName <your-env-name>
    ```

_NOTE: You may need to set the aws region if it is not there_

## Environment Configuration with ESC

This project uses ESC to manage environment values like lambdaArn securely:

 1. **Reading Environment Values:**
    When deploying, the project reads existing environment values (e.g., lambdaArn, my_secret) from ESC.

 2. **Updating Environment Values:**
    If the lambdaArn is missing or outdated, the new ARN is dynamically updated in ESC without overwriting other values.

 3. **Secrets Handling:**
    You can store and access secrets (e.g., my_secret) securely in the ESC environment.

## Deploying Lambda Function

The Lambda function is packaged as a ZIP file and deployed via Pulumi:

### Lambda Function (function.js)

```javascript
        exports.handler = async (event) => {
            console.log("Received event:", JSON.stringify(event, null, 2));

            if (event.httpMethod === 'GET' && event.path === '/users') {
                return { statusCode: 200, body: JSON.stringify([{ id: 1, name: 'User One' }, { id: 2, name: 'User Two' }]) };
            }
            // Add cases for `/cities` and `/jobs`
            return { statusCode: 404, body: JSON.stringify({ message: "Not Found" }) };
        };
```

### Lambda Deployment (index.ts)

The Lambda function is zipped and deployed via Pulumi, and the Lambda ARN is **stored** in **ESC**. The Lambda role includes CloudWatch logging permissions for monitoring.

### API Gateway Integration

The API Gateway is dynamically created to integrate with the deployed Lambda function. Each API endpoint corresponds to a path (e.g., /users, /cities, /jobs) that invokes the Lambda function.

### Logging and Monitoring

CloudWatch Logs are enabled for the Lambda function by attaching the `AWSLambdaBasicExecutionRole` policy, ensuring that logs are automatically sent to AWS CloudWatch for monitoring.

## Running the Project

### 1. Lambda Function

Run the Lambda Function first.

To deploy the project, follow these steps:

 1. Set configuration variables. See [Setup](#setup)
 2. `cd lambda_function`
 3. Run Pulumi `pulumi up`

This will:
 • Deploy the Lambda function and API Gateway.
 • Update the ESC environment with the Lambda ARN.

### 2. API Gateway

To deploy the project, follow these steps:

 1. Set configuration variables. See [Setup](#setup)
 2. `cd api_gateway`
 3. Run Pulumi `pulumi up`

This will:
 • Deploy the API Gateway using the Lambda ARN.

## Testing the Project

 1. Test API Gateway: `curl $(pulumi stack output endpoint)/users`

 2. Monitor Logs (if applicable)

    1. Navigate to CloudWatch > Logs.
    2. Find the log group for your Lambda function (should be prefixed with /aws/lambda/).
