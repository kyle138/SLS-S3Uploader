# SLS-S3Uploader
Serverless stack allowing anonymous uploads to S3 bucket.

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
  - Publishes notification to SNS topic
  - Returns download presigned URL for the completed upload if successful
  - Returns "Upload failed." if not successful
- **cancelator.js**
  - Called when [Cancel] is clicked during upload process
  - Attempts to abort the multipart upload
  - Checks if any parts remain and calls abort again if necessary
  - Returns "Upload already canceled." if UploadId isn't found

### SNS:
- Creates SNS topic S3Uploader-notifications-{stage} to send upload notifications to
  - The SNS topic is automatically created but an email to send notifications to will need to be manually subscribed to the topic
  - Notifications contain the email address of the uploader, file name, and presigned URL to download the file

## The following elements need to be created manually

### S3:
- One bucket to host both the upload form and the uploaded files
  - **static/** - FrontEnd files
  - **ul/** - Directory files are uploaded to
- Configured for static website hosting
- Permissions allows public read access for all files in /static*
- CORS has to be configured to include:
  ```
  "ExposeHeaders": [
    "ETag"
  ]
  ```
- Further recommendations:
  - Name the bucket the same as domain it will host
  - Create a lifecycle rule to periodically clean up the ul/ folder

### FrontEnd:
- The **static/** folder will need to be uploaded to the S3 bucket to host the front end form
- **static/**
  - **index.html** - The upload form
  - **js/**
    - **filedrop.js** - Handles all aspects of the file upload process.
    - **mimetypes.js** - List of accepted file types.
    - **defaults.js** - Default values for interface customization. API Gateway value retrieved from Serverless Deploy will need to be assigned to the "apig" value.
  - **css/style.css** - Style sheet
  - **img/logoH.png** - Jumbotron logo

### CloudFront:
- Create a CloudFront distribution to provide HTTPS for S3 bucket
- **Origin Paths**
  - Default origin, custom type, S3 website as Origin domain and Origin path set to **/static**
  - UL origin, S3 type, S3 Bucket Access **Yes use OAI**
    - Create CloudFront Public Key and Key Group. Record the Public Key ID for config.json:
      https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-trusted-signers.html
  - Create new **Behavior** with Path Pattern **/ul/*** and using the Origin created in the previous step
    - Restrict viewer access **Yes**
    - Trusted authorization type **Trusted key groups (recommended)**
    - Add the key group created in the previous step


### Configuration:
- **config/**
  - **config_example.json** will need to be copied to **config.json**
  - Update **config.json**:
    - **expup** - Timeout for upload parts in seconds, defaults to 24h
    - **expdn** - Timeout for download URL, defaults to 7 days (Maximum)
    - **keypairid** - Keypair ID created during CloudFront configuration
    - **privatekey** - Private Key associated with the Keypair ID stored on a single line with carriage returns and linebreaks replaced with '\n'
- **
