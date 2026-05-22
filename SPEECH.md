# Validation Speech — DevOps CI/CD Mini-Project

**Total time: ~6 minutes.** One section per slide. Speak naturally — these are
talking points, not a script to read word for word. Pause where you see "[demo]".

> Need this in French? Just ask and I'll translate it.

---

### Slide 1 — Title (~20 sec)

"Good morning. For this Déploiement IaaS lab, I built a fully automated CI/CD
pipeline that takes an application from a Git commit all the way to a running,
load-balanced deployment on AWS — with zero manual steps. I'll walk you through
the architecture, the four tools involved, and then show it running live."

---

### Slide 2 — Objective (~40 sec)

"The goal was to apply Infrastructure as Code and CI/CD end to end. Concretely,
when I push code to the `main` branch, the pipeline does three things on its
own. First, it provisions the cloud infrastructure with Terraform. Second, it
configures the servers with Ansible. Third, it deploys a containerized
e-commerce application. The person pushing the code never touches the AWS
Console — that is the whole point of DevOps automation: the process is
repeatable, version-controlled, and identical every single time."

---

### Slide 3 — Architecture (~55 sec)

"Here is the full picture. A push to GitHub triggers GitHub Actions. The first
stage runs Terraform, which builds a VPC with two subnets across two
availability zones, two EC2 instances, and an Application Load Balancer. The
second stage runs Ansible, which connects over SSH to those instances and
installs Docker. Docker then runs three containers orchestrated by Docker
Compose: Nginx as a reverse proxy, a Node.js application managed by PM2, and a
MongoDB database. Incoming traffic flows from the user, to the load balancer,
to Nginx, to the Node app, to the database. Two instances behind one load
balancer gives me high availability — if one fails, the other still serves
traffic."

---

### Slide 4 — The toolchain (~45 sec)

"Each tool has one clear job. Terraform is Infrastructure as Code — it
*declares* what cloud resources should exist. Ansible is configuration
management — it *configures* what runs on those servers. Docker packages the
application and its dependencies into portable containers. And GitHub Actions
is the orchestrator — it ties the other three together into one automated
pipeline. The key idea is separation of concerns: provisioning, configuration,
and packaging are three distinct problems, each solved by the right tool."

---

### Slide 5 — Terraform (~45 sec)

"Starting with Terraform. Everything you see — the network, the instances, the
load balancer — is defined in declarative `.tf` files committed to the repo.
Two details worth highlighting. First, I store the Terraform state remotely in
an S3 bucket, not on a laptop, so the pipeline can apply the infrastructure in
one run and destroy it in another. Second, I resolve the Ubuntu machine image
dynamically through an AWS parameter, so the project always uses the latest
patched image instead of a hardcoded ID that goes stale."

---

### Slide 6 — Ansible (~40 sec)

"Once the servers exist, Ansible configures them. The challenge here is that
the server IP addresses don't exist until Terraform has finished. So the
pipeline takes Terraform's output, the public IPs, and generates the Ansible
inventory file on the fly. Ansible then connects over SSH and runs an
idempotent playbook: install Docker, install the Compose plugin, copy the
application, and start the containers. Idempotent means I can run it ten times
and the result is always the same — no drift."

---

### Slide 7 — Docker (~40 sec)

"The application itself is fully containerized. Three containers: Nginx,
the Node.js app, and MongoDB, defined in a single Docker Compose file. The
Node container uses PM2 as its process manager, so if the app crashes it
restarts automatically. Containerization means the app behaves identically on
my machine, in the pipeline, and on the EC2 instance — it removes the classic
'it works on my machine' problem entirely."

---

### Slide 8 — GitHub Actions (~45 sec)

"This is what ties it together. The pipeline has three jobs. The Terraform job
provisions the infrastructure. The Ansible job depends on it and only starts
once the infrastructure is ready — it waits for SSH to come up, then deploys.
And a third job, a manual one, tears everything down with a single click,
which keeps cloud costs under control. The whole thing is triggered just by
`git push` — the commit *is* the deployment."

---

### Slide 9 — Live result (~50 sec)

"[demo] Let me show it running. This is the GitHub Actions tab — you can see
the pipeline completed green, both stages. And this is the load balancer URL in
the browser: the e-commerce store, listing the Laptop at 1200 dollars and the
Phone at 800 dollars, served from MongoDB. If I refresh a few times — notice
the host identifier at the bottom changes. That confirms the load balancer is
distributing requests across both EC2 instances. None of this was deployed by
hand: it all came from one push."

---

### Slide 10 — Design decisions & learnings (~45 sec)

"One deliberate design decision: I placed the EC2 instances in public subnets
rather than private subnets behind a NAT Gateway. Two reasons — it lets the
GitHub Actions runner reach them over SSH for Ansible, and it avoids the NAT
Gateway cost. Security is still enforced: the instances accept web traffic only
from the load balancer's security group, never directly from the internet.

The main thing I take away from this lab is how four specialized tools combine
into a single reliable workflow — Infrastructure as Code, configuration
management, containers, and CI/CD. The deployment went from a manual,
error-prone task to one reproducible, version-controlled push. Thank you — I'm
happy to take questions."

---

## Likely questions — quick answers

- **Why two EC2 instances?** High availability and to demonstrate load
  balancing — the ALB spreads traffic across both.
- **What if the professor asks about private subnets?** The lab diagram uses
  private subnets with a NAT Gateway. I chose public subnets so the CI/CD
  runner can SSH in for Ansible and to avoid NAT cost; security is preserved
  through security groups. With more time I'd add a bastion host or use AWS
  SSM Session Manager instead of public IPs.
- **Where is the Terraform state?** In an S3 bucket, with state locking
  enabled, so apply and destroy can run in separate pipeline executions.
- **How do you handle secrets?** AWS keys and the SSH key live in GitHub
  Encrypted Secrets — nothing sensitive is committed to the repo.
- **Is it idempotent?** Yes — re-running Terraform or the Ansible playbook
  converges to the same state without side effects.
- **How much did it cost?** Roughly one to two dollars for a day of testing;
  the manual destroy job removes all billable resources afterward.
