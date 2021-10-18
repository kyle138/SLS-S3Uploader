'use strict';

const APIG="https://ile7rs5fbl.execute-api.us-east-1.amazonaws.com/post";
var files=[],
    multis=[],
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
// fadeOut droparea to prevent further files being added
// and initiate initiator()
$("#submitbtn").click(() => {
  if( checkStatus() ) {
    $("#droparea").fadeOut();
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
    $("#emailMsg").addClass("alert alert-danger");
    $("#emailMsg").html( emailMsg );
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
    $("#emailMsg").html("");
    $("#emailMsg").removeClass("alert alert-danger");
    $("#row-files").fadeIn();
  }
} // End validateEml

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
// Catch files dropped in the droparea and send to handleFiles()
async function handleDrop(e) {
  console.log('handleDrop:'); // DEBUG:
  console.log(e);           // DEBUG:
  console.log(e.dataTransfer.files);  // DEBUG:
  console.log(e.dataTransfer.types); // DEBUG:
  let noFolders = Array.from(e.dataTransfer.files).map(file => {
    if (!file.type && file.size%4096 == 0) {
      console.log(`Folders now allowed: ${file.name}`); // DEBUG:
      return null;
      // Do something here? ************************
    } else {
      return file;
    }
  }); // End map
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

  // *************** Need to add check for folder ****************

  files.push(file);
  let fidx = files.indexOf(file);
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
    files.pop(fidx);
    $(`#fidx${fidx}`).fadeOut("slow", () => $(`#fidx${fidx}`).remove());
    checkStatus();
  });

  $("#filesMsg").append(fileprog);
} // End handleFile

// checkStatus
// Enables or disables the [Submit] button as the email and file fields are filled out
function checkStatus() {
  console.log("checkStatus"); // DEBUG:
  if (eml.valid && files.length > 0) {
    console.log("enable");  // DEBUG:
    $("#submitbtn").removeAttr('style').removeClass('disabled');
    return true;
  } else {
    console.log("disable"); // DEBUG:
    $("#submitbtn").attr('style', 'pointer-events: none').addClass('disabled');
    return false;
  }
} // End checkStatus

// initiator
// Initiate the upload process for each file in files[];
function initiator() {
  console.log("Initiator");
  let url = APIG+'/initiate';
  let initData = {
    "email": eml.email
  };
  console.log(`initData: `+JSON.stringify(initData,null,2));  // DEBUG:
  console.log(files); // DEBUG:

  Promise.all(
    files.map( async (file) => {
      initData.filename = file.name;
      initData.filetype = file.type;
      return await fetch(url, {
        method: 'POST',
        body: JSON.stringify(initData)
      })
      .then(async (res) => {
        console.log(res);
        if(res.ok) {
          return  await res.json();
        } else {
          // If the APIG response isn't 200, parse the response and throw it.
          let reserr=await res.json();
          console.log(reserr);  // DEBUG:
          throw reserr.response;
        }
      })
      .then((data) => {
        console.log("Initiator:fetch.then.then data");  // DEBUG:
        console.log(data); // DEBUG:
        return {
          "file": file,
          "multi": data
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
/*
    // ********************************************************
    Initiate Multipart Upload has been called,
    An array of objects containing the {file, multi} has been returned
    in this then() Promise.all over the array and call file-slicer-uploader()
    in next then() call terminator()
    // ********************************************************
  */
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
        $("#emailMsg").addClass("alert alert-danger");
        $("#emailMsg").html(
          "One of your files has an invalid file name."
        );
        break;
      case err.startsWith('Error: Filetype invalid.') ? err : '' :
        // Yeah, I know, but I don't know why this works either.
        console.log("FILETYPE");
        $("#emailMsg").addClass("alert alert-danger");
        $("#emailMsg").html(
          err + " Remove the file and try again."
        );
        break;
      default:
        console.log("Default"); // DEBUG:
        $("#emailMsg").addClass("alert alert-danger");
        $("#emailMsg").html(err);
    } // End switch
    // if(err = "Error: Invalid email domain.") {
    // }
  }); // Promise.all.catch

} // End initiator



// ****SCRATCH****
function uploadFile(file) {
  console.log(`uploadFile:`); // DEBUG:
  console.log(file);        // DEBUG:
  let url = 'TEMPURL';
  let formData = new FormData();

  formData.append('file', file);

  console.log('formData: ');  // DEBUG:
  console.log(formData);    // DEBUG:

  fetch(url, {
    method: 'POST',
    body: formData
  })
  .then((res) => {
    console.log('uploadFile:fetch:then'); // DEBUG:
    console.log(res);               // DEBUG:
  })
  .catch((err) => {
    console.log('uploadFile:fetch:catch');  // DEBUG:
    console.log(err);                     // DEBUG:
  });
} // End uploadFile
