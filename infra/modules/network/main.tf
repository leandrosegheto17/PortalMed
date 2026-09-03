# Rede privada do Portal de Resultados de Exames.
#
# Camadas de subnet (SDD.md §7.5 — superfície de exposição):
#   public       -> só ALB/NAT; nada de dado nem gateway aqui
#   app          -> ECS da aplicação core (atrás do ALB)
#   data         -> RDS PostgreSQL, ElastiCache Redis — sem rota de saída
#                   à internet, acesso só de dentro da VPC (GUARDRAILS.md #16)
#   integration  -> Integration Gateway (Mirth/NextGen) e Imaging Gateway
#                   (Orthanc) — nunca expostos à internet pública
#                   (SDD.md §7.5, GUARDRAILS.md #14)

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = { Name = "${var.name}-vpc" }
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name}-igw" }
}

# --- Subnets ---------------------------------------------------------------

resource "aws_subnet" "public" {
  count                   = length(var.azs)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = false

  tags = { Name = "${var.name}-public-${var.azs[count.index]}", Camada = "public" }
}

resource "aws_subnet" "app" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.app_subnet_cidrs[count.index]
  availability_zone = var.azs[count.index]

  tags = { Name = "${var.name}-app-${var.azs[count.index]}", Camada = "app" }
}

resource "aws_subnet" "data" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.data_subnet_cidrs[count.index]
  availability_zone = var.azs[count.index]

  tags = { Name = "${var.name}-data-${var.azs[count.index]}", Camada = "data-isolada" }
}

resource "aws_subnet" "integration" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.integration_subnet_cidrs[count.index]
  availability_zone = var.azs[count.index]

  tags = { Name = "${var.name}-integration-${var.azs[count.index]}", Camada = "integration-privada" }
}

# --- NAT (app e integration precisam de saída para atualizações/API externa;
#          data NAO tem NAT — nao precisa de saida para internet) ----------

resource "aws_eip" "nat" {
  count  = length(var.azs)
  domain = "vpc"
  tags   = { Name = "${var.name}-nat-eip-${count.index}" }
}

resource "aws_nat_gateway" "this" {
  count         = length(var.azs)
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id
  tags          = { Name = "${var.name}-nat-${count.index}" }

  depends_on = [aws_internet_gateway.this]
}

# --- Route tables ------------------------------------------------------------

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name}-rt-public" }
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id              = aws_internet_gateway.this.id
}

resource "aws_route_table_association" "public" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table" "app" {
  count  = length(var.azs)
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name}-rt-app-${count.index}" }
}

resource "aws_route" "app_nat" {
  count                  = length(var.azs)
  route_table_id         = aws_route_table.app[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id          = aws_nat_gateway.this[count.index].id
}

resource "aws_route_table_association" "app" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.app[count.index].id
  route_table_id = aws_route_table.app[count.index].id
}

resource "aws_route_table" "integration" {
  count  = length(var.azs)
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name}-rt-integration-${count.index}" }
}

resource "aws_route" "integration_nat" {
  count                  = length(var.azs)
  route_table_id         = aws_route_table.integration[count.index].id
  destination_cidr_block = "0.0.0.0/0"
  nat_gateway_id          = aws_nat_gateway.this[count.index].id
}

resource "aws_route_table_association" "integration" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.integration[count.index].id
  route_table_id = aws_route_table.integration[count.index].id
}

# data subnets: SEM route table de saída à internet (isolada de propósito) --
resource "aws_route_table" "data" {
  vpc_id = aws_vpc.this.id
  tags   = { Name = "${var.name}-rt-data-sem-rota-internet" }
}

resource "aws_route_table_association" "data" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.data[count.index].id
  route_table_id = aws_route_table.data.id
}

# --- Security Groups ---------------------------------------------------------

resource "aws_security_group" "alb" {
  name        = "${var.name}-sg-alb"
  description = "Borda publica (SPA/API-BFF) - 443 apenas, TLS 1.2 piso (GUARDRAILS.md #21)"
  vpc_id      = aws_vpc.this.id

  ingress {
    description = "HTTPS publico"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.name}-sg-alb" }
}

resource "aws_security_group" "app" {
  name        = "${var.name}-sg-app"
  description = "Aplicacao core (NestJS) - so recebe do ALB"
  vpc_id      = aws_vpc.this.id

  ingress {
    description     = "Trafego do ALB"
    from_port       = var.app_port
    to_port         = var.app_port
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.name}-sg-app" }
}

resource "aws_security_group" "data" {
  name        = "${var.name}-sg-data"
  description = "PostgreSQL/Redis - rede privada apenas (GUARDRAILS.md #16, SDD.md #7.5)"
  vpc_id      = aws_vpc.this.id

  ingress {
    description     = "Postgres a partir da aplicacao core"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id, aws_security_group.integration.id]
  }

  ingress {
    description     = "Redis a partir da aplicacao core"
    from_port       = 6379
    to_port         = 6379
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.name}-sg-data" }
}

resource "aws_security_group" "integration" {
  name        = "${var.name}-sg-integration"
  description = "Integration Gateway (HL7/FHIR) e Imaging Gateway (DICOM) - nunca expostos a internet publica (GUARDRAILS.md #14)"
  vpc_id      = aws_vpc.this.id

  # Canal MLLP/FHIR dedicado do hospital - restrito por CIDR, so quando
  # o protocolo real do piloto (P1) for confirmado.
  dynamic "ingress" {
    for_each = var.enable_hospital_channel && var.hospital_vpn_cidr != null ? [1] : []
    content {
      description = "Canal HL7 v2.x MLLP / FHIR R4 dedicado ao hospital piloto"
      from_port   = 6661
      to_port     = 6661
      protocol    = "tcp"
      cidr_blocks = [var.hospital_vpn_cidr]
    }
  }

  # DICOM C-STORE do PACS do hospital - restrito por CIDR, mesma condicao.
  dynamic "ingress" {
    for_each = var.enable_hospital_channel && var.dicom_source_cidr != null ? [1] : []
    content {
      description = "DICOM C-STORE (PACS do hospital piloto) - Imaging Gateway"
      from_port   = 4242
      to_port     = 4242
      protocol    = "tcp"
      cidr_blocks = [var.dicom_source_cidr]
    }
  }

  # Comunicacao interna com a aplicacao core (POST /internal/ingest,
  # notificacao de conversao) - autenticada por API key de servico dedicada
  # (BE-09), nunca aberta ao ALB publico.
  ingress {
    description     = "Aplicacao core chamando de volta (health check/orquestracao interna)"
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.app.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.name}-sg-integration" }
}

# app -> integration (aplicacao core chama /internal/ingest do Integration
# Gateway e recebe notificacao do Imaging Gateway), autenticado por API key
# de servico (BE-09) sobre este caminho de rede interno.
resource "aws_security_group_rule" "app_to_integration" {
  type                     = "egress"
  from_port                = 0
  to_port                  = 65535
  protocol                 = "tcp"
  security_group_id        = aws_security_group.app.id
  source_security_group_id = aws_security_group.integration.id
  description               = "Aplicacao core -> Integration/Imaging Gateway (rede interna)"
}
