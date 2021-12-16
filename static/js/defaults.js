/*
Override the values below to customize the appearance of the upload form.
*/

// Display Defaults object
const defaults = {
  "title": "Hart Energy - Client File Uploader",
  "subtitle": "Client File Uploader",
  "logosrc": 'img/logoHE.png',
  "logoalt": 'upload.HartEnergy.com',
  "bgcolor": null,
  "color": '#c7c7c7',
  "apig": 'https://asgtibnd68.execute-api.us-east-1.amazonaws.com/post'
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

if(defaults.color !== null) {
  $('.jumbotron').css('color',defaults.color);
}
