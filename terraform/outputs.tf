# Public IPs of the web instances - consumed by the Ansible job in the pipeline
output "instance_public_ips" {
  description = "Public IP addresses of the web EC2 instances"
  value       = aws_instance.web[*].public_ip
}

# Public DNS of the load balancer - this is the URL of the running store
output "alb_dns_name" {
  description = "Public DNS name of the Application Load Balancer"
  value       = aws_lb.app.dns_name
}
