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

module.exports.hello = async (event) => {
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

