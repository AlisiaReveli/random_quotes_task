#!/bin/bash

# Simple deployment script for beginners
# This script will help you deploy your Quotes Game to Azure

set -e

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Simple Azure Deployment for Quotes Game${NC}"
echo -e "${YELLOW}This script will help you deploy your app to Azure step by step.${NC}"
echo ""

# Step 1: Check prerequisites
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    echo -e "${RED}❌ Azure CLI is not installed.${NC}"
    echo "Please install it from: https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
fi
echo -e "${GREEN}✅ Azure CLI is installed${NC}"

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo -e "${RED}❌ Terraform is not installed.${NC}"
    echo "Please install it from: https://www.terraform.io/downloads.html"
    exit 1
fi
echo -e "${GREEN}✅ Terraform is installed${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed.${NC}"
    echo "Please install it from: https://docs.docker.com/get-docker/"
    exit 1
fi
echo -e "${GREEN}✅ Docker is installed${NC}"

echo ""

# Step 2: Azure Login
echo -e "${YELLOW}Step 2: Logging into Azure...${NC}"
if ! az account show &> /dev/null; then
    echo "Please log in to your Azure account..."
    az login
else
    echo -e "${GREEN}✅ Already logged into Azure${NC}"
fi

echo "Current Azure subscription:"
az account show --query "name" -o tsv
echo ""

echo -e "${YELLOW}Step 3: Setting up configuration...${NC}"

cd terraform

if [ ! -f "terraform.tfvars" ]; then
    echo "Creating terraform.tfvars file..."
    cp terraform.tfvars.example terraform.tfvars
    
    echo -e "${RED}⚠️  IMPORTANT: Please edit terraform.tfvars with your actual values!${NC}"
    echo "You need to set:"
    echo "  - db_password: A strong password for your database"
    echo "  - jwt_secret: A random secret key for JWT tokens"
    echo ""
    echo "Press Enter when you've updated terraform.tfvars..."
    read
else
    echo -e "${GREEN}✅ terraform.tfvars already exists${NC}"
fi

# Step 4: Initialize Terraform
echo -e "${YELLOW}Step 4: Initializing Terraform...${NC}"
terraform init

# Step 5: Plan deployment
echo -e "${YELLOW}Step 5: Planning deployment...${NC}"
terraform plan

echo ""
echo -e "${YELLOW}This will create the following Azure resources:${NC}"
echo "  📦 Resource Group (folder for all resources)"
echo "  🗄️  PostgreSQL Database (for your quotes and users)"
echo "  🚀 Redis Cache (for cooldown system)"
echo "  💻 App Service Plan (server to run your app)"
echo "  🌐 Web App (where your app will run)"
echo ""

# Step 6: Deploy
echo -e "${YELLOW}Do you want to deploy these resources? (y/N)${NC}"
read -r response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
    echo -e "${YELLOW}Step 6: Deploying to Azure...${NC}"
    terraform apply -auto-approve
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed!${NC}"
    
    # Get the app URL
    APP_URL=$(terraform output -raw app_url)
    echo -e "${GREEN}Your app will be available at: ${APP_URL}${NC}"
    echo -e "${GREEN}API Documentation: ${APP_URL}/docs${NC}"
    
    # Go back to project root
    cd ../..
    
    # Step 7: Build and deploy Docker image
    echo ""
    echo -e "${YELLOW}Step 7: Building and deploying your app...${NC}"
    
    # Build the Docker image
    echo "Building Docker image..."
    docker build -t quotes-game:latest .
    
    # For now, we'll use a simple approach - you can push to Docker Hub
    echo ""
    echo -e "${YELLOW}To complete the deployment, you need to:${NC}"
    echo "1. Push your Docker image to Docker Hub:"
    echo "   docker tag quotes-game:latest your-dockerhub-username/quotes-game:latest"
    echo "   docker push your-dockerhub-username/quotes-game:latest"
    echo ""
    echo "2. Update the Docker image name in terraform/main.tf:"
    echo "   Change 'your-dockerhub-username/quotes-game:latest' to your actual Docker Hub username"
    echo ""
    echo "3. Run 'terraform apply' again to update the web app"
    
else
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi
