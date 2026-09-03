output "alb_dns_name" {
  value = aws_lb.this.dns_name
}

output "alb_https_listener_arn" {
  value = aws_lb_listener.https.arn
}

output "core_target_group_arn" {
  value = aws_lb_target_group.core.arn
}

output "cloudfront_domain_name" {
  value = aws_cloudfront_distribution.this.domain_name
}

output "spa_bucket_name" {
  value = aws_s3_bucket.spa.bucket
}

output "waf_web_acl_arn" {
  value = aws_wafv2_web_acl.this.arn
}

output "acm_certificate_arn" {
  value = aws_acm_certificate.this.arn
}
