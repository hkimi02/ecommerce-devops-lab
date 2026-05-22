# Remote state in S3 with native state locking (Terraform >= 1.10).
# The bucket is created once, manually, before the first run (see GUIDE.md, Step 2).
# Replace the bucket name with the unique name you created.
terraform {
  backend "s3" {
    bucket       = "ecommerce-tfstate-amine-7421"
    key          = "ecommerce-devops/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
  }
}
