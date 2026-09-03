# Servico ECS Fargate generico. Reutilizado por tres instancias distintas
# (environments/*/main.tf):
#   - "core"        -> atras do ALB publico (modules/edge)
#   - "integration"  -> Integration Gateway (Mirth/NextGen Connect), sem ALB,
#                        Service Connect interno apenas
#   - "imaging"      -> Imaging Gateway (Orthanc), sem ALB, Service Connect
#                        interno apenas
#
# GUARDRAILS.md #13: Integration/Imaging Gateway rodam FORA do processo do
# monolito core, nunca embutidos como modulo interno - cada instancia deste
# modulo e uma task definition/service ECS separada.

resource "aws_cloudwatch_log_group" "this" {
  name              = "/ecs/${var.name}"
  retention_in_days = var.log_retention_days
}

resource "aws_iam_role" "execution" {
  name = "${var.name}-ecs-execution-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "execution_managed" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# Execution role so pode ler os secrets explicitamente listados nesta
# instancia do servico - nunca acesso amplo a todo o Secrets Manager.
resource "aws_iam_role_policy" "execution_secrets" {
  count = length(var.secret_arns) > 0 ? 1 : 0
  name  = "${var.name}-read-secrets"
  role  = aws_iam_role.execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["secretsmanager:GetSecretValue"]
      Resource = var.secret_arns
    }]
  })
}

resource "aws_iam_role" "task" {
  name = "${var.name}-ecs-task-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Permissao de aplicacao (ex.: core precisa de acesso ao bucket de Object
# Storage) - concedida via policy_json opcional, escopo minimo definido por
# quem instancia o modulo (principio de menor privilegio).
resource "aws_iam_role_policy" "task_custom" {
  count  = var.task_policy_json != null ? 1 : 0
  name   = "${var.name}-task-custom-policy"
  role   = aws_iam_role.task.id
  policy = var.task_policy_json
}

resource "aws_ecs_task_definition" "this" {
  family                   = var.name
  requires_compatibilities = ["FARGATE"]
  network_mode              = "awsvpc"
  cpu                        = var.cpu
  memory                     = var.memory
  execution_role_arn         = aws_iam_role.execution.arn
  task_role_arn               = aws_iam_role.task.arn

  container_definitions = jsonencode([
    {
      name      = var.name
      image     = var.image
      essential = true
      portMappings = [
        { containerPort = var.container_port, protocol = "tcp" }
      ]
      environment = [
        for k, v in var.environment : { name = k, value = v }
      ]
      secrets = [
        for s in var.secrets : { name = s.name, valueFrom = s.value_from }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.this.name
          "awslogs-region"        = var.aws_region
          "awslogs-stream-prefix" = var.name
        }
      }
      healthCheck = var.container_health_check_command != null ? {
        command     = var.container_health_check_command
        interval    = 30
        timeout      = 5
        retries      = 3
        startPeriod = 60
      } : null
    }
  ])

  tags = { Name = var.name }
}

resource "aws_security_group" "service" {
  name        = "${var.name}-svc-sg"
  description = "SG do servico ECS ${var.name}"
  vpc_id      = var.vpc_id

  ingress {
    description     = "Trafego permitido de origem (ALB ou SG upstream)"
    from_port       = var.container_port
    to_port         = var.container_port
    protocol        = "tcp"
    security_groups = var.allowed_ingress_security_group_ids
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.name}-svc-sg" }
}

resource "aws_ecs_service" "this" {
  name             = var.name
  cluster          = var.cluster_arn
  task_definition   = aws_ecs_task_definition.this.arn
  desired_count     = var.desired_count
  launch_type       = "FARGATE"

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = false # nunca IP publico direto (SDD.md §7.5)
  }

  dynamic "load_balancer" {
    for_each = var.target_group_arn != null ? [1] : []
    content {
      target_group_arn = var.target_group_arn
      container_name    = var.name
      container_port     = var.container_port
    }
  }

  dynamic "service_registries" {
    for_each = var.service_discovery_registry_arn != null ? [1] : []
    content {
      registry_arn = var.service_discovery_registry_arn
    }
  }

  deployment_minimum_healthy_percent = var.deployment_minimum_healthy_percent
  deployment_maximum_percent          = var.deployment_maximum_percent

  # Rollback automatico habilitado no proprio ECS - se o deploy falhar o
  # health check, o servico volta para a task definition anterior estavel.
  # Base tecnica da estrategia de rollback (deployment-execution testa e usa
  # isso antes de qualquer deploy em producao, conforme guardrail de DevOps).
  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [desired_count] # auto-scaling (se configurado) nao deve ser revertido por plan
  }

  tags = { Name = var.name }
}
