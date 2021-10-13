// email validator
// Very basic regex of email provided.
// Must contain a @ and . with some other chars.
// Email will be further validated by Initiator lambda.
$("#email").change(function() {
  let eml = $("#email").val();
  if(eml.length > 0 && !/^.+@.+\..+$/g.test(eml)) {
    console.log(`Invalid email: ${eml}`); // DEBUG:
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
    $("#emailMsg").html("");
    $("#emailMsg").removeClass("alert alert-danger");
    $("#row-files").fadeIn();
  }
})
