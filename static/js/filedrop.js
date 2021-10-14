'use strict';

const APIG="https://ile7rs5fbl.execute-api.us-east-1.amazonaws.com/post";
var files=[];
var eml = {"valid": false};
var filereaders=[];

// email validator
// Very basic regex of email provided.
// Must contain a @ and . with some other chars.
// Email will be further validated by Initiator lambda.
$("#email").change(function() {
  eml.email = $("#email").val();
  if(eml.email.length > 0 && !/^.+@.+\..+$/g.test(eml.email)) {
    eml.valid = false;
    console.log(`Invalid email: `+JSON.stringify(eml,null,2)); // DEBUG:
    checkStatus();
    $("#row-files").fadeOut();
    $("#emailMsg").addClass("alert alert-danger");
    $("#emailMsg").html(
      "You must enter a valid email address."
    );
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
})

// dropArea
// defines area for drag and drop file uploads
let dropArea = document.getElementById('droparea');
dropArea.addEventListener('drop', handleDrop, false);

// Override defaults
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, preventDefaults, false)
});
function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

// Add/remove highlight on mouse in / mouse out
['dragenter', 'dragover'].forEach(eventName => {
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
function handleDrop(e) {
  console.log('handleDrop:'); // DEBUG:
  console.log(e);           // DEBUG:

  // handle the list of files from the event.
  handleFiles(e.dataTransfer.files);

} // end handleDrop

// handleFiles
// For all files being selected via input button or droparea, send to handleFile() for processing
// Then hand off to initiator()??
//  ***************** So, should handleFile start the multipart for each file? Or [Submit] *********
function handleFiles(files) {
  console.log("handleFiles"); // DEBUG:
  Promise.all(
    Array.from(files).map( async file => {
      return await handleFile(file);
    })  // End map
  ) // End Promise.All
  .then(async (results)=> {
    console.log("Promise.all.then");
    checkStatus();
    console.log(results);
  })  // End promise.all.then
  .catch((err) => {
    console.log('handleFiles:catch',err);
  }); // End Promise.all.catch
} // End handleFiles

// handleFile()
// Call APIG initiator for file
// @params {file} file - The file selected for upload
async function handleFile(file) {
  console.log("handleFile");  // DEBUG:
  console.log(file);  // DEBUG:

  files.push(file);
  let fidx = files.indexOf(file);
  let fileprog = $(`
    <div class="container-fluid" id="fidx${fidx}">
      <div class="col-sm-4">
        <span class="glyphicon glyphicon-remove s3u-remove"></span>&nbsp;
        <span class="glyphicon glyphicon-file"></span>&nbsp; ${file.name}
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

  $(".s3u-remove",fileprog).on("click", function() {
    console.log(`removeFile: ${fidx}`);  // DEBUG:
    files.pop(fidx);
    $(`#fidx${fidx}`).fadeOut("slow", () => $(`#fidx${fidx}`).remove());
    checkStatus();
  });

  $("#filesMsg").append(fileprog);

  let url = APIG+'/initiate';
  let initDate = {
    "email": "test"
  };
  console.log(`eml: `+JSON.stringify(eml,null,2));  // DEBUG:

  // fetch(url, {
  //   'POST',
  //
  // })

}

// checkStatus
// Enables or disables the [Submit] button as the email and file fields are filled out
function checkStatus() {
  console.log("checkStatus"); // DEBUG:
  if (eml.valid && files.length > 0) {
    console.log("enable");  // DEBUG:
    $("#submitbtn").removeAttr('style').removeClass('disabled');
  } else {
    console.log("disable"); // DEBUG:
    $("#submitbtn").attr('style', 'pointer-events: none').addClass('disabled');
  }
} // End checkStatus

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
