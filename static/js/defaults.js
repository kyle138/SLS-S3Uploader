/*
Override the values below to customize the appearance of the upload form.
*/

// Display Defaults object
const defaults = {
  "title": "S3 Uploader",
  "subtitle": "Anonymous S3 Uploader",
  "logosrc": '/img/logoH.png',
  "logoalt": 'upload.KyleMunz.com',
  "bgcolor": null,
  "notesph": null,
  "color": '#c7c7c7',
  "apig": 'https://ile7rs5fbl.execute-api.us-east-1.amazonaws.com/post'
};

if(defaults.title !== null) {
  document.title = defaults.title;
}

if(defaults.subtitle !== null) {
  $('#subtitle').html(defaults.subtitle);
}

if(defaults.logosrc !== null) {
  $('#logo').attr('src',defaults.logosrc);
}

if(defaults.logoalt !== null) {
  $('#logo').attr('alt',defaults.logoalt);
}

if(defaults.bgcolor !== null) {
  $('.jumbotron').css('background-color',defaults.bgcolor);
}

if(defaults.notesph !== null) {
  $('#tanotes').attr('placeholder',defaults.notesph);
}

if(defaults.color !== null) {
  $('.jumbotron').css('color',defaults.color);
}
