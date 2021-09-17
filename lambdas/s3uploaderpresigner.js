'use strict';

console.log('Loading function');

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = new S3Client({ region: "us-east-1" });
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const putParams = {
  Bucket: "BUCKETHOLDER",
  Key: "KEYHOLDER",
  Body: "BODYHOLDER"
};

module.exports.handler = async (event) => {
  console.log("Received event: " + JSON.stringify(event, null, 2)); // DEBUG:

  // The request is contained in event.body as a stringified JSON, so parse it.
  const request = JSON.parse(event.body);
  console.log("request: ", JSON.stringify(subObj, null, 2)); // DEBUG: Yeah I just stringified something I just parsed

  // Check if STAGE has been set as an environment variable. (REQUIRED)
  if (!process.env.S3BUCKET) {
    console.log("process.env.S3BUCKET missing"); // DEBUG:
    await handleError("if(process.env.S3BUCKET)", "Missing STAGE", context);
    return callback(null, await genResObj400("Missing process.env.S3BUCKET"));
  }

  return {
    statusCode: 200,
    body: JSON.stringify(
      {
        message: 'Go Serverless v1.0! Your function executed successfully!',
        input: event,
      },
      null,
      2
    ),
  };

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };
};
