# Borda publica - SDD.md §7.5: "Web App (SPA)" e "API/BFF" sao os UNICOS
# componentes com exposicao publica. TLS, WAF, CSP/HSTS (GUARDRAILS.md #21).
#
# - ALB: recebe API/BFF (NestJS, atras do modules/ecs-service "core")
# - S3 + CloudFront: hospeda o build estatico da SPA React
# - Mesmo dominio para SPA e API/BFF (SDD.md §1.3) via roteamento de path no
#   CloudFront (default origin = S3/SPA; /api/* -> origin ALB)
# - WAFv2 associado tanto ao ALB quanto ao CloudFront

resource "aws_acm_certificate" "this" {
  domain_name       = var.domain_name
  validation_method = "DNS"
  lifecycle {
    create_before_destroy = true
  }
}

# --- WAF ---------------------------------------------------------------------

resource "aws_wafv2_web_acl" "this" {
  name  = "${var.name}-waf"
  scope = "REGIONAL" # associado ao ALB; o CloudFront usa uma replica CLOUDFRONT (ver abaixo)

  default_action {
    allow {}
  }

  rule {
    name     = "aws-managed-common"
    priority = 1
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                 = "${var.name}-common"
      sampled_requests_enabled    = true
    }
  }

  rule {
    name     = "aws-managed-sqli"
    priority = 2
    override_action { none {} }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                 = "${var.name}-sqli"
      sampled_requests_enabled    = true
    }
  }

  # Reforca RN-04 (bloqueio por tentativas malsucedidas) na borda -
  # rate limiting por IP (SDD.md §7.5, "reforça RN-04").
  rule {
    name     = "rate-limit-per-ip"
    priority = 3
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = var.waf_rate_limit_per_5min
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                 = "${var.name}-rate-limit"
      sampled_requests_enabled    = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                 = "${var.name}-waf"
    sampled_requests_enabled    = true
  }

  tags = { Name = "${var.name}-waf" }
}

# --- ALB (API/BFF) -------------------------------------------------------------

resource "aws_lb" "this" {
  name               = "${var.name}-alb"
  internal            = false
  load_balancer_type = "application"
  security_groups     = [var.alb_security_group_id]
  subnets             = var.public_subnet_ids

  drop_invalid_header_fields = true

  tags = { Name = "${var.name}-alb" }
}

resource "aws_lb_target_group" "core" {
  name        = "${var.name}-core-tg"
  port         = var.app_port
  protocol     = "HTTP"
  vpc_id       = var.vpc_id
  target_type = "ip" # Fargate awsvpc

  health_check {
    path                = var.health_check_path
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval             = 15
    timeout               = 5
    matcher               = "200-299"
  }

  deregistration_delay = 30 # drena conexao antes de matar task -> suporta rollback sem corte abrupto

  tags = { Name = "${var.name}-core-tg" }
}

resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.this.arn
  port               = 443
  protocol           = "HTTPS"
  ssl_policy          = "ELBSecurityPolicy-TLS13-1-2-2021-06" # piso TLS 1.2 (GUARDRAILS.md #21), TLS 1.3 preferencial
  certificate_arn     = aws_acm_certificate.this.arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.core.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.this.arn
  port               = 80
  protocol           = "HTTP"

  default_action {
    type = "redirect"
    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_wafv2_web_acl_association" "alb" {
  resource_arn = aws_lb.this.arn
  web_acl_arn  = aws_wafv2_web_acl.this.arn
}

# --- S3 + CloudFront (SPA) ------------------------------------------------------

resource "aws_s3_bucket" "spa" {
  bucket = var.spa_bucket_name
  tags   = { Name = var.spa_bucket_name }
}

resource "aws_s3_bucket_public_access_block" "spa" {
  bucket                  = aws_s3_bucket.spa.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "spa" {
  bucket = aws_s3_bucket.spa.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_cloudfront_origin_access_control" "spa" {
  name                              = "${var.name}-spa-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                   = "always"
  signing_protocol                    = "sigv4"
}

resource "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "${var.name}-security-headers"

  security_headers_config {
    strict_transport_security {
      access_control_max_age_sec = 63072000
      include_subdomains          = true
      preload                      = true
      override                     = true
    }
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override      = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override         = true
    }
    content_security_policy {
      # Baseline restritivo - Frontend/Tech Lead ajustam origem de fontes
      # externas conforme necessidade real (ex.: provedor de e-mail nao se
      # aplica aqui, e so backend-to-backend); CSP nunca "unsafe-inline" para
      # script-src.
      content_security_policy = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://${var.domain_name}; frame-ancestors 'none'"
      override                  = true
    }
  }
}

resource "aws_cloudfront_distribution" "this" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = "PriceClass_100" # America do Sul/Norte/Europa - suficiente para piloto (RNF-09 best-effort)
  web_acl_id          = var.cloudfront_waf_web_acl_arn
  aliases             = [var.domain_name]

  origin {
    domain_name              = aws_s3_bucket.spa.bucket_regional_domain_name
    origin_id                 = "spa-s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.spa.id
  }

  origin {
    domain_name = aws_lb.this.dns_name
    origin_id    = "core-alb"
    custom_origin_config {
      http_port               = 80
      https_port               = 443
      origin_protocol_policy    = "https-only"
      origin_ssl_protocols      = ["TLSv1.2"]
    }
  }

  default_cache_behavior {
    allowed_methods            = ["GET", "HEAD", "OPTIONS"]
    cached_methods               = ["GET", "HEAD"]
    target_origin_id            = "spa-s3"
    viewer_protocol_policy      = "redirect-to-https"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
    compress                     = true

    forwarded_values {
      query_string = false
      cookies { forward = "none" }
    }
  }

  # /api/* -> ALB (API/BFF), mesma dominio da SPA (SDD.md §1.3/§7.5)
  ordered_cache_behavior {
    path_pattern              = "/api/*"
    allowed_methods            = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods               = ["GET", "HEAD"]
    target_origin_id            = "core-alb"
    viewer_protocol_policy      = "https-only"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.security_headers.id
    compress                     = true

    forwarded_values {
      query_string = true
      headers       = ["Authorization", "Cookie", "Content-Type"]
      cookies { forward = "all" } # sessao via cookie HttpOnly/Secure (ADR-007, GUARDRAILS.md #6)
    }
  }

  # SPA client-side routing: 404/403 do S3 caem no index.html
  custom_error_response {
    error_code         = 404
    response_code       = 200
    response_page_path = "/index.html"
  }
  custom_error_response {
    error_code         = 403
    response_code       = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.cloudfront_certificate_arn # certificado us-east-1, exigencia do CloudFront
    ssl_support_method        = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  tags = { Name = "${var.name}-spa-cdn" }
}

data "aws_iam_policy_document" "spa_oac" {
  statement {
    sid     = "AllowCloudFrontOAC"
    effect  = "Allow"
    actions = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.spa.arn}/*"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.this.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "spa" {
  bucket = aws_s3_bucket.spa.id
  policy = data.aws_iam_policy_document.spa_oac.json
}
