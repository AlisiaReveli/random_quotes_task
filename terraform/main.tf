# Simple Azure setup for Quotes Game
# This is a beginner-friendly version with just the essentials

terraform {
  required_version = ">= 1.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~>3.0"
    }
  }
}

# Configure Azure Provider
provider "azurerm" {
  features {}
}

# 1. Create a Resource Group (like a folder for all your Azure resources)
resource "azurerm_resource_group" "quotes_game" {
  name     = "quotes-game-rg"
  location = "East US"  # You can change this to your preferred location

  tags = {
    Project = "Quotes Game"
    Environment = "Production"
  }
}

# 2. Create a PostgreSQL Database (managed by Azure)
resource "azurerm_postgresql_flexible_server" "quotes_db" {
  name                   = "quotes-game-db"
  resource_group_name    = azurerm_resource_group.quotes_game.name
  location               = azurerm_resource_group.quotes_game.location
  version                = "15"
  administrator_login    = "quotesadmin"
  administrator_password = var.db_password  # We'll set this in variables
  
  # Small, cost-effective configuration
  storage_mb = 32768  # 32GB
  sku_name   = "GP_Standard_D2s_v3"  # Small size for cost savings

  # Basic backup settings
  backup_retention_days = 7
  geo_redundant_backup_enabled = false

  tags = {
    Project = "Quotes Game"
  }
}

# 3. Create the actual database inside the server
resource "azurerm_postgresql_flexible_server_database" "quotes_db" {
  name      = "quotes_db"
  server_id = azurerm_postgresql_flexible_server.quotes_db.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# 4. Create Redis Cache (for your cooldown system)
resource "azurerm_redis_cache" "quotes_cache" {
  name                = "quotes-game-cache"
  location            = azurerm_resource_group.quotes_game.location
  resource_group_name = azurerm_resource_group.quotes_game.name
  capacity            = 1
  family              = "C"
  sku_name            = "Standard"  # Basic Redis cache
  enable_non_ssl_port = false

  tags = {
    Project = "Quotes Game"
  }
}

# 5. Create App Service Plan (the "server" that runs your app)
resource "azurerm_service_plan" "quotes_app" {
  name                = "quotes-game-plan"
  resource_group_name = azurerm_resource_group.quotes_game.name
  location            = azurerm_resource_group.quotes_game.location
  os_type             = "Linux"
  sku_name            = "B1"  # Basic plan - cost effective

  tags = {
    Project = "Quotes Game"
  }
}

# 6. Create the Web App (where your Node.js app will run)
resource "azurerm_linux_web_app" "quotes_app" {
  name                = "quotes-game-app"
  resource_group_name = azurerm_resource_group.quotes_game.name
  location            = azurerm_service_plan.quotes_app.location
  service_plan_id     = azurerm_service_plan.quotes_app.id

  # Configure the app to run your Docker container
  site_config {
    application_stack {
      docker_image     = "your-dockerhub-username/quotes-game:latest"
      docker_image_tag = "latest"
    }
  }

  # Environment variables for your app
  app_settings = {
    "NODE_ENV"                    = "production"
    "PORT"                        = "3000"
    "DATABASE_URL"                = "postgresql://quotesadmin:${var.db_password}@${azurerm_postgresql_flexible_server.quotes_db.fqdn}:5432/quotes_db?sslmode=require"
    "REDIS_URL"                   = "rediss://:${azurerm_redis_cache.quotes_cache.primary_access_key}@${azurerm_redis_cache.quotes_cache.hostname}:6380"
    "SECRET"                      = var.jwt_secret
    "JWT_EXPIRATION"              = "1h"
    "EMAIL_THRESHOLD"             = "3"
    "COOLDOWN_TIME"               = "43200"
    "SMTP_URL"                    = var.smtp_url
    "SMTP_FROM"                   = var.smtp_from
    "LOG_LEVEL"                   = "info"
  }

  tags = {
    Project = "Quotes Game"
  }
}
