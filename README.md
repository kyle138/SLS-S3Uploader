# SLS-S3Uploader
Serverless stack allowing anonymous and secure uploads to an S3 bucket. This project came about as a way to retire an old FTP server allowing pseudo-anonymous uploads of files too large to email.

A working example can be found at [upload.KyleMunz.com](https://upload.kylemunz.com/).

## This serverless stack creates the following elements:

### Lambdas:
- **initiator.js**
  - Called when [Submit] button is clicked to initiate upload process
  - Validates provided email domain
  - Checks for accepted filetype of upload
  - Creates S3 Object key based on {email}/{timestamp}-{filename} and sanitized for S3
  - Creates Multipart Upload
  - Returns Key and UploadId
- **presigner.js**
  - Creates presigned URLs for the specified number of file slices
  - Returns array of presigned URLs
- **terminator.js**
  - Completes the multipart upload
  - Creates presigned CloudFront download URL with expiry set to EXPDN value
  - Publishes notification to SNS topic containing uploader email, filename, and presigned URL
  - Returns another presigned CloudFront download URL with expiry time of 10 minutes
  - Returns "Upload failed." if not successful
- **cancelator.js**
  - Called when [Cancel] is clicked during upload process
  - Attempts to abort the multipart upload
  - Checks if any parts remain and attempts to abort again if necessary
  - Returns "Upload already canceled." if UploadId isn't found

### SNS:
- Creates SNS topic S3Uploader-notifications-{stage} to send upload notifications to
  - The SNS topic is automatically created but an email to send notifications to will need to be manually subscribed to the topic
  - Notifications contain the email address of the uploader, file name, and presigned URL to download the file

## Deployment Instructions:
  Before deploying be sure to install npm modules for the lambda layers, then run the serverless deploy command specifying either dev1 or v1 stage.
  ```
  cd layers/CommonModules/nodejs
  npm install
  cd ../../..
  serverless -s dev1|v1 deploy
  ```

## The following elements need to be created manually

### S3:
- One bucket to host both the upload form and the uploaded files for each stage deployed
  - **static/** - FrontEnd files
  - **ul/** - Directory files are uploaded to
- Configured for static website hosting
- Permissions set to allow public read access for all files in /static*
  ```
  {
	  "Version": "2012-10-17",
	  "Statement": [
		  {
  			"Sid": "PublicReadGetObject",
  			"Principal": "*",
  			"Effect": "Allow",
  			"Action": "s3:GetObject",
  			"Resource": "arn:aws:s3:::yourdomainbucket/static*"
  		}
  	]
  }
  ```
- CORS has to be configured to include:
  ```
  [
    {
        "AllowedHeaders": [
            "*"
        ],
        "AllowedMethods": [
            "PUT",
            "POST",
            "GET"
        ],
        "AllowedOrigins": [
            "https://yourdomaindomain"
        ],
        "ExposeHeaders": [
            "ETag"
        ],
        "MaxAgeSeconds": 3600
    }
  ]
  ```
- Further recommendations:
  - Name the bucket the same as domain it will host
  - Create a lifecycle rule to periodically clean up the ul/ folder and incomplete multipart upload parts

### FrontEnd:
- The **static/** folder will need to be uploaded to the S3 bucket to host the front end form
- **static/**
  - **index.html** - The upload form
  - **js/**
    - **filedrop.js** - Handles all aspects of the file upload process.
    - **mimetypes.js** - List of accepted file types.
    - **defaults.js** - Default values for interface customization.
      - **NOTE:** The API Gateway value retrieved from Serverless Deploy will need to be assigned to the "apig" value in defaults.js.
  - **css/style.css** - Style sheet
  - **img/logoH.png** - Jumbotron logo

### CloudFront:
- Create a CloudFront distribution to provide HTTPS for S3 bucket
- **Create Origin Paths**
  - Default origin:
    - Custom type
    - S3 website endpoint as Origin domain
    - Origin path set to **/static**
  - UL origin:
    - S3 type
    - S3 Bucket Access: **Yes use OAI**
    - Create CloudFront Public Key and Key Group. Record the Public Key ID for config.json:
      https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-trusted-signers.html
    - Select **Yes, update the bucket policy**
    - Also create new **Behavior** with Path Pattern **/ul/*** and using the Origin created in the previous step
      - Restrict viewer access **Yes**
      - Trusted authorization type **Trusted key groups (recommended)**
      - Add the key group created in the previous step
    - Go back and inspect the S3 bucket policy that CloudFront updated in the previous step. Change the **Sid:2** **Resource** to only apply to the **/ul/*** directory.
  - Error Pages:
    - Create custom error responses for 403 and 404 errors using /403.html and /404.html respectively.

### Configuration:
- **config/**
  - **config_example.json** will need to be copied to **config.json**
  - Update **config.json**:
    - **expup** - Timeout for upload parts in seconds, defaults to 24h
    - **expdn** - Timeout for download URL, defaults to 7 days
    - **keypairid** - Keypair ID created during CloudFront configuration
    - **privatekey** - Private Key associated with the Keypair ID stored on a single line with carriage returns and linebreaks replaced with '\n'
- **SNS**
  - To receive notifications when an item is uploaded, be sure to subscribe an email address to your SNS topic.

## Credits:
By no means did I come up with all of this by myself. I drew heavy inspiration (and some code) from the links below:
- [AWS's documentation on Uploading and copying objects using multipart upload](https://docs.aws.amazon.com/AmazonS3/latest/userguide/mpuoverview.html)
- [Altostra has an excellent walk-through combining S3 pre-signed URLs and Multipart Uploads](https://www.altostra.com/blog/multipart-uploads-with-s3-presigned-url)
- [Joseph Zimmerman posted a great article on smashingmagazine.com building a drag-and-drop file uploader using plain JS](https://www.smashingmagazine.com/2018/01/drag-drop-file-uploader-vanilla-js/)
- [Saluev also has an insightful file upload dialog example using Bootstrap and jQuery](https://github.com/Saluev/bootstrap-file-dialog)
