# Fitmentpro.ai v2.0

## Overview

Fitmentpro.ai is a comprehensive automotive parts fitment management system that enables users to manage vehicle-part compatibility data. The application facilitates the mapping of automotive parts to specific vehicle configurations using the Vehicle Configuration Database (VCDB) standard. Key functionality includes applying fitments to vehicle configurations, managing bulk fitment uploads via CSV, analyzing coverage statistics, discovering potential fitments through similarity algorithms, and comprehensive administrative controls for data import/export operations.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **UI Library**: Mantine v7 component library providing a comprehensive design system with built-in accessibility
- **Build Tool**: Vite for fast development and optimized production builds
- **State Management**: React hooks and local component state (no global state management library currently implemented)
- **Routing**: React Router DOM for client-side navigation between application tabs
- **Forms**: React Hook Form with Zod validation for robust form handling
- **Charts**: Recharts library for coverage analytics and data visualization
- **Notifications**: React Hot Toast for user feedback and notifications

### Backend Architecture
- **Framework**: FastAPI (Python) for high-performance REST API with automatic OpenAPI documentation
- **Database ORM**: SQLAlchemy 2.0 with Alembic for database migrations and schema management
- **API Structure**: Modular router-based organization separating concerns (diagnostics, VCDB, parts, fitments, potential fitments, admin)
- **Data Validation**: Pydantic models for request/response validation and serialization
- **File Processing**: Support for CSV bulk operations using Pandas for data manipulation
- **Static File Serving**: FastAPI serves the React build for a unified deployment

### Data Storage Solutions
- **Primary Database**: PostgreSQL for production environments with SQLAlchemy ORM abstraction
- **Development Database**: SQLite fallback for local development environments
- **File Storage**: Local filesystem storage for CSV imports/exports organized in structured directories (vcdb, customer, exports)
- **Migration Strategy**: Alembic handles database schema versioning and migrations

### Authentication and Authorization
- **Current Implementation**: No authentication system implemented (as specified in requirements)
- **Design Decision**: Simplified architecture for internal tool usage without user management overhead

### API Design Patterns
- **Naming Convention**: Kebab-case for query parameters, camelCase for JSON responses for consistency
- **Pagination**: Default limit=100, offset=0 with configurable parameters across all list endpoints
- **Error Handling**: FastAPI automatic HTTP exception handling with structured error responses
- **Versioning**: API version endpoint for deployment tracking and compatibility management

### Data Import/Export Architecture
- **Staged Import Process**: VCDB data imported first, followed by parts, then fitments to maintain referential integrity
- **CSV Processing**: Pandas-based validation and repair of uploaded CSV data with detailed error reporting
- **Export Formats**: Multiple export options for fitments data with configurable date ranges

## External Dependencies

### Core Framework Dependencies
- **FastAPI**: Web framework for building the REST API with automatic documentation
- **React + TypeScript**: Frontend framework with static typing for robust UI development
- **SQLAlchemy + Alembic**: Database ORM and migration tools for PostgreSQL integration
- **Mantine UI**: Complete React components library with theming and accessibility features

### Database and Storage
- **PostgreSQL**: Primary database via psycopg2-binary driver for production deployments
- **SQLite**: Development database fallback for simplified local setup

### Data Processing Libraries
- **Pandas**: CSV data processing, validation, and transformation for bulk operations
- **Pydantic**: Data validation and serialization for API request/response models

### Development and Build Tools
- **Vite**: Frontend build tool for development server and production optimization
- **Uvicorn**: ASGI server for serving the FastAPI application
- **TypeScript**: Static typing for JavaScript providing enhanced developer experience

### UI and Visualization
- **Tabler Icons**: Comprehensive icon library for consistent UI iconography
- **Recharts**: React charting library for coverage analytics and data visualization
- **React Router DOM**: Client-side routing for single-page application navigation

### File Upload and Processing
- **python-multipart**: FastAPI support for file uploads and form data processing
- **aiofiles**: Asynchronous file I/O operations for handling CSV imports/exports

### Environment and Configuration
- **python-dotenv**: Environment variable management for configuration across environments
- **pydantic-settings**: Structured configuration management with validation