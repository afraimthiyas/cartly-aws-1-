# AWS Deployment – Cartly

Cartly is deployed on **Amazon Web Services (AWS)** using an Amazon EC2 instance, Ubuntu 24.04 LTS, and Docker Compose.

## AWS Architecture

- **Cloud Provider:** Amazon Web Services (AWS)
- **Compute:** Amazon EC2
- **Operating System:** Ubuntu Server 24.04 LTS
- **Containerization:** Docker
- **Orchestration:** Docker Compose
- **Frontend:** React + Vite
- **Backend:** Node.js REST API
- **Database:** SQL Database
- **Networking:** AWS Security Groups
- **Web Access:** HTTP (Port 80)
- **Secure Access:** HTTPS (Port 443, with SSL certificate configuration)

## Deployment Process

1. Created an Ubuntu EC2 instance on AWS.
2. Configured the EC2 security group to allow SSH, HTTP, and HTTPS traffic.
3. Connected to the EC2 instance using SSH.
4. Installed Docker, Docker Compose, and Git.
5. Cloned the Cartly GitHub repository.
6. Configured production environment variables.
7. Built and launched the application using Docker Compose.
8. Verified the frontend, backend API, and database services.
9. Configured public access through the EC2 instance.

## Deployment Commands

```bash
# Clone the repository
git clone https://github.com/afraimthiyas/cartly-aws-1-.git

# Navigate to the project
cd cartly-aws-1-/cartly

# Configure environment variables
cp server/.env.example server/.env
nano server/.env

# Build and start the application
docker compose up -d --build

# Check running containers
docker compose ps

# View application logs
docker compose logs -f
```

## Application Access

```text
Frontend: http://YOUR_EC2_PUBLIC_IP
Backend:  http://YOUR_EC2_PUBLIC_IP/YOUR_API_PATH
```

Replace the placeholders with the actual deployed URLs and API route.

## Updating the Deployment

```bash
git pull
docker compose up -d --build
```

## Security

- Used AWS Security Groups to restrict network access.
- Restricted SSH access to the administrator's IP address.
- Kept database access private.
- Stored production environment variables separately from source code.
- Avoided committing AWS credentials, private keys, and `.env` files to GitHub.

## Future Improvements

- Amazon RDS for managed database hosting.
- Amazon S3 for product image storage.
- Amazon CloudFront for content delivery.
- AWS Application Load Balancer.
- HTTPS with Let's Encrypt or AWS Certificate Manager.

**Project Repository:** https://github.com/afraimthiyas/cartly-aws-1-

**Cloud Platform:** Amazon Web Services (AWS)# cartly-aws-1-
