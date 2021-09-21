'use strict';

console.log('Loading function');

const AWS = require('aws-sdk');
const cuid = require('cuid');
const createResponseObject = require('create-response-object');

// Instantialize S3
const S3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
  sessionToken: `session-${cuid()}`
});

// Is 'Instantialize' a real word?
const putParams = {
  Bucket: "BUCKETHOLDER",
  Key: "KEYHOLDER",
  ContentType: 'application/json',
  Expires: 3600
};

// validateEmail()
// checks if email contains an @ and at least 1 .
function validateEmail(email) {
  return new Promise((resolve, reject) => {
    if(typeof email !== 'string' || email.length < 1) {
      console.log(`validateEmail: Email is a required field. ${email}`);  // DEBUG:
      return reject(new Error('Email is a required field.'));
    }
    if(!/^.+@.+\..+$/g.test(email)) {
      console.log(`validateEmail: Email must contain @ and . ${email}`);  // DEBUG:
      return reject(new Error('Invalid email format.'));
    }
  }); // End Promise
} // End validateEmail

// validateKeyname
// checks if filename includes any invalid characters for S3 object names, returns sanitized key
function validateKeyname(file) {
  return new Promise((resolve, reject) = {
    // This would be a good place for s3-filename     ***************************
  }); // End Promise
} // End validateKeyname

// HANDLER
module.exports.handler = async (event, context) => {
  console.log("Received event: " + JSON.stringify(event, null, 2)); // DEBUG:

  // The request is contained in event.body as a stringified JSON, so parse it.
  const postObj = JSON.parse(event.body);
  console.log("request: ", JSON.stringify(postObj, null, 2)); // DEBUG: Yeah I just stringified something I just parsed

  // Check if S3BUCKET has been set as an environment variable. (REQUIRED)
  if (!process.env.S3BUCKET) {
    console.log("process.env.S3BUCKET missing"); // DEBUG:
//    await handleError("if(process.env.S3BUCKET)", "Missing S3BUCKET", context);  // May implement handleError later
    return await createResponseObject("400","Missing process.env.S3BUCKET");
  }

  // Check for required fields in postObj
  if(
    typeof postObj.email !== 'string' | // **** Need to validate emails
    typeof postObj.file !== 'string'
  ) {
    console.log("One of the postObj is missing: "+JSON.stringify(postObj,null,2));  // DEBUG:
    return await createResponseObject("400","Missing required field");
  } // End if postObj

  // Now that the validation checks are out of the way...
  putParams.Bucket = process.env.S3BUCKET;
  putParams.Key = `ul/${postObj.email}/${postObj.file}`;  // **** Need to sanitize email (hash?)

  console.log("putParams:"+JSON.stringify(putParams,null,2)); // DEBUG:

  try {
    const signedUrl = await S3.getSignedUrlPromise(
      'getObject',
      putParams
    );

    console.log(`signedUrl: ${signedUrl}`); // DEBUG:
    return signedUrl;
  } catch (err) {
    console.log("Error creating presigned URL", err); // DEBUG:
    return await createResponseObject("400","Error creating presigned URL.");
  } // End try..catch

};  // End exports.handler
