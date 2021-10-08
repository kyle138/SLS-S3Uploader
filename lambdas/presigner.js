'use strict';

const AWS = require('aws-sdk');
const createResponseObject = require('create-response-object');

// Instantialize S3
const S3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4'
});

// Is 'Instantialize' a real word?
const partParams = {
  Expires: 3600
};

// validateProvided()
// Checks if provided data is a string or number of some length or value 
// @param data - The data posted in the request
function validateProvided(data) {
  return new Promise((res, rej) => {
    switch (typeof data) {
      case 'string':
        if(data.length < 1) {
          console.error(`validateProvided():string ${data}`); // DEBUG:
          return rej(new Error('Key or UploadId invalid'));
        } else {
          return res();
        }
        break;
      case 'number':
        if(data < 1 || !Number.isInteger(data)) {
          console.error(`validateProvided():number ${data}`); // DEBUG:
          return rej(new Error('PartNumber must be an integer greater than 0'));
        } else {
          return res();
        }
        break;
      default:
        console.error(`validateProvided():default ${data}`); // DEBUG:
        return rej(new Error('Invalid Parameters'));
    } // End switch
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

  // Check for required fields in postObj
  return await Promise.all([
    validateProvided(postObj.uploadid),
    validateProvided(postObj.key),
    validateProvided(Number(postObj.partnumber))
  ])  // posted values validated...
  .then(async () => {
    partParams.Bucket = process.env.S3BUCKET;
    partParams.Key = postObj.key;
    partParams.UploadId = postObj.uploadid;
    partParams.PartNumber = postObj.partnumber;
    console.log("partParams:"+JSON.stringify(partParams,null,2)); // DEBUG:
  })  // putParams are set...
  .then(async () => {
    return await S3.getSignedUrlPromise(
      'uploadPart',
      partParams
    );
  })  // Signed URL returned...
  .catch(async (err) => {
    console.error('Error caught: ',err);  // DEBUG:
    return await createResponseObject("400", err.toString());
  }); // <<Grinding Noises>>

};  // End exports.handler
