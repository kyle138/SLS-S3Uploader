# SLS - S3 Uploader

This service consists of:
Lambdas:
* S3UploadPresigner
** triggered by APIG
** returns presigned URLs for anonymous upload to S3 bucket.
* S3onUpload
** triggered by files uploaded to S3
** generates presigned URLs for download from S3 bucket
** sends email through SES containing download URLs

S3:
* uploads.example.com
** hosts static frontend upload form
** files uploaded to uploads/ folder (removed after 30 days)
