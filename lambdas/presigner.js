'use strict';

console.log('Loading function');

const AWS = require('aws-sdk');
const cuid = require('cuid');
const s3Filename = require('s3-filename');
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

// validateFile()
// Checks if file is a string of some length
// @param {string} file - The name of the file to upload
function validateFile(file) {
  return new Promise((resolve, reject) => {
    if(
      typeof file !== 'string' ||
      file.length < 1
    ) {
      console.error(`validateFile(): ${file}`); // DEBUG:
      return reject(new Error('File name invalid'));
    } else {
      return resolve();
    }
  }); // End Promise
} // End validateFile

// validateEmail()
// Checks if email contains an @ and at least one .
// @param {string} email - The email address of the uploader
function validateEmail(email) {
  return new Promise((resolve, reject) => {
    if(typeof email !== 'string' || email.length < 1) {
      console.error(`validateEmail: Email is a required field. ${email}`);  // DEBUG:
      return reject(new Error('Email is a required field.'));
    }
    if(!/^.+@.+\..+$/g.test(email)) {
      console.error(`validateEmail: Email must contain @ and . with some other stuff: ${email}`);  // DEBUG:
      return reject(new Error('Invalid email format.'));
    }
    return resolve();
  }); // End Promise
} // End validateEmail

// createKeyname
// Checks if filename includes any invalid characters for S3 object names and sanitize
// Prepend ul/email/timestamp- to filename to create key
// @param {string} file - The filename to be uploaded
// @param {string} email - The email address of the uploader
function createKeyname(file, email) {
  return new Promise((resolve, reject) => {
    console.log(`createKeyname() params:\n file: ${file}\n email:${email}`);  // DEBUG:
    if(!file.length || !email.length) {
      return reject(new Error('createKeyname(): missing parameters.'));
    } else {
      // Prepend ul/email/timestamp/, sanitize file name, trim all leading .s, and return full key
      return resolve(`ul/${email}/${Date.now()}-${s3Filename(file).replace(/^\.+/g,"")}`);
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
    console.log("process.env.S3BUCKET missing"); // DEBUG:
//    await handleError("if(process.env.S3BUCKET)", "Missing S3BUCKET", context);  // May implement handleError later
    return await createResponseObject("400","Missing process.env.S3BUCKET");
  }

  // Check for required fields in postObj
  return await Promise.all([
    validateEmail(postObj.email),
    validateFile(postObj.file)
  ])  // posted values validated...
  .then(async () => {
    putParams.Bucket = process.env.S3BUCKET;
    putParams.Key = await createKeyname( postObj.file, postObj.email );
    console.log("putParams:"+JSON.stringify(putParams,null,2)); // DEBUG:
  })  // putParams are set...
  .then(async () => {
    return await S3.getSignedUrlPromise(
      'putObject',
      putParams
    );
  })  // Signed URL returned...
  .catch(async (err) => {
    console.error('Error caught: ',err);  // DEBUG:
    return await createResponseObject("400", err.toString());
  }); // <<Grinding Noises>>

};  // End exports.handler
