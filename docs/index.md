![Diagram](https://kyle138.github.io/SLS-S3Uploader/S3Uploader.png)

## About
This project came about as a way to retire an old FTP server. Sometimes external clients need to send you files that are too large to attach to an email. In the past the answer was to set up an FTP server for them to upload the files too. Since then FTP has fallen out of fashion and better solutions such as Dropbox and Google Drive now exist. Unfortunately some clients just can't use Dropbox or Drive and this was the simplest solution I could come up with. This is a Serverless solution consisting of a handful of lambdas and a single S3 bucket hosting a single-page app. 

## How It Works
1. The client-side frontend consists of a simple form that the client uses to select the files they want to upload. 
2. Upon clicking [Submit] the client-side js sends the client's email address and filename(s) to the initiator lambda. The initiator checks the validity of the email address, checks if the filetype is allowed, and checks the filenames for valid characters. It then builds the S3 key by prepending the email address and a timestamp to the filename. Lastly it creates a multipart upload and returns the S3 Key and UploadId back to the frontend.
3. The frontend then calculates how many parts to slice the file(s) into and queries the presigner lambda to obtain presigned S3 URLs for each part.
4. Next the frontend slices the file(s) and PUTs each part directly to S3 using the presigned URLs and saves the ETAG response.
5. After all parts are PUT and all ETAGs recorded, the frontend sends the UploadId and ETAGs to the terminator lambda to complete the multipart upload. It next generates a CloudFront signed URL to publish to SNS to notify us that a file has been uploaded. Lastly it generates another signed CloudFront URL with a very short expiry to return to the front end.
6. *Optionally, if the [Cancel] button is clicked the front end sends the UploadId to the cancelator lambda which attempts to abort the multipart upload.
7. Finally, the frontend displays the success, failed, or canceled screen. 

## Learn more
- The source code and setup instructions are availabe at [github.com/kyle138/SLS-S3Uploader](https://github.com/kyle138/SLS-S3Uploader).
- A working example can be found at [upload.KyleMunz.com](https://upload.kylemunz.com/). 

## Credits:
By no means did I come up with all of this by myself. I drew heavy inspiration (and some code) from the links below:
- [AWS's documentation on Uploading and copying objects using multipart upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html)
- [Altostra has an excellent walk-through combining S3 pre-signed URLs and Multipart Uploads](https://www.altostra.com/blog/multipart-uploads-with-s3-presigned-url)
- [Joseph Zimmerman posted a great article on smashingmagazine.com building a drag-and-drop file uploader using plain JS](https://www.smashingmagazine.com/2018/01/drag-drop-file-uploader-vanilla-js/)
- [Saluev also has an insightful file upload dialog example using Bootstrap and jQuery](https://github.com/Saluev/bootstrap-file-dialog)
