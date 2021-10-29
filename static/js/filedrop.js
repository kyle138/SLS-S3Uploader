'use strict';

const APIG="https://ile7rs5fbl.execute-api.us-east-1.amazonaws.com/post",
      minPartSize = 5 * 1024 * 1024, // 5MB
      maxPartSize = 5 * 1024 * 1024 * 1024, // 5GB
      maxParts = 10000; // AWS doesn't allow more than 10,000 parts
var files=[],
    // multis=[],
    filereaders=[],
    eml = {"valid": false};

// Process values in email field
$("#email").change(() => {
  validateEml();
}); // End email validator

// Intercept enter key in the email field
$("#email").keypress((e) => {
  if(e.which == 13) {
    console.log("enter");
    e.preventDefault();
    if(checkStatus()) initiator();
    else validateEml();
  }
}); // End email field interceptor

// Process files selected in the [Select some files] button
$("#fileElem").change((e) => {
  handleFiles(e.originalEvent.target.files);
}); // End process files

// submit button
// Intercept submit button clicks
// Disable [Submit] button
// fadeOut droparea to prevent further files being added
// and initiate initiator()
$("#submitbtn").click(() => {
  if( checkStatus() ) {
    // Disable the [Submit] button
    $("#submitbtn").attr('style', 'pointer-events: none').addClass('disabled');
    // Hide the droparea and change the label text.
    let s = (files.length > 1) ? 's are': ' is';
    $("#droparea").fadeOut();
    $(".s3u-remove").fadeOut('fast');
    $("#filesLbl").html(`The file${s} now uploading...`)
    initiator();
  }
}); // End submit button

// validateEml
// Very basic regex of email provided.
// Must contain a @ and . with some other chars.
// Email will be further validated by Initiator lambda.
function validateEml(mxpass=true) {
  console.log(`mxpass: ${mxpass}`); // DEBUG:
  eml.email = $("#email").val();
  if((eml.email.length > 0 && !/^.+@.+\..+$/g.test(eml.email)) || !mxpass) {
    eml.valid = false;
    let emailMsg = mxpass ? "You must enter a valid email address." : "Try a different email address. The one you entered cannot be verified.";
    console.log(`Invalid email: `+JSON.stringify(eml,null,2)); // DEBUG:
    checkStatus();
    $("#row-files").fadeOut();
    $("#alertMsg").addClass("alert alert-danger").html( emailMsg ).fadeIn('fast');
    $("#email").tooltip({
      "container": "body",
      "html": true,
      "placement": "top",
      "title": "Please enter a valid email address."
    });
  } else {
    eml.valid = true;
    console.log("email valid:"+JSON.stringify(eml,null,2)); // DEBUG:
    checkStatus();
    $("#alertMsg").html("");
    $("#alertMsg").removeClass("alert alert-danger");
    $("#row-files").fadeIn();
  }
} // End validateEml

// reckonParts
// Returns the number and size of parts needed for multipart upload
function reckonParts(filesize) {
  let parts = {};
  parts.size = (filesize / maxParts) < minPartSize
             ? minPartSize
             : Math.ceil(filesize / maxParts);
  parts.num = Math.ceil(filesize / parts.size);
  return parts;
}

// dropArea
// defines area for drag and drop file uploads
let dropArea = document.getElementById('droparea');
dropArea.addEventListener('drop', handleDrop, false);
// Override defaults for droparea
['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
  dropArea.addEventListener(eventName, preventDefaults, false)
});
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}
// Add/remove highlight on mouse in / mouse out
['dragenter', 'dragover'].forEach((eventName) => {
  dropArea.addEventListener(eventName, highlight, false)
});
['dragleave', 'drop'].forEach((eventName) => {
  dropArea.addEventListener(eventName, unhighlight, false)
});
function highlight(e) {
  dropArea.classList.add('highlight');
}
function unhighlight(e) {
  dropArea.classList.remove('highlight');
}

// handleDrop
// Catch files dropped in the droparea, filter out folders, and send to handleFiles()
async function handleDrop(e) {
  console.log('handleDrop:'); // DEBUG:
  console.log(e);           // DEBUG:
  console.log(e.dataTransfer.files);  // DEBUG:
  console.log(e.dataTransfer.types); // DEBUG:
  let noFolders = Array.from(e.dataTransfer.files).reduce( (res,file) => {
    if (file.type && file.size%4096 != 0) {
      console.log(`File added: ${file.name}`); // DEBUG:
      res.push(file);
    }
    return res;
  },[]); // End reduce
  console.log('noFolders[]',noFolders); // DEBUG:
  // handle the list of files from the event.
  handleFiles(noFolders);
} // end handleDrop

// handleFiles
// For all files being selected via input button or droparea, send to handleFile() for processing
// Then call checkStatus() to check if ok to submit
function handleFiles(fls) {
  console.log("handleFiles"); // DEBUG:
  Promise.all(
    Array.from(fls).map( async (file) => {
      if(file) {
        return await handleFile(file);
      } else {
        return null;
      }
    })  // End map
  ) // End Promise.All
  .then(async () => {
    console.log("Promise.all.then");  // DEBUG:
    checkStatus();
  })  // End promise.all.then
  .catch((err) => {
    console.log('handleFiles:catch',err);
  }); // End Promise.all.catch
} // End handleFiles

// handleFile()
// Add file progress row to filesMsg div
// @params {file} file - The file selected for upload
function handleFile(file) {
  console.log("handleFile");  // DEBUG:
  console.log(file);  // DEBUG:

  if (mimetypes.indexOf(file.type) == -1) {
    $("#alertMsg").addClass("alert alert-warning").append(
      `<div class='row'>Files of type '${file.type}' are not accepted.</div>`
    ).fadeIn('fast');
  } else {
    // Get number of parts for multipart upload
    let parts = reckonParts(file.size);
    // Get next Array index
    let fidx = files.length;
    files.push({
      "fidx": fidx,
      "multiObj": { "parts": parts },
      "fileObj": file
    });
    let fileprog = $(`
      <div class="container-fluid" id="fidx${fidx}">
        <div class="col-sm-4">
          <span class="glyphicon glyphicon-remove s3u-remove"></span>&nbsp;
          <span class="glyphicon glyphicon-file" id="${file.name}"></span>&nbsp; ${file.name}
        </div>
        <div class="col-sm-8 s3u-progress">
          <div class="progress">
            <div class="progress-bar progress-bar-striped active" role="progressbar" aria-valuenow='0' aria-valuemin='0' aria-valuemax='${file.size}'>
              <span class="sr-only">0%</span>
            </div>
          </div>
        </div>
      </div>
    `);

    $(".s3u-remove",fileprog).on("click", () => {
      console.log(`removeFile: ${fidx}`);  // DEBUG:
      files[fidx] = null;
      $(`#fidx${fidx}`).fadeOut("slow", () => $(`#fidx${fidx}`).remove());
      checkStatus();
    });

    $("#filesMsg").append(fileprog);
  }
} // End handleFile

// checkStatus
// Enables or disables the [Submit] button as the email and file fields are filled out
function checkStatus() {
  console.log("checkStatus"); // DEBUG:
  if (eml.valid && Object.keys(files).length > 0) {
    console.log("enable");  // DEBUG:
    $("#submitbtn").removeAttr('style').removeClass('disabled');
    return true;
  } else {
    console.log("disable"); // DEBUG:
    console.log(`files.length ${Object.keys(files).length}`); // DEBUG:
    $("#submitbtn").attr('style', 'pointer-events: none').addClass('disabled');
    return false;
  }
} // End checkStatus

// initiator
// Initiate the upload process for each file in files[];
function initiator() {
  console.log("Initiator");

  // reset any existing alerts.
  $("#alertMsg").hide().html("");

  let url = APIG+'/initiate';
  let initData = {
    "email": eml.email
  };
  console.log(`initData: `+JSON.stringify(initData,null,2));  // DEBUG:
  console.log(files); // DEBUG:

  // Files removed from the upload list leave nulls in the files[] array,
  // Remove any nulls before Initiating multipart uploads.
  let noNulls = files.reduce( (res,file) => {
    console.log(file);  // DEBUG:
    if (file != null) {
      console.log(`File added: ${file}`); //// DEBUG:
      res.push(file);
    }
    return res;
  },[]);

  files = noNulls;
  console.log(files); // DEBUG:

  Promise.all(
    files.map( async (file) => {
      initData.filename = file.fileObj.name;
      initData.filetype = file.fileObj.type;
      return await fetch(url, {
        method: 'POST',
        body: JSON.stringify(initData)
      })
      .then(async (res) => {
        console.log(res); // DEBUG:
        if(res.ok) {
          return  await res.json();
        } else {
          // If the APIG response isn't 200, parse the response and throw it.
          let reserr=await res.json();
          console.log(reserr);  // DEBUG:
          throw reserr.response;
        }
      })  // End fetch.then
      .then((data) => {
        console.log("Initiator:fetch.then.then data");  // DEBUG:
        console.log(data); // DEBUG:
        file.multiObj.Key = data.Key;
        file.multiObj.UploadId = data.UploadId;
        return {
          "file": file
        };
      })  // End fetch.then.then
      .catch((err) => {
        console.log("Initiator:fetch.catch",file); // DEBUG:
        console.log(err); // DEBUG:
        throw err;
      }); // End fetch.catch
    })  // End map
  ) // Promise.all
  .then((data) => {
    console.log("Initiator:Promise.all.then:data"); // DEBUG:
    console.log(data);  // DEBUG:
    console.log(data[0].file.fileObj.name); // DEBUG:
    handleMultis(data); // handleMultis() doesn't exist... yet
  })  // Promise.all.then
  .catch((err) => {
    console.log("Initiator:Promise.all.catch:err"); // DEBUG:
    console.log(err); // DEBUG:
    switch (err) {
      case "Error: Invalid email domain.":
      case "Error: Invalid email format.":
        console.log("switch:invalid domain"); // DEBUG:
        validateEml(false);
        break;
      case "Error: File name invalid":
        $("#alertMsg").addClass("alert alert-danger").html(
          "One of your files has an invalid file name."
        ).fadeIn('fast');
        break;
      case err.toString().startsWith('Error: Filetype invalid.') ? err : '' :
        // Yeah, I know, but I don't know why this works either.
        console.log("FILETYPE");
        $("#alertMsg").addClass("alert alert-danger").html(
          err + " Remove the file and try again."
        ).fadeIn('fast');
        break;
      default:
        console.log("Default"); // DEBUG:
        $("#alertMsg").addClass("alert alert-danger").html(err).fadeIn('fast');
    } // End switch
  }); // Promise.all.catch
} // End initiator

// handleMultis
// Initiator creates an array of multipart uploads containing
// UploadId, S3 object key, and the file object.
function handleMultis(multis) {
  console.log("handleMultis",multis);
  Promise.all(
    multis.map( async (multi) => {
      // Get presignedUrl for each part
      let psUs = [];
      for (let i = 1; i <= multi.file.multiObj.parts.num; i++) {
        let psu = await getPresignedUrl({
          "key": multi.file.multiObj.Key,
          "uploadid": multi.file.multiObj.UploadId,
          "partnumber": i
        });
        psUs.push({
          "partnumber": i,
          "psu": psu
        });
      }
      multi.file.multiObj.psUs = psUs;
      return multi;
    }) // End map
  ) // End Promise.all
  .then((signedMultis) => {
    console.log('handleMultis:Promise.all.then signedMultis:',signedMultis);  // DEBUG:
    Promise.all(
      signedMultis.map( async (sMu) => {
        let etags = await putParts(sMu);
        console.log('etags: ',etags);  // DEBUG:
        return etags;
      })  // End map
    ) // End Promise.all inside a Promise.all
    .then((etags) => {
      console.log('Promise.Promise.then etags',etags);
    })
    .catch((err) => {
      console.log('Promise.Promise.catch:',err);  // DEBUG:
    })
  })
  .catch((err)=> {
    console.log('error: ',err);
  });
} // End handleMultis

// getPresignedUrl
// returns presigned URL for part provided
// @param part - Object
// part.key
// part.uploadid
// part.partnumber
async function getPresignedUrl(part) {
  console.log('getPresignedUrl: ',part);  // DEBUG:
  let url = APIG+'/presign';
  return await fetch(url, {
    method: 'POST',
    body: JSON.stringify(part)
  })
  .then(async (res) => {
    console.log('getPresignedUrl:fetch.then',res); // DEBUG:
    if(res.ok) {
      return await res.text();
    } else {
      // If the APIG response isn't 200, parse the response and throw it.
      let reserr=await res.json();
      console.log(reserr);  // DEBUG:
      throw reserr.response;
    }
  })  // End fetch.then
  .then((data) => {
    console.log('getPresignedUrl:fetch.then.then data', data);  // DEBUG:
    return data;
  })  // End fetch.then.then
  .catch((err) => {
    console.log('getPresignedUrl:fetch.catch: ', err); // DEBUG:
    throw err;
  }); // End fetch.catch
} // End getPresignedUrl

// putParts
// For every part of a multi call putPart
function putParts(file) {
  console.log('putParts:file ',file);
  Promise.all(
    file.file.multiObj.psUs.map( async (psu) => {
      let etag = await putPart(psu);
    })  // End map
  ) // End Promise.all
  .then((etags) => {
    console.log('putParts:Promise.all.then: etags',etags);  // DEBUG:
    return etags
  }) // End Promise.all.then
  .catch((err) => {
    console.log('putParts:Promise.all.catch:',err); // DEBUG:
  }); // End Promise.all.catch
} // End putParts

// putPart
// PUT file to presignedURL
// Read the File, slice it up by parts, and PUT
async function putPart(part) {
  console.log('putPart:part ',part);  // DEBUG:
  // return await fetch()
  // ****************************What do I put here? **************************
  // I have the psu and the partnum but I need the slice of the file to PUT
  // Do I slice up the file here? Should it be sliced previously?
  //
  return 'boo';
}
