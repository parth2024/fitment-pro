# Apply Fitments Feature Documentation

## Overview

The Apply Fitments feature allows users to upload VCDB (Vehicle Configuration Database) and Products data files, then apply fitments using either manual or AI-powered methods.

## Features

### 1. File Upload

- **VCDB Data File**: Upload vehicle configuration data in CSV, XLSX, or JSON format
- **Products Data File**: Upload product/parts data in CSV, XLSX, or JSON format
- **File Validation**: Automatic validation of file formats and content
- **Progress Tracking**: Real-time upload progress with status indicators

### 2. Fitment Methods

#### Manual Fitment

- Uses the existing fitment interface
- Allows manual selection of vehicle configurations
- Provides detailed fitment form with parameters like:
  - Part selection
  - Position (Front, Rear, etc.)
  - Quantity
  - Wheel parameters
  - Lift height
  - Custom titles and descriptions

#### AI Fitment

- **Azure AI Foundry Integration**: Uses Azure OpenAI to analyze data and generate fitments
- **Intelligent Matching**: AI analyzes vehicle specifications and product compatibility
- **Confidence Scoring**: Each AI-generated fitment includes a confidence score
- **Review Interface**: Users can review and approve/reject AI suggestions
- **Batch Processing**: Apply multiple fitments at once

### 3. AI Processing Features

- **Smart Analysis**: AI considers vehicle year, make, model, submodel, and drive type
- **Compatibility Assessment**: Evaluates product-vehicle compatibility
- **Reasoning**: Provides explanations for each fitment suggestion
- **Fallback System**: Rule-based matching if AI service is unavailable

### 4. Export Functionality

- **Multiple Formats**: Export fitments in CSV, XLSX, or JSON formats
- **Filtered Exports**: Export with search and sorting options
- **Download Ready**: Direct file download with proper headers

## API Endpoints

### File Upload

- `POST /api/upload-fitment-files` - Upload VCDB and Products files
- `GET /api/session/{session_id}/status` - Get session status

### AI Processing

- `POST /api/ai-fitment` - Process fitments using AI
- `POST /api/apply-ai-fitments` - Apply selected AI fitments

### Export

- `GET /api/fitments/export` - Export fitments in various formats

## Configuration

### Environment Variables

```bash
# Azure AI Foundry Configuration
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4
```

### File Storage

- Uploaded files are stored in `storage/fitment_uploads/`
- Each session gets a unique UUID directory
- Files are organized by session for easy management

## Usage Flow

1. **Upload Files**: User uploads VCDB and Products data files
2. **Choose Method**: Select between Manual or AI fitment processing
3. **Process Fitments**:
   - **Manual**: Use existing interface to manually create fitments
   - **AI**: Let AI analyze and generate fitment suggestions
4. **Review & Apply**: Review AI suggestions and apply selected fitments
5. **Export**: Export final fitments in desired format

## Technical Implementation

### Frontend (React/TypeScript)

- File upload with drag-and-drop support
- Progress indicators and status management
- Modal-based review interface for AI fitments
- Responsive design with Mantine UI components

### Backend (FastAPI/Python)

- File handling with validation
- Azure AI Foundry integration
- Session management for file processing
- Export functionality with multiple formats

### AI Integration

- Azure OpenAI GPT-4 for intelligent fitment generation
- Structured prompts for consistent output
- Error handling with fallback to rule-based matching
- Confidence scoring for quality assessment

## Error Handling

- File format validation
- Upload progress tracking
- AI service fallback
- Session management
- Export error handling

## Future Enhancements

- Real-time collaboration
- Advanced AI training on fitment data
- Integration with external parts databases
- Automated quality scoring
- Batch processing improvements
