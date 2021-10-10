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
  let dt = e.dataTransfer;
  let files = dt.files;

  console.log('handleDrop:'); // DEBUG:
  console.log(e);           // DEBUG:
  handleFiles(files);
} // end handleDrop

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
