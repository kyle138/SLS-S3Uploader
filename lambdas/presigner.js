'use strict';

const AWS = require('aws-sdk');
const createResponseObject = require('create-response-object');

// Instantialize S3
const S3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4'
});

// Is 'Instantialize' a real word?
// const partParams = {
//   Expires: 300
// };

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

  // Check if EXPUP has been set as an environment variable.
  const expup = process.env.hasOwnProperty('EXPUP') ? process.env.EXPUP : 7200;

  // Check for required fields in postObj
  return await Promise.all([
    validateProvided(postObj.uploadid),
    validateProvided(postObj.key),
    validateProvided(Number(postObj.numparts))
  ])  // posted values validated...
  .then(() => {
    let params = [];
    for(let i = 1; i <= postObj.numparts; i++) {
      params.push({
        "Bucket": process.env.S3BUCKET,
        "Key": postObj.key,
        "UploadId": postObj.uploadid,
        "PartNumber": i,
        "Expires": expup
      });
    } // End for
    return params;
  })  // partParams are set
  .then((params) => {
    return Promise.all(
      params.map( async (param) => {
        // let psu = await S3.getSignedUrlPromise(
        //   'uploadPart',
        //   param
        // );
        console.log("param:"+JSON.stringify(param,null,2)); // DEBUG:
        return {
          "partnumber": param.PartNumber,
          "psu": await S3.getSignedUrlPromise(
            'uploadPart',
            param
          )
        };  // End return
      })  // End map
    ); // End Promise.all
    // .then((psUs) => {
    //
    // })
  })
  .catch(async (err) => {
    console.error('Error caught: ',err);  // DEBUG:
    return await createResponseObject("400", err.toString());
  }); // <<Grinding Noises>>

};  // End exports.handler
