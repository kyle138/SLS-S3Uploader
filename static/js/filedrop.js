'use strict';

// Initialize some constants
const minPartSize = 5 * 1024 * 1024, // 5MB
      maxPartSize = 5 * 1024 * 1024 * 1024, // 5GB
      maxFileSize = 5 * 1024 * 1024 * 1024 * 1024, // 5TB
      maxParts = 10000; // AWS doesn't allow more than 10,000 parts

// Initialize holders for files array and eml object.
var files=[],
    eml = {"valid": false},
    // set cancelLvl to 0 initially.
    cancelLvl = 0;

// Process values in email field when user exits the field or clicks [Check]
$("#email").change(() => {
  validateEml();
});
$("#emailchk").click(() => {
  validateEml();
}); // End email validator

// Intercept enter key in the email field
$("#email").keypress((e) => {
  if(e.which == 13) {
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

// cancel button
// Intercept cancel button clicks
// Different behaviors are performed on [Cancel] clicks based on the
// current state of the form and whether any uploads are currently in progress.
// cancelLvl 0: No multiparts have been initiated, simply reload form.
// cancelLvl 1: At least one multipart upload has been initialized.
// cancelLvl 2: [Cancel] has been clicked, Abort has been called, stop any future parts from uploading.
$("#cancelbtn").click(() => {
  if( cancelLvl == 0) {
    // No uploads have begun, simple enough to reset and reload.
    document.getElementById("uploadForm").reset();
    window.location.reload();
  } else {
    // This is a bit more complicated, ajax and backend systems have to get involved.
    cancelLvl = 2;
    $("#filesLbl").html('The upload is being cancelled...');
    cancelator();
  }
}); // End cancel button.

// reset button
// Intercept reset button clicks
// Same behavior as cancel button for cancelLvl 0
$(".resetbtn").click(() => {
  document.getElementById("uploadForm").reset();
  window.location.reload();
}); // End reset button

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
  let noFolders = Array.from(e.dataTransfer.files).reduce( (res,file) => {
    if (file.type && file.size%4096 != 0) {
      res.push(file);
    }
    return res;
  },[]); // End reduce
  console.log('handleDrop:noFolders[]',noFolders); // DEBUG:
  // handle the list of files from the event.
  handleFiles(noFolders);
} // end handleDrop

// handleFiles
// For all files being selected via input button or droparea, send to handleFile() for processing
// Then call checkStatus() to check if ok to submit
function handleFiles(fls) {
  Promise.all(
    Array.from(fls).map( async (file) => {
      if(file) {
        return await handleFile(file);
      } else {
        return null;
      }
    })  // End map
  ) // End Promise.All
  .then( () => {
    checkStatus();
  })  // End promise.all.then
  .catch((err) => {
    console.log('handleFiles:catch',err);
  }); // End Promise.all.catch
} // End handleFiles

// handleFile()
// Add file progress row to filesList div
// @params {file} file - The file selected for upload
function handleFile(file) {
  console.log("handleFile:",file);  // DEBUG:

  // Check if file is over AWS maximum of 5TB
  // and if file is one of the accepted file types.
  if (file.size > maxFileSize) {
    $("#alertMsg").addClass("alert alert-warning").append(
      `<div class='row'>Files over 5TB in size are not accepted.</div>`
    ).fadeIn('fast');
  } else if (mimetypes.indexOf(file.type) == -1) {
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
      <div class="container-fluid row filerow" id="fidx${fidx}">
        <div class="col-sm-4 text-truncate file">
          <span class="fas fa-times-circle s3u-remove" data-toggle="tooltip" title="Remove this file from upload queue."></span>&nbsp;
          <span class="fas fa-file"></span>&nbsp;
          <span>${file.name}</span>&nbsp;
        </div>
        <div class="col-sm-8 s3u-progress">
          <div class="progress">
            <div class="progress-bar progress-bar-striped progress-bar-animated" role="progressbar" id="pb${fidx}" aria-valuenow='0' aria-valuemin='0' aria-valuemax='100'>
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

    $("#filesList").append(fileprog);
  }
} // End handleFile

// checkStatus
// Enables or disables the [Submit] button as the email and file fields are filled out
function checkStatus() {
  let noNulls = trimNulls();
  if (eml.valid && noNulls.length > 0) {
    console.log("checkStatus: enable");  // DEBUG:
    $("#submitbtnwrpr").tooltip('disable');
    $("#submitbtn").removeAttr('style').removeClass('disabled');
    return true;
  } else {
    console.log("checkStatus: disable"); // DEBUG:
    $("#submitbtnwrpr").tooltip('enable');
    $("#submitbtn").attr('style', 'pointer-events: none').addClass('disabled');
    return false;
  }
} // End checkStatus

// trimNulls
// Files removed from the upload list leave nulls in the files[] array,
// Remove any nulls and return sanitized array.
function trimNulls() {
  return files.reduce( (res,file) => {
    if (file != null) {
      res.push(file);
    }
    return res;
  },[]);
}  // End trimNulls

// thatsProgress
// Update the specified progress bar
// @param {int} fidx - The file index value of the progress bar to update
// @param {number} pcnt - The percentage value to set the progres bar to
function thatsProgress(fidx, pcnt) {
  switch (pcnt) {
    // 100 percent, change bar to solid green
    case 100:
      $('#filesList').find(`#pb${fidx}`)
        .css("width", `${pcnt}%`)
        .attr("aria-valuenow", `${pcnt}%`)
        .removeClass('progress-bar-striped progress-bar-animated')
        .addClass('bg-success')
        .find('.sr-only').html(`Complete`);
      break;
    // -1 percent, change bar to red to signify cancel in progress.
    case -1:
      $('#filesList').find(`#pb${fidx}`)
        .addClass('bg-danger')
        .find('.sr-only').html(`Cancelled`);
      break;
    default:
      $('#filesList').find(`#pb${fidx}`)
        .css("width", `${pcnt}%`)
        .attr("aria-valuenow", `${pcnt}%`)
        .find('.sr-only').html(`${pcnt}%`);
  } // End switch
} // End thatsProgress

// initiator
// Initiate the upload process for each file in files[];
// Set Key and UploadId values for file, update progressbar to 5%
function initiator() {
  // Settings for to fetch
  let url = defaults.apig+'/initiate';
  let initData = {
    "email": eml.email,
    "industry": $("#industryElem").val()
  };

  // reset any existing alerts.
  $("#alertMsg").hide().html("");
  // reset files array
  files = trimNulls();
  // Initiate multipart upload for all files
  Promise.all(
    files.map( async (file) => {
      initData.filename = file.fileObj.name;
      initData.filetype = file.fileObj.type;
      return await fetch(url, {
        method: 'POST',
        body: JSON.stringify(initData)
      })
      .then(async (res) => {
        if(res.ok) {
          return  await res.json();
        } else {
          // If the APIG response isn't 200, parse the response and throw it.
          let reserr=await res.json();
          reserr = reserr.hasOwnProperty('response') ? reserr.response : reserr;
          throw reserr;
        }
      })  // End fetch.then
      .then((data) => {
        file.multiObj.Key = data.Key;
        file.multiObj.UploadId = data.UploadId;
        // Start the progress bar at 5%
        thatsProgress(file.fidx, 5);
        return file;
      })  // End fetch.then.then
      .catch((err) => {
        console.log("Initiator:fetch.catch",err); // DEBUG:
        throw err;
      }); // End fetch.catch
    })  // End map
  ) // Promise.all
  .then((data) => {
    // increase cancelLvl to 1.
    cancelLvl = 1;
    handleMultis();
  })  // Promise.all.then
  .catch((err) => {
    console.log("Initiator:Promise.all.catch:err",err); // DEBUG:
    // Initiator lambda can return errors based on invalid email or file name/type
    // Different behaviors are called on the UI based upon the error type.
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
        console.log("FILETYPE");  // DEBUG:
        $("#alertMsg").addClass("alert alert-danger").html(
          err + " Remove the file and try again."
        ).fadeIn('fast');
        break;
      default:
        console.log("Default"); // DEBUG:
        $("#alertMsg").addClass("alert alert-danger").html("Server error. Please try again later.").fadeIn('fast');
    } // End switch
  }); // Promise.all.catch
} // End initiator

// handleMultis
// The initiator function begins a multipart upload for every file in the files[] array
// It updates the elements of that array with:
// UploadId, S3 object key, and the file object.
// handleMultis handles uploading the parts of each multipart upload of each file in the file[] array
// by calling getPresignedUrl for all parts, then calling putParts for each part,
// then calls success() after all uploads are completed successfully.
function handleMultis() {
  console.log("handleMultis",files);  // DEBUG:
  Promise.all(
    files.map( async (multi) => {
      // Only request 1000 psUs at a time from lambda/presigner to avoid timeouts.
      multi.multiObj.psUs = [];
      for(let partsbegin=1; partsbegin<=multi.multiObj.parts.num; partsbegin+=1000) {
        let partsend = partsbegin+999 > multi.multiObj.parts.num
                     ? multi.multiObj.parts.num
                     : partsbegin+999;
        multi.multiObj.psUs = multi.multiObj.psUs.concat(
          await getPresignedUrl({
            "key": multi.multiObj.Key,
            "uploadid": multi.multiObj.UploadId,
            "partsbegin": partsbegin,
            "partsend": partsend
          })
        );  // End concat
      } // End for loop
      console.log("multiObj.psUs:",multi.multiObj.psUs);  // DEBUG:
      thatsProgress(multi.fidx, 10);  // set progress at 10%
      return multi;
    }) // End map
  ) // End Promise.all
  .then(async (data) => {
    console.log('handleMultis:Promise.all.then signedMultis:',data);  // DEBUG:
    files = data;
    return await Promise.all(
      files.map( async (sMu) => {
        return await putParts(sMu);
      })  // End map
    ) // End Promise.all inside a Promise.all
    .catch((err) => {
      console.log('Promise.Promise.catch:',err);  // DEBUG:
      throw err;
    }); // End Promise.all.Promise.all.catch
  })  // End Promise.all.then
  .then((data) => {
    console.log(`handleMultis:Promise.all.then.then terminatedMultis:`,data); // DEBUG:
    files = data;
    $("#uploadForm").hide();
    if(cancelLvl == 2) {
      cancel();
    } else {
      success();
    }
  })  // End Promise.all.then.then
  .catch((err)=> {
    console.log('error: ',err);
    $('#uploadForm').hide();
    $('#failMsg').html('Upload has failed. Please try again.');
    $('.resetBtn').removeAttr('style').removeClass('disabled');
    $('#failed').fadeIn('fast');
  }); // End Promise.all.catch
} // End handleMultis

// getPresignedUrl
// returns presigned URL(s) for part(s) provided
// @param part - Object
// part.key
// part.uploadid
// part.partsbegin
// part.partsend
async function getPresignedUrl(part) {
  let url = defaults.apig+'/presign';
  return await fetch(url, {
    method: 'POST',
    body: JSON.stringify(part)
  })
  .then(async (res) => {
    if(res.ok) {
      return await res.json();
    } else {
      // If the APIG response isn't 200, parse the response and throw it.
      let reserr=await res.json();
      console.log('getPresignedUrl:error:',reserr);  // DEBUG:
      throw reserr.response;
    }
  })  // End fetch.then
  .then((data) => {
    return data;
  })  // End fetch.then.then
  .catch((err) => {
    console.log('getPresignedUrl:fetch.catch: ', err); // DEBUG:
    throw err;
  }); // End fetch.catch
} // End getPresignedUrl

// putParts
// Calculates and slices file into parts for multipart upload
// For each part, call fetch to PUT to presigned URL.
// @param {file object} file - The file object to put
function putParts(file) {
  return new Promise(async (res, rej) => {
    console.log('putParts:file ',file); // DEBUG:

    // If the psUs aren't a valid array it causes an infinite loop
    if(typeof file.multiObj.psUs.length !== 'number') {
      return rej(new Error('putParts error.'));
    }

    let reader = new FileReader(),
        pcnt = 85 / file.multiObj.parts.num;
    file.multiObj.ETags = [];

    for( let i = 0; i < file.multiObj.psUs.length; i++ ) {
      // If [Cancel] has been pressed, do not upload anymore parts.
      if(cancelLvl == 2 ) { console.log(`CANCELLED:i: ${i}`);break; }
      // Otherwise...
      let start = i * file.multiObj.parts.size,
          end = (i+1) * file.multiObj.parts.size,
          chunk = (i+1) < file.multiObj.parts.num
                ? file.fileObj.slice(start, end)
                : file.fileObj.slice(start);
      // Use fetch to PUT each chunk to its assigned psUrl
      let etag = await fetch(file.multiObj.psUs[i].psu, {
        method: 'PUT',
        body: chunk
      })  // End fetch
      .then(async (resp) => {
        if(resp.ok) {
          // set progress bar at pcnt * i+1 + 10 (max of 95%);
          thatsProgress(file.fidx, pcnt*(i+1)+10);
          return await resp.headers.get('ETag');
        } else {
          let resperr = await resp.json();
          throw resperr.response;
        }
      })  // End fetch.then
      .catch(async (err) => {
        console.log(`putParts:for[${i}]:fetch.catch err`,err);  // DEBUG:
        // Part failed to PUT, try one more time.
        return await fetch(file.multiObj.psUs[i].psu, {
          method: 'PUT',
          body: chunk
        })
        .then(async (resp) => {
          if(resp.ok) {
            // set progress bar at pcnt * i+1 + 10 (max of 95%);
            thatsProgress(file.fidx, pcnt*(i+1)+10);
            return await resp.headers.get('ETag');
          } else {
            let resperr = await resp.json();
            console.log(`Second attempt to put Part[${i}] failed.`,resperr); // DEBUG:
            throw resperr.response;
          }
        })  // End 2nd fetch.then
        .catch((err) => {
          console.log(`This upload will fail when terminate is called.`); // DEBUG:
        });
      });  // End fetch.catch
      console.log(`etag[${i}]: ${etag}`); // DEBUG:
      // Save each ETag to the multiObj
      file.multiObj.ETags.push({
        "ETag": etag,
        "PartNumber": (i+1)
      });
    } // End for loop

    // Sort ETags in ascending order based on PartNumber value
    file.multiObj.ETags.sort((a,b) => {return a.PartNumber - b.PartNumber});

    // Check if we're attempting to cancel.
    console.log(`cancelLvl: ${cancelLvl}`); // DEBUG:
    if(cancelLvl == 2) {
      file.QSA = 'CANCELLED';
      thatsProgress(file.fidx, -1); // Set progressbar at -1 to signify cancel in progress.
    } else {
      // Complete the multipart upload and get download QSA.
      file.QSA = await terminator(file.multiObj);
      thatsProgress(file.fidx, 100);  // Set progressbar at 100%
    }
    return res(file);
  }); // End Promise
} // End putParts

// terminator
// Completes the MultipartUpload
// @params - object
// MultiObj containing {String} Key, {String} UploadId, and {Array} ETags
async function terminator(obj) {
  let url = defaults.apig+'/terminate';
  return await fetch(url, {
    method: 'POST',
    body: JSON.stringify(
      {
        "key": obj.Key,
        "uploadid": obj.UploadId,
        "parts": obj.ETags
      }
    )
  })  // End fetch
  .then(async (res) => {
    if(res.ok) {
      return await res.json();
    } else {
      // If the APIG response isn't 200, parse the response and throw it.
      let reserr=await res.json();
      throw reserr.response;
    }
  })  // End fetch.then
  .catch(async (err) => {
    console.log('terminator:fetch.catch err',err);  // DEBUG:
    throw err;
  }); // End fetch.catch
}

// cancelator
// Aborts all MultipartUploads in progress
async function cancelator() {
  console.log('cancelator');  // DEBUG:
  let url = defaults.apig+'/cancelate';
  // Different steps are required to cancel
  switch (cancelLvl) {
    case 0:
      console.log('cancelator: level 0???'); // DEBUG:
      // This should have already been done, but just in case...
      $("#uploadForm").reset();
      window.location.reload();
      break;
    case 1:
      // This case should never be called. cancelLvl 1 just means upload in progress.
      console.log('cancelator: level 1...');  // DEBUG:
      break;
    case 2:
      console.log('cancelator: level 2...');  // DEBUG:
      // Call the cancelator for all files[]
      Promise.all(
        files.map( async (file) => {
          console.log('cancelator:file:',JSON.stringify(file.multiObj,null,2)); // DEBUG:
          return await fetch(url, {
            method: 'POST',
            body: JSON.stringify(
              {
                "key": file.multiObj.Key,
                "uploadid": file.multiObj.UploadId
              }
            )
          })  // End fetch
          .then(async (res) => {
            if(res.ok) {
              return await res.json();
            } else {
              // If the APIG response isn't 200, parse the response and throw it.
              let reserr=await res.json();
              throw reserr.response;
            }
          })  // End fetch.then
          .catch(async (err) => {
            console.log('cancelator:fetch.catch err',err);  // DEBUG:
            throw err;
          }); // End fetch.catch
        })  // End map
      ) // End Promise.all
      .then(() => {
        console.log('cancelator: all uploads cancelled.');  // DEBUG:
        cancel();
      })
      break;
    default:
      // This shouldn't happen either.
      console.log('cancelator: default???'); // DEBUG:
  } // End switch
}  // End cancelator

// success
// Displays success message and QSAs for uploaded files
// To be called after all uploads have completed and we have QSA for each
function success() {
  Promise.all(
    files.map( async (file) => {
      return await succ(file);
    })  // End map
  ) // End Promise.all
  .then((qsas) => {
    let qsaarea = $(`
      <div class="input-group">
      <div class="input-group-prepend">
      <button type="button" class="btn btn-primary" id="copyQSAs">Copy to Clipboard</button>
      </div>
      <textarea class="form-control" id="QSAsTA" aria-label="Copy to clips" rows="4" readonly>${qsas.join('&#10;')}</textarea>
      </div>
    `);
    // Copies list of QSAs from textarea to clipboard
    $("#copyQSAs",qsaarea).on("click", () => {
      console.log('Copy to Clipboard'); // DEBUG:
      $("#QSAsTA").select();
      document.execCommand('copy');
    }); // End Copy to clipboard
    // Add it to the page
    $("#qsaArea").append(qsaarea);
  // })  // End Promise.all.then
  // .then(() => {
    let s = (files.length > 1) ? 's have': ' has';
    if(qsas.includes('Upload failed.')) {
      $("#successMsg").html(
        `The upload${s} completed with errors.
        <h3 class='text-muted'>The files marked below in red may need to be uploaded again.</h3>`
      );
    } else {
      $("#successMsg").html(`The upload${s} completed successfully.`);
    }
    s = (files.length > 1) ? 's' : '';
    $("#successListLbl").html(`You can download the file${s} using the provided link${s}.`);
    $("#qsaAreaLbl").html(`Alternatively, you can copy the link${s} to your clipboard.`);
    $(".resetbtn").removeAttr('style').removeClass('disabled');
    $("#success").fadeIn('fast');
  })  // End Promise.all.then.then
  .catch((err) => {
    console.log('succ:Promise.all.catch',err);  // DEBUG:
  }); // End Promise.all.catch

} // End success

// succ
// Build file link for the specified file
// @param {file object} file - The file object to succ
function succ(file) {
  return new Promise((res) => {
    console.log('succ:file: ',file);  // DEBUG:
    let filesucc;
    if(file.QSA.response != 'Upload failed.') {
      filesucc = $(`
        <div class="container-fluid row filerow" id="sidx${file.fidx}">
          <div class="text-truncate file">
            <a target="_blank" href="${file.QSA.response}">
              <span class="fas fa-file"></span>&nbsp;
              ${file.fileObj.name}
            </a>
          </div>
        </div>
      `);
    } else {
      filesucc = $(`
        <div class="container-fluid row filerow" id="sidx${file.fidx}">
          <div class="text-truncate uploaderror">
            <span class="fas fa-exclamation-circle"></span>&nbsp;
            <span class="failed">${file.fileObj.name}</span>
          </div>
        </div>
      `);
    }
    $("#successList").append(filesucc);
    return res(file.QSA.response);
  }); // End Promise
} // End succ

// cancel
// Opposite of success(), shows that the upload was cancelled.
function cancel() {
  console.log("CANCEL::");  // DEBUG:
  $("#uploadForm").hide();
  $("#cancelMsg").html('The upload has been cancelled.');
  $(".resetbtn").removeAttr('style').removeClass('disabled');
  $("#cancel").fadeIn('fast');
} // End cancel

// validateEml
// Very basic regex of email provided.
// Must contain a @ and . with some other chars.
// Email will be further validated by Initiator lambda.
// @param {bool} mxpass - If Initiator lambda rejects email domain this
//                        function is called again with mxpass set to false
//                        Otherwise mxpass defaults to true
function validateEml(mxpass=true) {
  eml.email = $("#email").val();
  if(eml.email.length == 0 || !/^.+@.+\..+$/g.test(eml.email) || !mxpass) {
    eml.valid = false;
    let emailMsg = mxpass ? "You must enter a valid email address." : "Try a different email address. The one you entered cannot be verified.";
    console.log(`Invalid email: `+JSON.stringify(eml,null,2)); // DEBUG:
    checkStatus();
    $("#emailchk").removeClass('btn-success').addClass('btn-primary').html('Check').removeAttr('style');
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
    checkStatus();
    $("#alertMsg").html("").removeClass("alert alert-danger");
    $("#emailchk").removeClass('btn-primary').addClass('btn-success').html('<i class="fas fa-check"></i>').attr('style', 'pointer-events: none');
    $("#row-files").fadeIn();
  }
} // End validateEml

// reckonParts
// Returns the number and size of parts needed for multipart upload
// Attempts to keep number of parts < 500 for performance
function reckonParts(filesize) {
  let parts = {},
      gb = 1024*1024*1024;
  switch(true) {
    case (filesize < 2.5*gb): // Less than 2.5GB
      parts.size = minPartSize; // 5MB
      break;
    case (filesize < 25*gb):  // Less than 25GB
      parts.size = minPartSize*10;  // 50MB
      break;
    case (filesize < 250*gb): // Less than 250GB
      parts.size = minPartSize*100; // 500MB
      break;
    case (filesize < 500*gb): // Less than 500GB
      parts.size = gb;  // 1GB
      break;
    default:                  // Over 500GB
      parts.size = maxPartSize; // 5GB
  } // End switch
  parts.num = Math.ceil(filesize / parts.size) < 10000
            ? Math.ceil(filesize / parts.size)
            : 10000;
  return parts;
} // End reckonParts
