output "endpoint" {
  value = aws_db_instance.this.endpoint
}

output "db_name" {
  value = aws_db_instance.this.db_name
}

output "master_username" {
  value = aws_db_instance.this.username
}

output "master_password" {
  value     = random_password.db_master.result
  sensitive = true
}

output "instance_id" {
  value = aws_db_instance.this.id
}
