# DevOps CI/CD Mini-Project — Complete Walkthrough

**Module:** Déploiement IaaS — DevOps CI/CD Lab (Terraform + Ansible + Docker + GitHub Actions)

This guide takes you from an empty AWS account to a running, load-balanced
e-commerce app deployed entirely by a CI/CD pipeline — plus everything you need
to defend it in the validation presentation.

> **You have two options.** The attached `ecommerce-devops-lab/` folder is a
> complete, ready-to-run project. You can either (A) use it directly, or
> (B) rebuild it yourself with the Claude Code prompts in Part 4. Either way,
> read Parts 1–3 and 5–8 — those steps are the same.

---

## 0. What you will deliver

A GitHub repository whose pipeline, on every push to `main`:

1. Provisions AWS infrastructure with **Terraform** (VPC, 2 subnets, 2 EC2, ALB).
2. Configures the servers with **Ansible** (installs Docker).
3. Deploys a containerized app: **ALB → Nginx → Node.js (PM2) → MongoDB**.

Final result: opening the ALB DNS shows the store with *Laptop $1200* and *Phone $800*.

**Cost note:** 2× t3.micro + 1 ALB ≈ **$0.07/hour** (~$1–2 for a full day of
testing). It draws from your $100 credits. **Always run the destroy step when
done** — see Part 8.

---

## 1. Prerequisites

You need a machine with a terminal, Git, and SSH. Two choices:

- **Option A — your own laptop.** Fastest. Install Git and (optionally)
  Terraform/Ansible if you want to test locally. Skip to Part 3.
- **Option B — an AWS Ubuntu dev machine.** A clean cloud workstation. Steps in Part 2.

The pipeline itself runs on GitHub's servers, so a heavy local setup is *not*
required. You mainly need to edit files, run Claude Code, and `git push`.

---

## 2. (Optional) Set up the AWS Ubuntu workstation

Use this if you want a clean cloud dev box instead of your laptop.

### 2.1 Launch the instance (AWS Console)

1. Console → **EC2** → region **N. Virginia (us-east-1)** (top-right selector).
2. **Launch instance**.
   - Name: `devops-workstation`
   - AMI: **Ubuntu Server 24.04 LTS**
   - Instance type: **t3.small** (workstation needs a bit more RAM than micro)
   - Key pair: **Create new key pair** → name `workstation-key` → type **RSA**,
     **.pem** → download it.
   - Network settings → **Allow SSH traffic from → My IP**.
   - Storage: 20 GiB gp3.
3. **Launch instance** → open it → copy the **Public IPv4 address**.

### 2.2 Connect

```bash
chmod 400 ~/Downloads/workstation-key.pem
ssh -i ~/Downloads/workstation-key.pem ubuntu@<PUBLIC_IP>
```

### 2.3 Install the toolchain (run on the Ubuntu machine)

```bash
# System + Git + utilities
sudo apt-get update && sudo apt-get install -y git unzip jq curl

# AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o awscli.zip
unzip awscli.zip && sudo ./aws/install && rm -rf awscli.zip aws

# Terraform (HashiCorp apt repo)
wget -O- https://apt.releases.hashicorp.com/gpg | \
  sudo gpg --dearmor -o /usr/share/keyrings/hashicorp.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp.gpg] \
https://apt.releases.hashicorp.com $(lsb_release -cs) main" | \
  sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt-get update && sudo apt-get install -y terraform

# Ansible
sudo apt-get install -y ansible

# Node.js 20 (for Claude Code) + GitHub CLI
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs gh

# Claude Code
sudo npm install -g @anthropic-ai/claude-code

# Verify
terraform -version && ansible --version && aws --version && node -v
```

Then start Claude Code in your project folder with `claude` and authenticate
when prompted.

---

## 3. One-time AWS setup

Do this once. All commands work from your laptop or the Ubuntu workstation.

### 3.1 Create an IAM user for the pipeline

The pipeline must not use your root account. Console → **IAM** → **Users** →
**Create user**:

- User name: `devops-pipeline`
- **Do not** enable console access.
- Permissions → **Attach policies directly** → **AdministratorAccess**
  (acceptable for a lab; a real project would scope this down).
- Create user → open it → **Security credentials** → **Create access key** →
  use case **Application running outside AWS** → create.
- **Copy the Access key ID and Secret access key now** — the secret is shown once.

### 3.2 Configure the AWS CLI

```bash
aws configure
# AWS Access Key ID     : <paste>
# AWS Secret Access Key : <paste>
# Default region name   : us-east-1
# Default output format : json

aws sts get-caller-identity   # should print your account ID
```

### 3.3 Create the SSH key pair for the EC2 instances

```bash
ssh-keygen -t rsa -b 4096 -f ~/.ssh/ecommerce-lab -N ""
# Creates ~/.ssh/ecommerce-lab (private) and ~/.ssh/ecommerce-lab.pub (public)
```

### 3.4 Create the S3 bucket for Terraform remote state

State must persist between the *apply* run and the *destroy* run. Bucket names
are globally unique — add random characters:

```bash
aws s3 mb s3://ecommerce-tfstate-amine-7421 --region us-east-1
```

Open `terraform/backend.tf` and set `bucket` to the exact name you used.

---

## 4. Generate the project with Claude Code

If you are using the attached repo, skip to Part 5. To build it yourself, run
these prompts **in order** inside Claude Code, from an empty folder.

### Prompt 1 — Scaffold

```
Create a DevOps CI/CD lab project named ecommerce-devops-lab. Make these folders:
terraform/, ansible/, app/, nginx/, and .github/workflows/. Add a .gitignore
that excludes Terraform state and plan files, *.pem keys, node_modules, and
generated inventory.ini. Add a CLAUDE.md describing the architecture:
GitHub Actions -> Terraform -> AWS (VPC, 2 public subnets, ALB, 2 EC2 Ubuntu
24.04) -> Ansible installs Docker -> docker compose runs Nginx -> Node.js (PM2)
-> MongoDB. Region us-east-1. Do not write code yet, just the structure.
```

### Prompt 2 — The application

```
In app/, create a Node.js + Express server (server.js, package.json). It
connects to MongoDB using env var MONGO_URL, and on first run seeds two
products: Laptop priced 1200 and Phone priced 800. Routes: GET / returns an
HTML page listing the products from MongoDB; GET /health returns HTTP 200 JSON.
Add retry logic so the app waits for MongoDB to be ready. Write a Dockerfile
based on node:20-alpine that installs PM2 globally and starts the app with
pm2-runtime. In nginx/ create default.conf, a reverse proxy forwarding port 80
to app:3000. In the project root create docker-compose.yml with three services:
mongo (mongo:7, named volume), app (built from ./app), and nginx (nginx:alpine,
publishes port 80, mounts nginx/default.conf). Put them on one bridge network.
```

### Prompt 3 — Terraform infrastructure

```
In terraform/, write Terraform (AWS provider ~> 5.0, region us-east-1) that
creates: a VPC 10.0.0.0/16; an internet gateway; two public subnets in two
availability zones with map_public_ip_on_launch; a public route table; an ALB
security group allowing port 80 from anywhere; a web security group allowing
port 80 from the ALB SG and port 22 from anywhere; an aws_key_pair from a
variable public_key; two t3.micro EC2 instances using the latest Ubuntu 24.04
AMI (resolve it via the AWS SSM public parameter); an internet-facing
Application Load Balancer with a target group health-checking /health on port
80, attachments for both instances, and an HTTP:80 listener. Variables for
region, project_name, instance_type, instance_count, public_key. Outputs:
instance_public_ips (list) and alb_dns_name. Also add backend.tf configuring an
S3 backend with use_lockfile = true; leave the bucket name as a clear
placeholder I will replace.
```

### Prompt 4 — Ansible

```
In ansible/, write deploy.yml: a playbook targeting host group "web", become
true. Tasks: update apt cache; install docker.io, docker-compose-v2 and git;
enable and start the Docker service; create /opt/ecommerce; copy the app/,
nginx/ folders and docker-compose.yml from the repo into it; run
"docker compose up -d --build" in that directory; then poll http://localhost/health
until it returns 200. Add an ansible.cfg disabling host key checking, and an
inventory.ini.example with ansible_user=ubuntu.
```

### Prompt 5 — The CI/CD pipeline

```
Create .github/workflows/pipeline.yml. Trigger on push to main and on
workflow_dispatch. Job 1 "terraform" (only on push): checkout, setup-terraform,
init, validate, plan, apply -auto-approve; pass AWS creds and TF_VAR_public_key
from secrets; export the instance public IPs as a comma-separated job output.
Job 2 "ansible" (only on push, needs job 1): checkout, install ansible and jq,
write the SSH private key from secret EC2_KEY to key.pem chmod 600, generate
inventory.ini from the IP output with ansible_user=ubuntu, wait for port 22 on
each host, then run ansible-playbook. Job 3 "destroy" (only on workflow_dispatch):
checkout, setup-terraform, init, terraform destroy -auto-approve. Use secrets
AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, EC2_KEY, EC2_PUBLIC_KEY.
```

### Prompt 6 — Review

```
Review the whole project for correctness: confirm the Ansible inventory user
matches the Ubuntu AMI, the ALB health check path matches the app's /health
route, the security groups let the ALB reach the instances, and no secrets are
hardcoded. List any issues and fix them.
```

---

## 5. GitHub repository and secrets

### 5.1 Create the repo and push

```bash
cd ecommerce-devops-lab
git init && git add . && git commit -m "Initial commit: DevOps CI/CD lab"
gh repo create ecommerce-devops-lab --public --source=. --push
# or create it on github.com and: git remote add origin <url> && git push -u origin main
```

> Pushing now will start the pipeline **before** the secrets exist, so it will
> fail — that is fine. Add the secrets (next), then re-run it.

### 5.2 Add the secrets

GitHub → your repo → **Settings → Secrets and variables → Actions → New
repository secret**. Add all five:

| Secret name | Value |
|-------------|-------|
| `AWS_ACCESS_KEY_ID` | IAM access key from Step 3.1 |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key from Step 3.1 |
| `AWS_REGION` | `us-east-1` |
| `EC2_KEY` | **Full contents** of `~/.ssh/ecommerce-lab` (private key) |
| `EC2_PUBLIC_KEY` | **Full contents** of `~/.ssh/ecommerce-lab.pub` (public key) |

Get the key contents to paste:

```bash
cat ~/.ssh/ecommerce-lab        # paste into EC2_KEY
cat ~/.ssh/ecommerce-lab.pub    # paste into EC2_PUBLIC_KEY
```

---

## 6. Run the pipeline

```bash
git commit --allow-empty -m "Trigger pipeline"
git push origin main
```

GitHub → **Actions** tab → open the running workflow. You will see:

1. **Provision Infrastructure** — Terraform creates the VPC, EC2, ALB.
2. **Configure Servers** — Ansible installs Docker and starts the containers.

The **Export instance IPs** step prints the **ALB DNS name** — copy it.

---

## 7. Verify

```
http://<ALB_DNS_NAME>
```

You should see:

> **E-Commerce Store**
> Laptop — $1200
> Phone — $800

Refresh a few times — the "container host" line changes as the ALB balances
across both EC2 instances. That is your proof the load balancer works.

---

## 8. Destroy everything (cost safety — do not skip)

GitHub → **Actions** → select **Full DevOps Pipeline** → **Run workflow** →
choose branch `main` → **Run workflow**. The `destroy` job runs
`terraform destroy` and removes every billable resource.

Confirm in the AWS Console that the EC2 instances and the ALB are gone. The S3
state bucket stays (it costs nothing meaningful) so you can redeploy later.

If you also created the Ubuntu workstation, **stop or terminate it** in the EC2
console.

---

## 9. Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| Terraform: `bucket does not exist` | Bucket name in `backend.tf` wrong or not created (Step 3.4). |
| Terraform: `NoCredentialProviders` | `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` secrets missing or wrong. |
| Ansible: SSH timeout / permission denied | `EC2_KEY` and `EC2_PUBLIC_KEY` are not a matching pair, or port 22 closed. Re-check the security group. |
| ALB shows 502 / 503 | Containers still starting, or health check failing. Wait 2 min; check the app's `/health` route is reachable. |
| Pipeline `terraform` job skipped | You triggered `workflow_dispatch`; that only runs `destroy`. Use `git push` to provision. |
| App page: "Database not ready" | MongoDB container slow to start; the app retries automatically — refresh after a few seconds. |

To debug live with Claude Code:

```
The Ansible job in my GitHub Actions pipeline fails with <paste the error>.
Read .github/workflows/pipeline.yml and ansible/deploy.yml and tell me the
most likely cause and the exact fix.
```

---

## 10. For the validation presentation

The slide deck (`presentation.pptx`) and the spoken script (`SPEECH.md`) are
provided alongside this guide. Before you present:

- Run the pipeline once **before class** so the ALB URL is live during the demo.
- Keep the **Actions** tab open on a green run.
- Keep the **ALB URL** open in a browser tab.
- Be ready to explain one deliberate design choice: the EC2 instances are in
  **public subnets** (not private behind a NAT Gateway as in the lab diagram)
  so the GitHub Actions runner can SSH in for Ansible, and to keep the cost
  near zero. Traffic is still restricted — instances accept HTTP only from the
  ALB security group.
