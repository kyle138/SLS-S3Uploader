'use strict';

const APIG="https://ile7rs5fbl.execute-api.us-east-1.amazonaws.com/post";
var files=[];
var eml = {
  "valid": false
};

// email validator
// Very basic regex of email provided.
// Must contain a @ and . with some other chars.
// Email will be further validated by Initiator lambda.
$("#email").change(function() {
  eml.email = $("#email").val();
  if(eml.email.length > 0 && !/^.+@.+\..+$/g.test(eml.email)) {
    eml.valid = false;
    console.log(`Invalid email: `+JSON.stringify(eml,null,2)); // DEBUG:
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
//    $("#submitbtn").removeClass('disabled');    *********FIGURE OUT HOW TO ENABLE BUTTON *******
    $("#emailMsg").html("");
    $("#emailMsg").removeClass("alert alert-danger");
    $("#row-files").fadeIn();
  }
})


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

// Files dropped in the dropzone kickoff the whole process
function handleDrop(e) {
  console.log('handleDrop:'); // DEBUG:
  console.log(e);           // DEBUG:

  // get the list of files from the event.
  let files = e.dataTransfer.files;
  Array.from(files).forEach(handleFile);
//  handleFiles(files);
} // end handleDrop

// handleFile()
// Call APIG initiator for file
// @params {file} file - The file selected for upload
function handleFile(file) {
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
  });

  $("#filesMsg").append(fileprog);

  let url = APIG+'/initiate';
  let initDate = {
    "email": "test"
  };
  console.log(`eml: ${eml}`);

  // fetch(url, {
  //   'POST',
  //
  // })

}

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
