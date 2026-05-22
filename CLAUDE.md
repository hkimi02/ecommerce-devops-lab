# CLAUDE.md — Project context for Claude Code

## What this is
A DevOps CI/CD lab project. A GitHub Actions pipeline provisions AWS
infrastructure with Terraform, configures it with Ansible, and deploys a
containerized e-commerce application.

## Architecture
GitHub Actions -> Terraform -> AWS (VPC, 2 public subnets, ALB, 2 EC2)
-> Ansible (installs Docker) -> docker compose (Nginx -> Node.js -> MongoDB)

## Stack
- IaC: Terraform (~> 5.0 AWS provider), remote state in S3
- Config management: Ansible
- Containers: Docker + Docker Compose, PM2 inside the Node container
- App: Node.js + Express + MongoDB, served behind Nginx
- CI/CD: GitHub Actions
- Compute: 2x t3.micro Ubuntu 24.04 EC2 instances in us-east-1

## Layout
- terraform/  — VPC, subnets, SGs, EC2, ALB, outputs
- ansible/    — deploy.yml playbook (Docker install + compose up)
- app/        — Express app, Dockerfile
- nginx/      — reverse proxy config
- docker-compose.yml — orchestrates nginx + app + mongo
- .github/workflows/pipeline.yml — the CI/CD pipeline

## Conventions / constraints
- EC2 instances live in PUBLIC subnets (no NAT Gateway) so GitHub Actions
  can SSH in for Ansible and to keep cost near zero.
- ALB health check path is /health, must return HTTP 200.
- ansible_user is `ubuntu` (Ubuntu AMI), not ec2-user.
- Never hardcode AWS credentials or SSH keys — use GitHub Secrets / TF_VAR.
- Region: us-east-1.

## Cost discipline
Always destroy infrastructure after testing. The ALB and EC2 bill per hour.
