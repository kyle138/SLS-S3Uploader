'use strict';

const APIG="https://ile7rs5fbl.execute-api.us-east-1.amazonaws.com/post";
var files=[];

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
  let fileprog = `
    <div class="col-sm-4" id="fidx${fidx}">
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
  `;

//  ********* FIX THIS JQUERY SELECTOR ********************
  $("#fidx"+fidx).click(function() {
    alert("Ping!");
    console.log(`Remove fidx${fidx} ${file.name} from files[]`);  // DEBUG:
  });
//  let fileprog = `<span class="glyphicon glyphicon-file"></span>&nbsp; ${file.name}`;
  $("#filesMsg").append(fileprog);

  let url = APIG+'/initiate';
/*  fetch(url, {
    'POST',

  })
*/
}

function handleFiles(files) {
  console.log("handleFiles"); // DEBUG:
  console.log(files);       // DEBUG:
  Array.from(files).forEach(uploadFile);
} // End handleFiles

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
