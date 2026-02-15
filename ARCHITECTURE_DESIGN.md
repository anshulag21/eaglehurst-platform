# Eaglehurst - System Architecture Design

## Technology Stack

### Backend
- **Framework**: Python FastAPI
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Migration**: Alembic
- **Authentication**: JWT with refresh tokens
- **Payment**: Stripe API
- **File Storage**: AWS S3 or similar cloud storage
- **Email**: SendGrid or AWS SES
- **Real-time**: WebSocket for chat functionality

### Frontend
- **Web Application**: React 18+ with TypeScript
- **Mobile Application**: React Native with TypeScript
- **State Management**: Redux Toolkit or Zustand
- **UI Framework**: Material-UI or Tailwind CSS
- **HTTP Client**: Axios
- **Real-time**: Socket.io client

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose (development), Kubernetes (production)
- **Reverse Proxy**: Nginx
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)

## System Architecture

### Backend Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway / Load Balancer              │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Application                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Auth     │  │   Users     │  │      Listings       │  │
│  │   Module    │  │   Module    │  │       Module        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Payments    │  │    Chat     │  │      Services       │  │
│  │   Module    │  │   Module    │  │       Module        │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                                │
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ PostgreSQL  │  │    Redis    │  │    File Storage     │  │
│  │  (Primary)  │  │   (Cache)   │  │      (S3/GCS)       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Component Structure (Backend)

Each module follows the pattern:
```
module_name/
├── api/
│   ├── __init__.py
│   └── module_name_api.py      # FastAPI routes
├── business_logic/
│   ├── __init__.py
│   └── module_name_bl.py       # Business logic layer
├── dao/
│   ├── __init__.py
│   └── module_name_dao.py      # Data access objects
├── models/
│   ├── __init__.py
│   └── module_name_models.py   # SQLAlchemy models
└── schemas/
    ├── __init__.py
    └── module_name_schemas.py  # Pydantic schemas
```

### Frontend Architecture

#### Web Application (React)
```
src/
├── components/           # Reusable UI components
├── pages/               # Page components
├── hooks/               # Custom React hooks
├── services/            # API service layer
├── store/               # State management
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── constants/           # Application constants
└── assets/              # Static assets
```

#### Mobile Application (React Native)
```
src/
├── components/          # Reusable components
├── screens/             # Screen components
├── navigation/          # Navigation configuration
├── services/            # API service layer
├── store/               # State management
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
├── constants/           # Application constants
└── assets/              # Static assets
```

## Database Design

### Core Entities

#### Users Table
- id (UUID, Primary Key)
- email (Unique)
- password_hash
- user_type (ENUM: admin, seller, buyer)
- is_verified
- is_active
- created_at
- updated_at

#### Sellers Table
- id (UUID, Primary Key)
- user_id (Foreign Key to Users)
- business_name
- contact_phone
- verification_status (ENUM: pending, approved, rejected)
- kyc_documents (JSON)
- profile_completion_status
- created_at
- updated_at

#### Buyers Table
- id (UUID, Primary Key)
- user_id (Foreign Key to Users)
- subscription_id (Foreign Key to Subscriptions)
- verification_status
- created_at
- updated_at

#### Listings Table
- id (UUID, Primary Key)
- seller_id (Foreign Key to Sellers)
- title
- description
- business_type (ENUM: full_sale, partial_sale, fundraising)
- location
- asking_price
- financial_data (JSON, encrypted)
- media_files (JSON array)
- status (ENUM: draft, pending_approval, published, rejected)
- scheduled_publish_date
- is_masked
- created_at
- updated_at

#### Subscriptions Table
- id (UUID, Primary Key)
- name (Gold, Silver, Platinum)
- price
- connection_limit
- listing_limit
- features (JSON)
- is_active

#### User_Subscriptions Table
- id (UUID, Primary Key)
- user_id (Foreign Key to Users)
- subscription_id (Foreign Key to Subscriptions)
- start_date
- end_date
- status (ENUM: active, expired, cancelled)
- stripe_subscription_id

#### Connections Table
- id (UUID, Primary Key)
- buyer_id (Foreign Key to Buyers)
- seller_id (Foreign Key to Sellers)
- listing_id (Foreign Key to Listings)
- status (ENUM: pending, approved, rejected)
- created_at
- updated_at

#### Messages Table
- id (UUID, Primary Key)
- connection_id (Foreign Key to Connections)
- sender_id (Foreign Key to Users)
- message_content
- message_type (ENUM: text, file, system)
- is_read
- created_at

#### Service_Requests Table
- id (UUID, Primary Key)
- user_id (Foreign Key to Users)
- service_type (ENUM: legal, valuation)
- request_data (JSON)
- status (ENUM: pending, in_progress, completed)
- admin_notes
- created_at
- updated_at

## Security Architecture

### Authentication & Authorization
- JWT tokens with refresh token rotation
- Role-based access control (RBAC)
- Multi-factor authentication for admin users
- Session management with Redis

### Data Protection
- Encryption at rest for sensitive data
- TLS 1.3 for data in transit
- GDPR compliance measures
- PII data anonymization capabilities

### API Security
- Rate limiting per endpoint
- Input validation and sanitization
- SQL injection prevention
- CORS configuration
- API versioning

## Scalability Considerations

### Horizontal Scaling
- Stateless application design
- Load balancer configuration
- Database read replicas
- CDN for static assets

### Performance Optimization
- Database indexing strategy
- Query optimization
- Caching layers (Redis)
- Async processing for heavy operations

### Monitoring & Observability
- Application metrics
- Database performance monitoring
- Error tracking and alerting
- User analytics and behavior tracking
