variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Prefix used to name resources"
  type        = string
  default     = "ecommerce-devops"
}

variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "t3.micro"
}

variable "instance_count" {
  description = "Number of web EC2 instances"
  type        = number
  default     = 2
}

variable "public_key" {
  description = "SSH public key used for the EC2 key pair"
  type        = string
}
