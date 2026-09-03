# Fundacao de observabilidade (SDD.md RNF-10: "monitoramento basico de erros
# /desempenho", cobre RF-06/RF-07/RF-14 e login/MFA). Afinacao completa de
# dashboards/alertas por metrica de produto e responsabilidade da skill
# observability-setup, que roda DEPOIS da dupla aprovacao, sobre o build real
# — aqui so a fundacao de infraestrutura (topico SNS, alarmes de plataforma
# minimos) para que a etapa seguinte tenha onde plugar.

resource "aws_sns_topic" "alerts" {
  name = "${var.name}-alerts"
}

resource "aws_sns_topic_subscription" "email" {
  count     = var.alert_email != null ? 1 : 0
  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = var.alert_email
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "${var.name}-rds-cpu-alta"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name          = "CPUUtilization"
  namespace             = "AWS/RDS"
  period                = 60
  statistic              = "Average"
  threshold              = 80
  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }
  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions     = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "rds_storage_baixo" {
  alarm_name          = "${var.name}-rds-storage-baixo"
  comparison_operator = "LessThanThreshold"
  evaluation_periods  = 1
  metric_name          = "FreeStorageSpace"
  namespace             = "AWS/RDS"
  period                = 300
  statistic              = "Average"
  threshold              = var.rds_free_storage_threshold_bytes
  dimensions = {
    DBInstanceIdentifier = var.rds_instance_id
  }
  alarm_actions = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "redis_indisponivel" {
  alarm_name          = "${var.name}-redis-cpu-alta"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name          = "EngineCPUUtilization"
  namespace             = "AWS/ElastiCache"
  period                = 60
  statistic              = "Average"
  threshold              = 80
  dimensions = {
    ReplicationGroupId = var.redis_replication_group_id
  }
  alarm_actions = [aws_sns_topic.alerts.arn]
  # SDD.md §6.1: Redis indisponivel = severidade Alta (bloqueia toda sessao) -
  # alarme dedicado, nao so metrica generica de CPU.
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_name          = "${var.name}-alb-5xx-alto"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name          = "HTTPCode_Target_5XX_Count"
  namespace             = "AWS/ApplicationELB"
  period                = 60
  statistic              = "Sum"
  threshold              = var.alb_5xx_threshold
  dimensions = {
    LoadBalancer = var.alb_arn_suffix
  }
  alarm_actions = [aws_sns_topic.alerts.arn]
  treat_missing_data = "notBreaching"
}

resource "aws_cloudwatch_metric_alarm" "ecs_core_cpu" {
  alarm_name          = "${var.name}-ecs-core-cpu-alta"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name          = "CPUUtilization"
  namespace             = "AWS/ECS"
  period                = 60
  statistic              = "Average"
  threshold              = 85
  dimensions = {
    ClusterName = var.ecs_cluster_name
    ServiceName  = var.ecs_core_service_name
  }
  alarm_actions = [aws_sns_topic.alerts.arn]
}
