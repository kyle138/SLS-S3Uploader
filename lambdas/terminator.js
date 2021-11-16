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
// or an object (array) with valid items
// @param data - The data posted in the request
function validateProvided(data) {
  return new Promise(async (res, rej) => {
    switch (typeof data) {
      case 'string':
        if(data.length < 1) {
          console.error(`validateProvided():string ${data}`); // DEBUG:
          return rej(new Error('Key or UploadId invalid'));
        } else {
          return res();
        }
        break;
      case 'object':
        if(data.length < 1) {
          console.error(`validateProvided():object ${data}`); // DEBUG:
          return rej(new Error('Parts must be an array of some length.'));
        } else {
          await Promise.all(data.map(async (part) => await validatePart(part)))
          .then(() => {
            console.log('validateProvided: All parts valid'); // DEBUG:
            return res();
          })
          .catch((err) => {
            console.error(err);
            return rej(new Error('Unable to validate Parts[]'));
          }); // End Promise.all
        }
        break;
      default:
        console.error(`validateProvided():default ${data}`); // DEBUG:
        return rej(new Error('Invalid Parameters'));
    } // End switch
  }); // End Promise
} // End validateProvided

// validatePart()
// Checks if MultipartUpload part contains ETag and PartNumber values
// @param part {object} - The part object in the MultipartUpload
function validatePart(part) {
  return new Promise((res, rej) => {
    if(
      part.hasOwnProperty('ETag')
      && typeof part.ETag === 'string'
      && part.ETag.length > 0
      && part.hasOwnProperty('PartNumber')
      && typeof part.PartNumber === 'number'
      && part.PartNumber > 0
      && Number.isInteger(part.PartNumber)
    ) {
      return res();
    } else {
      console.error('validatePart(): Part: '+JSON.stringify(part,null,2));  // DEBUG:
      return rej(new Error('Parts must contain ETag and PartNumber values'));
    }
  });  // End Promise
} // End validatePart

// sendNotification
// Checks if SNS topic is set as environment variable.
// If so, send notification regarding the upload.
// @params Object
// params.key - Key of the S3 object recently uploaded.
// params.QSA - QSA string file can be downloaded from.
function sendNotification(params) {
  return new Promise(async (res) => {
    // Check if SNS topic is set, if not nothing to notifiy.
    if(!process.env.hasOwnProperty('NOTIFICATIONS_SNS_TOPIC') ||
        process.env.NOTIFICATIONS_SNS_TOPIC.length == 0) {
      console.log('sendNotification:No SNS set.');
      return res();
    }
    // Check required params
    if(!params.hasOwnProperty('QSA') ||
       !params.hasOwnProperty('key')) {
         console.log('sendNotification: Parameters missing.',JSON.stringify(params,null,2));  // DEBUG:
         return res();
    }
    // Instantialize SNS
    const SNS = new AWS.SNS();
    // Split the key on '/'. [1] is email and [2] is filename.
    params.key = params.key.split('/');
    // Build the message.
    let msg = `
      Uploader: ${params.key[1]}
      File Name: ${params.key[2]}
      Download Link: ${params.QSA}
    `;
    return SNS.publish({
      Message: msg,
      Subject: 'Uploads Notification',
      TopicArn: process.env.NOTIFICATIONS_SNS_TOPIC
    }).promise()
    .then((resp) => {
      console.log(`sendNotification:resp:`,JSON.stringify(resp,null,2));  // DEBUG:
      return res();
    })  // End SNS.publish.then
    .catch((err) => {
      console.log(`sendNotification:err:`,JSON.stringify(err,null,2));  // DEBUG:
      return res();
    }); // End SNS.publish.catch
  }); // End Promise
} // End sendNotification

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

  // Check if EXPDN has been set as an environment variable.
  const expdn = process.env.hasOwnProperty('EXPDN') ? Number(process.env.EXPDN) : 7200;

  // Check for required fields in postObj
  return await Promise.all([
    validateProvided(postObj.key),
    validateProvided(postObj.uploadid),
    validateProvided(postObj.parts)
  ])  // posted values validated...
  .then(async () => { // set termParams
    let termParams = {
      "Bucket": process.env.S3BUCKET,
      "Key": postObj.key,
      "UploadId": postObj.uploadid,
      "MultipartUpload": {
        "Parts": postObj.parts
      }
    };
    console.log("termParams:"+JSON.stringify(termParams,null,2)); // DEBUG:
    return await S3.completeMultipartUpload(termParams).promise();
  })  // Multipart Upload completed
  .then(async (termResp) => {
    console.log('completeMultipartUpload response:'+JSON.stringify(termResp,null,2));  // DEBUG:
    let qsa = await S3.getSignedUrlPromise(
      'getObject',
      {
        "Bucket": process.env.S3BUCKET,
        "Key": postObj.key,
        "Expires": expdn
      }
    );
    await sendNotification({
      'key': postObj.key,
      'QSA': qsa
    });
    return await createResponseObject("200",qsa);
  })  // End Promise.all.then.then
  .catch(async (err) => {
    console.error('Error caught: ',err);  // DEBUG:
    // return await createResponseObject("400", err.toString());
    return await createResponseObject("200", "Upload failed.");
  }); // <<Grinding Noises>>

};  // End exports.handler
