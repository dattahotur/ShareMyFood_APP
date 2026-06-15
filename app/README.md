# Food Waste Reduction Platform

A full-stack, microservices-based platform designed to connect restaurants with excess food to people in the community who can buy it at a low cost or donate it. 🌍

## Features 🧩
- **Microservices Backend**: 5 individual Node/Express services operating behind an API Gateway.
- **Vite React Frontend**: Modern, fast, and beautifully styled frontend interface.
- **Dockerized**: Fully containerized setup for easy execution.

## Project Structure
- `frontend/` - React frontend (Vite)
- `api-gateway/` - Reverse proxy distributing traffic to microservices
- `user-service/` - Handles authentication & user profiles
- `recipe-service/` - Handles the "Food Listings" (core feature)
- `order-service/` - Handles purchasing/claiming items
- `notification-service/` - Logs alerts and mock emails

## How To Run Locally (With Docker)

### Prerequisites
- [Docker](https://www.docker.com/) and Docker Compose installed.

### Steps
1. Open a terminal in this directory (`app/`)
2. Run:
   ```bash
   docker-compose up --build
   ```
3. Wait for all containers to build and start.
4. Open the frontend in your browser: [http://localhost:5173](http://localhost:5173)

### Service Ports
- Frontend: `5173`
- API Gateway: `5000`
- User Service: `5001`
- Recipe/Food Service: `5002`
- Order Service: `5003`
- Notification Service: `5004`
- MongoDB: `27017`

## Tech Stack
- **Frontend**: React, Vite, React Router, CSS
- **Backend**: Node.js, Express, Axios, HTTP Proxy Middleware
- **Database**: MongoDB (setup via Docker)
- **Infrastructure**: Docker Compose
