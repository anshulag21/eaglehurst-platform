# Eaglehurst - Medical Business Marketplace Platform

## Project Overview
Eaglehurst is a comprehensive platform for buying and selling medical businesses in the UK, featuring both web and mobile applications.

## Core Requirements Analysis

### 1. User Types & Roles

#### Administrator
- **Primary Role**: Platform governance and content management
- **Capabilities**:
  - Manage all platform content
  - Approve/reject listings and edits
  - User verification and approval
  - Dashboard with analytics and statistics
  - Manage subscriptions and payments
  - Handle service requests
  - Add/manage other admins/moderators
  - Block/unblock users

#### Sellers
- **Primary Role**: List medical businesses for sale
- **Capabilities**:
  - Create business listings (full business, partial business, fundraising)
  - Upload photos, videos, and business documents
  - Save listings as drafts
  - Schedule listing publication dates
  - Manage listing visibility (masked/unmasked information)
  - Respond to buyer connection requests
  - Two-way communication with approved buyers
  - View profile analytics and engagement metrics
  - Purchase subscriptions (Gold, Silver, Platinum)
  - Request additional services (legal, valuation)
  - KYC document upload and verification

#### Buyers
- **Primary Role**: Browse and connect with sellers
- **Capabilities**:
  - Browse listings with filtering and sorting
  - View masked business information
  - Send connection requests to sellers
  - Two-way communication with approved sellers
  - Purchase subscriptions with connection limits
  - Request additional services
  - Email OTP verification for registration

### 2. Core Features

#### Listing Management
- **Business Types**: Full business sale, partial business sale, fundraising
- **Content**: Photos, videos, business details, financial information
- **Workflow**: Draft → Admin Approval → Published → Edit Requests → Admin Approval
- **Privacy**: Information masking until buyer-seller connection approved
- **Scheduling**: Planned publication dates

#### User Verification & KYC
- **Sellers**: KYC documents (license, identity proof) → Admin verification → Platform access
- **Buyers**: Email OTP verification → Subscription purchase → Platform access
- **Ongoing**: Profile status dashboard for sellers

#### Communication System
- **Connection Flow**: Buyer request → Seller approval → Two-way chat interface
- **Notifications**: Real-time updates for approvals, rejections, messages

#### Subscription System
- **Tiers**: Gold, Silver, Platinum packages
- **Limitations**: Connection limits, listing limits per tier
- **Payment**: Stripe integration for UK market
- **Management**: Admin dashboard for subscription analytics

#### Additional Services
- **Service Types**: Legal services, valuation services
- **Process**: Service request form → Admin review → Direct contact
- **Pricing**: Fixed commission fees

#### Analytics & Reporting
- **Seller Dashboard**: Profile visits, engagement trends, weekly/monthly views
- **Admin Dashboard**: User statistics, revenue analytics, failed payments, pending services

### 3. UK Medical Business Sale Requirements

Based on UK regulations for medical business sales, the following fields are typically required:

#### Business Information
- Practice name and type
- Location and premises details
- NHS contract details (if applicable)
- Private patient base information
- Staff details and contracts
- Equipment inventory and condition
- Financial statements (3+ years)
- Patient list size and demographics
- Regulatory compliance certificates
- Insurance details
- Lease agreements or property ownership
- Goodwill valuation

#### Legal Requirements
- CQC registration status
- Professional indemnity insurance
- Data protection compliance (GDPR)
- Employment law compliance
- Health and safety certifications

### 4. Security & Compliance
- GDPR compliance for data protection
- Medical data handling regulations
- Financial data security (PCI DSS for payments)
- User authentication and authorization
- Data encryption at rest and in transit

### 5. Platform Workflow

#### Seller Journey
1. Registration → KYC Upload → Admin Verification → Approved Seller
2. Create Listing → Add Details/Media → Save as Draft → Submit for Approval
3. Admin Approval → Listing Published → Buyer Connections → Communication

#### Buyer Journey
1. Registration → Email OTP → Subscription Purchase → Platform Access
2. Browse Listings → Filter/Sort → View Masked Info → Send Connection Request
3. Seller Approval → Full Info Access → Direct Communication

#### Admin Journey
1. Review KYC Documents → Approve/Reject Sellers
2. Review Listing Submissions → Approve/Reject Publications
3. Monitor Platform Analytics → Manage Subscriptions → Handle Service Requests
