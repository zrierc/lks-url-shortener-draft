resource "aws_lb" "main" {
  name               = "lks-url-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [var.alb_sg_id]
  subnets            = var.public_subnet_ids

  tags = {
    Name    = "lks-url-alb"
    Project = "lks-url"
  }
}

# Target group: frontend (port 80)
resource "aws_lb_target_group" "frontend" {
  name        = "lks-url-tg-frontend"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
  }

  tags = {
    Name    = "lks-url-tg-frontend"
    Project = "lks-url"
  }
}

# Target group: shortener-api (port 3000)
resource "aws_lb_target_group" "api" {
  name        = "lks-url-tg-api"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/health"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
  }

  tags = {
    Name    = "lks-url-tg-api"
    Project = "lks-url"
  }
}

# Target group: analytics-svc (port 3001)
resource "aws_lb_target_group" "analytics" {
  name        = "lks-url-tg-analytics"
  port        = 3001
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/api/health"
    protocol            = "HTTP"
    matcher             = "200"
    interval            = 30
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
  }

  tags = {
    Name    = "lks-url-tg-analytics"
    Project = "lks-url"
  }
}

# HTTP listener on port 80
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  # Default rule → frontend
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Priority 1: /api/stats* → analytics-svc  (MUST be before /api/*)
resource "aws_lb_listener_rule" "analytics" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 1

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.analytics.arn
  }

  condition {
    path_pattern {
      values = ["/api/stats*"]
    }
  }
}

# Priority 2: /api/* → shortener-api
resource "aws_lb_listener_rule" "api" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 2

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/api/*"]
    }
  }
}

# Priority 3: /s/* → shortener-api (short-code redirects)
resource "aws_lb_listener_rule" "redirect" {
  listener_arn = aws_lb_listener.http.arn
  priority     = 3

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  condition {
    path_pattern {
      values = ["/s/*"]
    }
  }
}
