'use strict';

const AWS = require('aws-sdk');
const createResponseObject = require('create-response-object');

// Instantialize S3
const S3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4'
});

// Is 'Instantialize' a real word?

// validateProvided()
// Checks if provided data is a string of some length
function validateProvided(data) {
  return new Promise((res, rej) => {
    if( typeof data !== 'string' || data.length < 1) {
      console.error(`validateProvided:error ${data}`); // DEBUG:
      return rej(new Error('Key and UploadId are required parameters.'));
    } else {
      return res();
    }
  }); // End Promise
} // End validateProvided

// HANDLER
module.exports.handler = async (event, context) => {
  console.log("Received event: " + JSON.stringify(event, null, 2)); // DEBUG:

  // The request is contained in event.body as a stringified JSON, so parse it.
  const postObj = JSON.parse(event.body);
  console.log("request: ", JSON.stringify(postObj, null, 2)); // DEBUG: Yeah I just stringified something I just parsed

  // Check if S3BUCKET has been set as an environment variable. (REQUIRED)
  if (!process.env.S3BUCKET) {
    console.error("process.env.S3BUCKET missing"); // DEBUG:
//    await handleError("if(process.env.S3BUCKET)", "Missing S3BUCKET", context);  // May implement handleError later
    return await createResponseObject("400","Internal error. Please contact admin.");
  }

  let params = {
    Bucket: process.env.S3BUCKET
  };

  // Check for required fields in postObj
  return await Promise.all([
    validateProvided(postObj.uploadid),
    validateProvided(postObj.key)
  ])  // posted values validated...
  .then(() => {
    params.Key = postObj.key;
    params.UploadId = postObj.uploadid;
    console.log('params:',JSON.stringify(params,null,2));  // DEBUG:
    S3.abortMultipartUpload(params).promise();
  })  // partParams are set
  .then(async () => {
    // Any parts that were being uploaded as Abort was called may still exist.
    var crumbs = await S3.listParts(params).promise();
    console.log('crumbs:',JSON.stringify(crumbs,null,2));  // DEBUG:
    // ******* then call abort again...***************
  })
  .catch(async (err) => {
    console.error('Error caught: ',err);  // DEBUG:
    return await createResponseObject("400", err.toString());
  }); // <<Grinding Noises>>

};  // End exports.handler
