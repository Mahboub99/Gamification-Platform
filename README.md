<div align="center">
<a href="https://github.com/Mahboub99/Gamification-Platform" rel="noopener">
  
  <img width="700" alt="Gamification Platform" src="./Gamification-Platform.png">

</div>

<h2 align="center">🎮 Gamification Platform</h2>

<div align="center">

[![GitHub contributors](https://img.shields.io/github/contributors/Mahboub99/Gamification-Platform)](https://github.com/Mahboub99/Gamification-Platform/contributors)
[![GitHub issues](https://img.shields.io/github/issues/Mahboub99/Gamification-Platform)](https://github.com/Mahboub99/Gamification-Platform/issues)
[![GitHub forks](https://img.shields.io/github/forks/Mahboub99/Gamification-Platform)](https://github.com/Mahboub99/Gamification-Platform/network)
[![GitHub stars](https://img.shields.io/github/stars/Mahboub99/Gamification-Platform)](https://github.com/Mahboub99/Gamification-Platform/stargazers)
[![GitHub license](https://img.shields.io/github/license/Mahboub99/Gamification-Platform)](https://github.com/Mahboub99/Gamification-Platform/blob/master/LICENSE)
<img src="https://img.shields.io/github/languages/count/Mahboub99/Gamification-Platform" />
<img src="https://img.shields.io/github/languages/top/Mahboub99/Gamification-Platform" />
<img src="https://img.shields.io/github/languages/code-size/Mahboub99/Gamification-Platform" />
<img src="https://img.shields.io/github/issues-pr-raw/Mahboub99/Gamification-Platform" />

</div>

A comprehensive gamification engine built with Node.js, React, and PostgreSQL. This platform provides a complete solution for implementing gamification features in e-learning, e-commerce, or any web application.

**Runs with a single `docker-compose up`.**

**Features:** Point system, level progression, badge management, leaderboards, real-time updates, and admin dashboard.

---
## IMPORTANT NOTE

- the app have both user view and admin view 
- by default (one the backend starts ) some data is seeded to data base 
- those are 2 accounts for testing that you can use 
- admin 
  ```
    email: 'user.admin@ejada.com',
    password: 'root123',
  ```
- user 
  ```
    email: 'user1@ejada.com',
    password: 'root123',
  ```
## 📋 Table of Contents

- [Manual Setup](#-manual-setup)
- [Docker Setup](#-docker-setup)
- [System Architecture](#️-system-architecture)
- [Database Design](#️-database-design)
- [Backend API](#-backend-api)
- [Frontend Features](#-frontend-features)
- [Task Structure](#-task-structure)

--- 

## Manual Setup

### Prerequisites
- Node.js 18+ 
- PostgreSQL 15+
- Docker (for containerized setup)



### Environment Configuration

#### Backend (.env)
```env
# Database Configuration
DATABASE_URL="postgresql://root:root@localhost:5432/gamification"

# Server Configuration
PORT=8000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-2024
JWT_EXPIRES_IN=7d

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Redis Configuration (Optional)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=debug

# API Configuration
API_PREFIX=/api/v1
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your-session-secret-key

# Development
DEBUG=true
ENABLE_SWAGGER=true
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

#### 1. Database Setup
```bash
# Install PostgreSQL
# Download from: https://www.postgresql.org/download/

# Create database
createdb gamification

# Copy environment file
cp backend/env.example backend/.env

# Update database URL in .env file
DATABASE_URL="postgresql://username:password@localhost:5432/gamification"
```

#### 2. Backend Setup
```bash
cd backend
npm install
npm start

# API Documentation
# Swagger UI: http://localhost:8000/api-docs
# API Base URL: http://localhost:8000/api/v1
```

#### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev

# Frontend Application
# URL: http://localhost:3000
```

---- 

## Docker Setup

### Services Overview

| Service | Port | Description |
|---------|------|-------------|
| **Frontend** | 3000 | Next.js React Application |
| **Backend** | 8000 | Node.js Express API |
| **PostgreSQL** | 5432 | Database |

### Docker Commands

#### Windows
```bash
# Start all services
docker-run.bat start

# Stop all services
docker-run.bat stop

# View logs
docker-run.bat logs

# Check status
docker-run.bat status
```

#### Linux/Mac
```bash
# Start all services
./docker-run.sh start

# Stop all services
./docker-run.sh stop

# View logs
./docker-run.sh logs

# Check status
./docker-run.sh status
```

---
## System Architecture


### Business Logic & Thinking Process

The core of the gamification engine is designed to make user engagement both rewarding and dynamic. A point system lets users earn points for specific actions, such as completing tasks or participating in activities. As points accumulate, users unlock new levels, creating a sense of progression and achievement. Badges are awarded based on defined criteria, celebrating milestones and encouraging continued participation. Leaderboards introduce a competitive element, with rankings that can be updated daily, weekly, or monthly to keep things fresh and motivating.

The typical user engagement flow starts when a user performs an action. This triggers a point award, followed by a check to see if the user qualifies for a new level or badge. If so, the system updates the user’s status and reflects these changes on the leaderboard. For example, after completing a course, a user might earn points, level up, unlock a badge, and see their ranking improve—all in one seamless flow.

Multi-tenancy support ensures that each client, whether it’s a school, business, or community, has its own private data space. This means information stays separate and secure for every tenant. Rules can be customized, so one client might set different point values or badge requirements than another. Branding is also flexible, allowing each tenant to have their own themes and logos for a unique experience.

Scalability is addressed through several strategies. Redis caching can be used for frequently accessed data like leaderboards and user statistics, improving performance and responsiveness. Asynchronous processing with message queues helps handle point calculations and other background tasks efficiently. Database optimization is possible with indexed queries and materialized views, supporting fast and reliable data access even as the platform grows.

### Reusable Modules

To keep the architecture maintainable and extensible, several reusable modules can be introduced. The Badge Service manages badge creation, assignment, and validation. The Point Engine handles all point calculations and level progression logic. The Leaderboard Service generates and maintains competitive rankings, while the Notification Service sends alerts for achievements and milestones. An Analytics Service tracks user engagement and overall system performance, providing valuable insights for continuous improvement.

## Database Design

### Entity Relationship Diagram


  ![Image](https://github-production-user-asset-6210df.s3.amazonaws.com/43186742/473838902-7fc8368d-2234-4a16-9c35-4180364629b9.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250804%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250804T014530Z&X-Amz-Expires=300&X-Amz-Signature=be4d7a042c888a06ade1a71da25ab8f87575cb0ce5c3555eefc71a69d2d4650f&X-Amz-SignedHeaders=host)

  ![Image](https://github-production-user-asset-6210df.s3.amazonaws.com/43186742/473839567-548ea36b-87b8-43b9-b62e-8e2643072a12.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250804%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250804T014953Z&X-Amz-Expires=300&X-Amz-Signature=a618ebf614f8be046e05aa0b5635367d6edf4acbcfda32b4fe69280d69643a72&X-Amz-SignedHeaders=host)


## 🔌 Backend API

### API Documentation

**Swagger UI**: http://localhost:8000/api-docs  
**API Base URL**: http://localhost:8000/api/v1

### swagger 
  ![Image](https://github-production-user-asset-6210df.s3.amazonaws.com/43186742/473840686-71a2cc0c-af5b-4eac-9ffa-37d9ecfda179.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250804%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250804T015631Z&X-Amz-Expires=300&X-Amz-Signature=360a050937a3971a0d97f4c2f3b00cd069da0b58d25cb8ab9c62eeec4e895358&X-Amz-SignedHeaders=host)

### Authentication Endpoints

```
POST   /api/v1/auth/register     - Register new user
POST   /api/v1/auth/login        - User login
POST   /api/v1/auth/logout       - User logout
GET    /api/v1/auth/profile      - Get user profile
PUT    /api/v1/auth/profile      - Update user profile
```

### User Management

```
GET    /api/v1/users             - Get all users (admin)
GET    /api/v1/users/:id         - Get user by ID
PUT    /api/v1/users/:id         - Update user
DELETE /api/v1/users/:id         - Delete user (admin)
```

### Gamification Endpoints

```
POST   /api/v1/actions/complete  - Complete an action
GET    /api/v1/actions           - Get all actions
GET    /api/v1/badges            - Get all badges
GET    /api/v1/badges/:id        - Get badge details
GET    /api/v1/levels            - Get all levels
GET    /api/v1/leaderboard       - Get leaderboard
```

### Points & Progress

```
GET    /api/v1/users/:id/points  - Get user points history
GET    /api/v1/users/:id/badges  - Get user badges
GET    /api/v1/users/:id/level   - Get user level info
POST   /api/v1/points/award      - Award points to user
```

### Admin Endpoints

```
POST   /api/v1/admin/badges      - Create new badge
PUT    /api/v1/admin/badges/:id  - Update badge
DELETE /api/v1/admin/badges/:id  - Delete badge
POST   /api/v1/admin/actions     - Create new action
PUT    /api/v1/admin/actions/:id - Update action
DELETE /api/v1/admin/actions/:id - Delete action
```

### Error Handling

The API uses standard HTTP status codes and returns consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "field": "email",
      "reason": "Email is required"
    }
  }
}
```

## 🎨 Frontend Features

### Dashboard Overview

The frontend provides a comprehensive admin/user dashboard with the following features:

#### **login** 
  ![Image](https://github-production-user-asset-6210df.s3.amazonaws.com/43186742/473841088-112740c3-be34-47b3-9cbf-2066b3d4d076.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250804%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250804T020044Z&X-Amz-Expires=300&X-Amz-Signature=fb1a29c6e39a33755f81d6199f3137ac818e180f94c6a8738358c200fa4bfc39&X-Amz-SignedHeaders=host)

#### **Analytics Dashboard**

  #### user 

  ![Image](https://github-production-user-asset-6210df.s3.amazonaws.com/43186742/473841095-0a7e9400-7fdb-4e4b-ba17-883db4d42e00.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250804%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250804T020139Z&X-Amz-Expires=300&X-Amz-Signature=fc09fcc69f7df83c48f0b9b196de10940a6e4ba6e55c8e23dfdddf2403ed388c&X-Amz-SignedHeaders=host)

  #### admin 
  ![Image](https://github-production-user-asset-6210df.s3.amazonaws.com/43186742/473845419-7c59fbb4-611a-49d1-b764-c3e6d005af6c.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250804%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250804T022420Z&X-Amz-Expires=300&X-Amz-Signature=83cfd14066c51bd63d59491e0ddeefab7c047cb89e7b87ee320a5049e41f34c6&X-Amz-SignedHeaders=host)


#### **Leaderboard System**
  ![Image](https://github-production-user-asset-6210df.s3.amazonaws.com/43186742/473844798-ffa8eba0-0a53-4e78-bf0f-4e1de3d18bb7.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250804%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250804T022102Z&X-Amz-Expires=300&X-Amz-Signature=f7ff31e46d95e5b62b3cfa475630a8640b8571a68a6d0fb40fa522e67a242729&X-Amz-SignedHeaders=host)

#### **Activity Tracking**
  ![Image](https://github-production-user-asset-6210df.s3.amazonaws.com/43186742/473845829-3aad26d5-86ee-4d7d-9e70-0f8942e4112d.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250804%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250804T022633Z&X-Amz-Expires=300&X-Amz-Signature=bf9503785d56563338dd01aa5dfab6e8782730bae35c87d049911d448a9df6ca&X-Amz-SignedHeaders=host)


#### **Badge Management**
  ![Image](https://github-production-user-asset-6210df.s3.amazonaws.com/43186742/473848314-e3ee6e55-08d6-4986-87b9-9342a754cc6b.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250804%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250804T023852Z&X-Amz-Expires=300&X-Amz-Signature=3453a8f8d7b4ddcfdd481bdbe64a2dcf9657a41337d93e5fec7fc9f555fa013f&X-Amz-SignedHeaders=host)

#### **Achievement Management**
  ![Image](https://github-production-user-asset-6210df.s3.amazonaws.com/43186742/473848775-baea9d18-c546-42db-a6e4-9f378e53d47b.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250804%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250804T024054Z&X-Amz-Expires=300&X-Amz-Signature=ae7055eb1ce1a890daf24d6128bdda65c0e3bf45f6cc187cef8f386acdd11e52&X-Amz-SignedHeaders=host)


#### **Level Management**
  ![Image](https://github-production-user-asset-6210df.s3.amazonaws.com/43186742/473849287-dd691fa7-4882-4235-b0a1-4a4c229ef257.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250804%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250804T024349Z&X-Amz-Expires=300&X-Amz-Signature=acc7b2de86d27d3db42a97b779be33409a79675c9347e12c774e5edeed3eb67d&X-Amz-SignedHeaders=host)


#### **Users  Management**
  ![Image](https://github-production-user-asset-6210df.s3.amazonaws.com/43186742/473849589-417dbef7-c6b6-4120-b5d2-ad71fbceb5a9.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250804%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250804T024542Z&X-Amz-Expires=300&X-Amz-Signature=ed78c87993e4052d90d0773fd83fcbdf412a37987aba27d4f98636ab72e6c28f&X-Amz-SignedHeaders=host)

#### **User Profile Page**
  ![Image](https://github-production-user-asset-6210df.s3.amazonaws.com/43186742/473850673-f200e889-b9b2-426f-9091-8a022ef3f95c.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250804%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250804T025131Z&X-Amz-Expires=300&X-Amz-Signature=9fe78f8c929fc864e65029557e0ad3d5a1ccba336403969bce6a5633113ec332&X-Amz-SignedHeaders=host)


---

##  Task Structure & Implementation Guide

### **Section 1: Leadership & System Design**

####  **1.1 System Architecture** 

##### Multi-Tenancy Support

Multi-tenancy support means that every client—whether it’s a school, a business, or a community—gets their own private data space, so information stays separate and secure. For example, a fitness app and an e-learning platform could both use the system, but each would have its own users, points, badges, and rules. It’s easy to set up different point values or badge requirements for each tenant, so one client might reward users for daily logins while another focuses on course completions. Branding is also fully customizable, allowing each tenant to have their own colors, logos, and themes for a unique look and feel. Onboarding new tenants is simple and fast, thanks to automated, API-driven processes that handle everything from account creation to initial setup—making it easy to get started without manual intervention.

##### Reusable Modules

A modular approach is used to keep the system maintainable and extensible. The Badge Service manages badge creation, assignment, and validation, while the Point Engine is responsible for point calculations and level progression. The Leaderboard Service generates and maintains competitive rankings, and the Notification Service sends alerts for achievements and milestones. An Analytics Service tracks user engagement and overall system performance, providing valuable insights.

##### Scalable Design Features

Scalability can be achieved through several architectural choices. Redis caching can be used for frequently accessed data like leaderboards and user statistics, which helps improve performance and responsiveness. Asynchronous processing with message queues is useful for handling point calculations and other background tasks efficiently. Database optimization can be accomplished with indexed queries and materialized views, supporting fast and reliable data access. Horizontal scaling with load balancing is another approach to handle increased traffic

#### **1.2 Engineering Practices & Team Management**


Effective engineering practices and team management are essential for delivering high-quality software. Ensuring consistent code quality starts with adopting TypeScript across both the frontend and backend, providing type safety throughout the codebase. Automated tools like ESLint and Prettier are used for code formatting and linting, helping maintain a clean and uniform style. Code reviews are a standard part of the workflow, with every pull request reviewed by at least one team member to catch issues early and encourage knowledge sharing. A robust testing strategy is in place, combining unit tests for business logic with integration tests for APIs to ensure reliability.

DevOps practices play a crucial role in maintaining a smooth development and deployment process. Docker containerization is used so that all components run in consistent environments, reducing the risk of environment-specific bugs. Automated CI/CD pipelines handle testing and deployment, while environment parity ensures that development, staging, and production environments are identical. Infrastructure as code, such as Docker Compose, makes local development setup straightforward. Continuous monitoring through health checks and performance metrics helps quickly identify and resolve issues.

A collaborative ownership approach is encouraged within the team. Feature-based development assigns ownership of each feature to a specific team member, while cross-functional teams foster collaboration between frontend and backend developers. Regular knowledge sharing sessions, such as weekly tech talks and pair programming, help spread expertise and keep everyone aligned. Comprehensive documentation, including detailed READMEs and API docs, ensures that information is accessible. Code ownership is shared, allowing anyone to contribute to any part of the codebase.

Onboarding new team members is a structured process designed to help them become productive quickly. A starter kit with a ready-to-use Docker setup is provided, and the first week focuses on pair programming with experienced team members. Clear guides are available for common tasks and architectural decisions, and each new member is assigned a mentor for the first month. Responsibility is introduced gradually, starting with small features and building up to more complex


#### **1.3 Observability, Resilience & Security**

Resilience design involves taking proactive measures to ensure a platform remains robust and user-friendly, even under stress. Circuit breakers are implemented to prevent cascading failures if any services go down, helping to isolate issues and maintain overall system stability. When an API becomes slow or unresponsive, fallback mechanisms can return cached data, ensuring users still receive timely responses. For transient failures, retry logic with exponential backoff gives services a chance to recover without being overwhelmed. In situations where a complete response isn’t possible, graceful degradation is practiced by showing partial data instead of failing entirely. Continuous health checks monitor the status of services, enabling quick detection and resolution of issues.

Comprehensive observability is achieved by tracking performance metrics such as response times, throughput, and error rates to monitor system health. Business metrics like user engagement, badge unlocks, and level progressions provide insight into how users interact with the platform. Infrastructure metrics—including CPU usage, memory consumption, and database connections—are also closely monitored. Logging is structured in JSON format and includes correlation IDs, making it easy to trace requests across services. All collected data feeds into real-time dashboards powered by Grafana, offering instant visibility into both technical and business performance.

Security and data integrity are essential to any platform. JWT authentication secures user sessions with token-based access, and all API inputs are validated using Zod schemas to prevent invalid or malicious data from entering the system. Rate limiting is enforced to protect against abuse, and parameterized queries with Prisma ORM help guard against SQL injection attacks. Data integrity is maintained through strict database constraints and careful transaction management. Communications are encrypted via HTTPS to ensure privacy and security for all users. Regular security audits and automated vulnerability scans are conducted to proactively identify and address potential risks.

---

### **Section 2: Technical Challenges**

#### **2.1 Backend – Node.js/Express** 

The backend is built with Node.js and Express, providing a robust foundation for the platform. REST APIs enable complete CRUD operations for all entities, making it easy to manage users, activities, badges, and more. A point system awards points for specific actions, while the level system ensures users progress automatically as they accumulate points. The badge system unlocks achievements based on defined criteria, and leaderboards offer  rankings to encourage competition. API documentation is available through Swagger, making it simple to explore and test endpoints. Comprehensive error handling is implemented globally, with custom codes to help identify and resolve issues quickly.

#### **2.2 Frontend – React.js** 

The frontend is developed using React.js, delivering a modern and responsive user experience. An admin dashboard provides a complete management interface, allowing administrators to oversee users, badges, and activities. The leaderboard view displays real-time rankings, while user profiles showcase individual details and earned badges. Badge management features make it easy to add or edit badges with built-in validations. Zustand is used for efficient global state management, and the interface is designed to be mobile-friendly, ensuring accessibility across devices.

#### **2.3 Database Design** 

The database design is optimized for gamification features, with an efficient schema that supports all core entities such as users, activities, badges, levels, and achievements. Performance is enhanced through the use of indexes for faster queries, and cascade deletes are configured to maintain proper data integrity when records are removed.

#### **2.4 Docker & DevOps** 

Docker and DevOps practices streamline development and deployment. Separate Dockerfiles are provided for both backend and frontend containers, and Docker Compose orchestrates the entire stack for easy setup. Environment configurations are managed through .env files, and multi-stage builds are used to produce optimized production images, ensuring efficient resource usage and faster deployments.

--- 

### **Section 3: Bonus Challenge – SaaS Scaling**

A scalable SaaS platform often relies on a strong multi-tenancy structure. Tenant isolation can be achieved by using separate databases or schema-based isolation, ensuring that each client’s data remains private and secure. Custom configurations allow each tenant to have their own point values, badge criteria, and gamification rules, so the platform can adapt to a wide range of use cases. Automated provisioning makes onboarding new tenants fast and efficient, with API-driven processes that handle everything from account creation to initial setup. Health monitoring is also important, with tenant-specific metrics and alerts providing visibility into the status and performance of

--- 

## Getting Started

1. **Clone the repository**
2. **Choose your setup method**:
   - **Docker** (Recommended): Use `docker-run.bat start`
   - **Manual**: Follow the manual setup instructions
3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/api-docs

--- 

## License

This project is licensed under the MIT License.


