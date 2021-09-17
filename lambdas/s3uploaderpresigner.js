'use strict';

console.log('Loading function');

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = new S3Client({ region: "us-east-1" });
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const createResponseObject = require('create-response-object');

const putParams = {
  Bucket: "BUCKETHOLDER",
  Key: "KEYHOLDER",
  Body: "BODYHOLDER"
};

module.exports.handler = async (event, context, callback) => {
  console.log("Received event: " + JSON.stringify(event, null, 2)); // DEBUG:

  // The request is contained in event.body as a stringified JSON, so parse it.
  const postObj = JSON.parse(event.body);
  console.log("request: ", JSON.stringify(postObj, null, 2)); // DEBUG: Yeah I just stringified something I just parsed

  // Check if STAGE has been set as an environment variable. (REQUIRED)
  if (!process.env.S3BUCKET) {
    console.log("process.env.S3BUCKET missing"); // DEBUG:
//    await handleError("if(process.env.S3BUCKET)", "Missing STAGE", context);  // May implement handleError later
    return callback(null, await createResponseObject("400","Missing process.env.S3BUCKET"));
  }

  // Check for required fields in postObj
  if(
    typeof postObj.email !== 'string' |
    typeof postObj.file !== 'string'
  ) {
    console.log("One of the postObj is missing: "+JSON.stringify(postObj,null,2));  // DEBUG:
    return await createResponseObject("400","Missing required field");
  } // End if postObj

  // Now that the validation checks are out of the way...
  putParams.Bucket = process.env.S3BUCKET;
  putParams.Key = `ul/${postObj.email}/${postObj.file}`;

  console.log("putParams:"+JSON.stringify(putParams,null,2)); // DEBUG:

  try {
    const command = new PutObjectCommand(putParams);
    const signedUrl = await getSignedUrl(
      s3Client,
      new PutObjectCommand(putParams),
      { expiresIn: 3600,}
    );
    console.log(`signedUrl: ${signedUrl}`); // DEBUG:
    return signedUrl;
  } catch (err) {
    console.log("Error creating presigned URL", err); // DEBUG:
    return await createResponseObject("400","Error creating presigned URL.");
  } // End try..catch

};  // End exports.handler
