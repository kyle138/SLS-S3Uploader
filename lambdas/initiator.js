'use strict';

const AWS = require('aws-sdk');
const s3Filename = require('s3-filename');
const legit = require('legit');
const createResponseObject = require('create-response-object');

// Instantialize S3
const S3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4'
});

// Is 'Instantialize' a real word?
const multiParams = {
  Bucket: "BUCKETHOLDER",
  Key: "KEYHOLDER",
  ContentType: 'application/pdf'
};

// validateFile()
// Checks if file is a string of some length
// @param {string} file - The name of the file to upload
function validateFile(file) {
  return new Promise((res, rej) => {
    if( typeof file !== 'string' || file.length < 1 ) {
      console.error(`validateFile(): ${file}`); // DEBUG:
      return rej(new Error('File name invalid'));
    } else {
      return res();
    }
  }); // End Promise
} // End validateFile

// validateEmail()
// Check if provided email address is valid
// @param {string} email - The email address of the uploader
function validateEmail(email) {
  return new Promise((res, rej) => {
    if(typeof email !== 'string' || email.length < 1) {
      console.error(`validateEmail: Email is a required field. ${email}`);  // DEBUG:
      return rej(new Error('Email is a required field.'));
    }
    // Checks if email contains an @ and some stuff followed by at least one . and some more stuff
    if(!/^.+@.+\..+$/g.test(email)) {
      console.error(`validateEmail: Email must contain @ and . with some other stuff: ${email}`);  // DEBUG:
      return rej(new Error('Invalid email format.'));
    }
    // Legit checks if the provided email address has valid MX records.
    legit(email)
    .then(result => {
      if(result.isValid) {
        return res();
      } else {
        return rej(new Error('Invalid email domain.'));
      }
    })
    .catch(err => {
      console.error(`validateEmail: Email is not legit. ${email}`+err); // DEBUG:
      return rej(new Error('Email domain validation error.'));
    });
  }); // End Promise
} // End validateEmail

// createKeyname
// Checks if filename includes any invalid characters for S3 object names and sanitize
// Prepend ul/email/timestamp- to filename to create key
// @param {string} file - The filename to be uploaded
// @param {string} email - The email address of the uploader
function createKeyname(file, email) {
  return new Promise((res, rej) => {
    console.log(`createKeyname() params:\n file: ${file}\n email:${email}`);  // DEBUG:
    if(!file.length || !email.length) {
      return rej(new Error('createKeyname(): missing parameters.'));
    } else {
      // Prepend ul/email/timestamp/, sanitize file name, trim all leading .s, and return full key
      return res(`ul/${email}/${Date.now()}-${s3Filename(file).replace(/^\.+/g,"")}`);
    }
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
    console.error("process.env.S3BUCKET missing"); // DEBUG:
//    await handleError("if(process.env.S3BUCKET)", "Missing S3BUCKET", context);  // May implement handleError later
    return await createResponseObject("400","Internal error. Please contact admin.");
  }

  // Check for required fields in postObj
  return await Promise.all([
    validateEmail(postObj.email),
    validateFile(postObj.file)
  ])  // posted values validated...
  .then(async () => { // set multiParams
    multiParams.Bucket = process.env.S3BUCKET;
    multiParams.Key = await createKeyname( postObj.file, postObj.email );
    console.log("multiParams:"+JSON.stringify(multiParams,null,2)); // DEBUG:
  })  // multiParams are set...
  .then(async () => { // create Multipart upload
    const multiResp = await S3.createMultipartUpload(multiParams).promise();
    console.log('createMultipartUpload response:'+JSON.stringify(multiResp,null,2));  // DEBUG:
    return {
      Key: multiResp.Key,
      UploadId: multiResp.UploadId
    };
  })  // multiResp created
  .then(async(res) => { // return multiResp to client
    console.log('response returned:'+JSON.stringify(res,null,2)); // DEBUG:
//    return await createResponseObject("200", res);
    return res;
  })
  .catch(async (err) => {
    console.error('Error caught: ',err);  // DEBUG:
    return await createResponseObject("400", err.toString());
  }); // <<Grinding Noises>>

};  // End exports.handler
