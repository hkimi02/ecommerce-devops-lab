# E-Commerce DevOps Lab

CI/CD pipeline that provisions AWS infrastructure with **Terraform**, configures
it with **Ansible**, and deploys a containerized e-commerce app — fully
automated through **GitHub Actions**.

## Architecture

```
GitHub Actions Pipeline
        |
        v
Terraform  ->  AWS (VPC, 2 public subnets, ALB, 2x EC2 Ubuntu)
        |
        v
Ansible    ->  Docker + Docker Compose
        |
        v
ALB  ->  Nginx  ->  Node.js (PM2)  ->  MongoDB
```

## Repository layout

| Path | Purpose |
|------|---------|
| `terraform/` | Infrastructure as Code (VPC, subnets, SG, EC2, ALB) |
| `ansible/` | `deploy.yml` — installs Docker, runs the stack |
| `app/` | Node.js + Express store, Dockerfile |
| `nginx/` | Reverse proxy configuration |
| `docker-compose.yml` | Orchestrates nginx + app + mongo |
| `.github/workflows/pipeline.yml` | The CI/CD pipeline |

## Quick start

1. Create the S3 state bucket and set its name in `terraform/backend.tf`.
2. Add the GitHub Secrets (see `GUIDE.md`).
3. `git push origin main` — the pipeline provisions and deploys everything.
4. Open the ALB DNS name printed in the pipeline logs.
5. Run the **Destroy Infrastructure** workflow when done.

Full step-by-step instructions are in `GUIDE.md`.
