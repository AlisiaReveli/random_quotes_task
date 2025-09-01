# Simple outputs - just the important information you need

output "app_url" {
  description = "Your app is running at this URL"
  value       = "https://${azurerm_linux_web_app.quotes_app.default_hostname}"
}

output "database_hostname" {
  description = "Database server hostname"
  value       = azurerm_postgresql_flexible_server.quotes_db.fqdn
}

output "redis_hostname" {
  description = "Redis cache hostname"
  value       = azurerm_redis_cache.quotes_cache.hostname
}
