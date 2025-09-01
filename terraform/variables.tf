# Simple variables file - just the essentials

variable "db_password" {
  description = "Password for the PostgreSQL database"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "Secret key for JWT tokens"
  type        = string
  sensitive   = true
}

variable "smtp_url" {
  description = "SMTP server URL for emails"
  type        = string
  default     = "smtp://localhost:587"
}

variable "smtp_from" {
  description = "Email address to send from"
  type        = string
  default     = "no-reply@quotesgame.com"
}
