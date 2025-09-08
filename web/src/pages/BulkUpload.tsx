import { useState, useRef } from 'react'
import { 
  Card, 
  Title, 
  Text, 
  Button, 
  Group,
  Stack,
  Alert,
  Progress,
  Table,
  Badge,
  Divider,
  Center,
  rem
} from '@mantine/core'
import { 
  IconUpload, 
  IconCheck, 
  IconX, 
  IconAlertTriangle, 
  IconCloudUpload,
  IconFileSpreadsheet,
  IconDownload
} from '@tabler/icons-react'

export default function BulkUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [validationResults, setValidationResults] = useState<any>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Mock validation results based on your specification
  const mockValidationResults = {
    repairedRows: {
      1: { wheelDiameter1: '18', tireDiameter1: '255/55R18' },
      3: { liftHeight: 'Stock' }
    },
    invalidRows: {
      2: { partId: 'Invalid format - must start with P-' },
      5: { quantity: 'Must be a positive number' }
    },
    ignoredColumns: ['extraColumn1', 'legacyField', 'notes_old']
  }

  const handleFileSelect = (selectedFile: File) => {
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile)
      setValidationResults(null)
    } else {
      alert('Please select a valid CSV file')
    }
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const droppedFile = event.dataTransfer.files[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const validateFile = async () => {
    if (!file) return

    setUploading(true)
    setUploadProgress(0)
    
    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setUploading(false)
          setValidationResults(mockValidationResults)
          return 100
        }
        return prev + 10
      })
    }, 200)
  }

  const submitFitments = async () => {
    console.log('Submitting validated fitments...')
    // Here you would call the API to submit the validated data
    alert('Fitments submitted successfully!')
    setFile(null)
    setValidationResults(null)
  }

  const downloadTemplate = () => {
    // Create a sample CSV template
    const headers = [
      'partId', 'partTypeId', 'configurationId', 'quantity', 'position',
      'liftHeight', 'wheelType', 'wheelDiameter1', 'tireDiameter1', 'backspacing1',
      'title', 'description', 'notes'
    ]
    const sampleRow = [
      'P-12345', 'PT-22', 'cfg-1001', '1', 'Front',
      'Stock', 'Alloy', '18', '255/55R18', '35mm',
      'Standard fit', 'Works with OEM wheel', 'Check brake clearance'
    ]
    
    const csvContent = [headers.join(','), sampleRow.join(',')].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fitments_template.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <Stack gap="lg">
        {/* Header */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={2}>Bulk Upload Fitments</Title>
              <Text c="dimmed">Upload CSV files to import fitments in bulk</Text>
            </div>
            <Button
              leftSection={<IconDownload size={16} />}
              variant="light"
              onClick={downloadTemplate}
            >
              Download Template
            </Button>
          </Group>

          <Alert icon={<IconAlertTriangle size={16} />} title="Important" color="yellow" mb="lg">
            Maximum file size: 10MB. Ensure your CSV includes required columns: partId, partTypeId, configurationId, quantity, position.
          </Alert>
        </Card>

        {/* File Upload */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">1. Select CSV File</Title>
          
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            style={{
              border: '2px dashed var(--mantine-color-gray-4)',
              borderRadius: rem(8),
              padding: rem(40),
              textAlign: 'center',
              cursor: 'pointer',
              backgroundColor: file ? 'var(--mantine-color-green-0)' : 'var(--mantine-color-gray-0)'
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              style={{ display: 'none' }}
            />
            
            <Center>
              <Stack align="center" gap="sm">
                {file ? (
                  <>
                    <IconFileSpreadsheet size={48} color="var(--mantine-color-green-6)" />
                    <Text fw={500}>{file.name}</Text>
                    <Text size="sm" c="dimmed">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  </>
                ) : (
                  <>
                    <IconCloudUpload size={48} color="var(--mantine-color-gray-6)" />
                    <Text fw={500}>Drop your CSV file here or click to browse</Text>
                    <Text size="sm" c="dimmed">
                      Supports CSV files up to 10MB
                    </Text>
                  </>
                )}
              </Stack>
            </Center>
          </div>

          {file && !validationResults && (
            <Group justify="center" mt="md">
              <Button
                leftSection={<IconUpload size={16} />}
                onClick={validateFile}
                loading={uploading}
                disabled={!file}
              >
                Validate File
              </Button>
            </Group>
          )}

          {uploading && (
            <Stack gap="sm" mt="md">
              <Text size="sm" fw={500}>Validating file...</Text>
              <Progress value={uploadProgress} animated />
            </Stack>
          )}
        </Card>

        {/* Validation Results */}
        {validationResults && (
          <>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3} mb="md">2. Validation Results</Title>
              
              <Stack gap="md">
                {/* Summary */}
                <Group>
                  <Badge leftSection={<IconCheck size={12} />} color="green" size="lg">
                    {Object.keys(mockValidationResults.repairedRows).length} Repaired
                  </Badge>
                  <Badge leftSection={<IconX size={12} />} color="red" size="lg">
                    {Object.keys(mockValidationResults.invalidRows).length} Invalid
                  </Badge>
                  <Badge leftSection={<IconAlertTriangle size={12} />} color="yellow" size="lg">
                    {mockValidationResults.ignoredColumns.length} Ignored Columns
                  </Badge>
                </Group>

                <Divider />

                {/* Repaired Rows */}
                {Object.keys(mockValidationResults.repairedRows).length > 0 && (
                  <div>
                    <Title order={4} c="green" mb="sm">
                      Repaired Rows (Auto-fixed)
                    </Title>
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Row</Table.Th>
                          <Table.Th>Column</Table.Th>
                          <Table.Th>Corrected Value</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {Object.entries(mockValidationResults.repairedRows).map(([rowIndex, fixes]: [string, any]) =>
                          Object.entries(fixes).map(([column, value]) => (
                            <Table.Tr key={`${rowIndex}-${column}`}>
                              <Table.Td>{rowIndex}</Table.Td>
                              <Table.Td>{column}</Table.Td>
                              <Table.Td>
                                <Badge variant="light" color="green">{value as string}</Badge>
                              </Table.Td>
                            </Table.Tr>
                          ))
                        )}
                      </Table.Tbody>
                    </Table>
                  </div>
                )}

                {/* Invalid Rows */}
                {Object.keys(mockValidationResults.invalidRows).length > 0 && (
                  <div>
                    <Title order={4} c="red" mb="sm">
                      Invalid Rows (Require Attention)
                    </Title>
                    <Table>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>Row</Table.Th>
                          <Table.Th>Column</Table.Th>
                          <Table.Th>Error</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {Object.entries(mockValidationResults.invalidRows).map(([rowIndex, errors]: [string, any]) =>
                          Object.entries(errors).map(([column, error]) => (
                            <Table.Tr key={`${rowIndex}-${column}`}>
                              <Table.Td>{rowIndex}</Table.Td>
                              <Table.Td>{column}</Table.Td>
                              <Table.Td>
                                <Text c="red" size="sm">{error as string}</Text>
                              </Table.Td>
                            </Table.Tr>
                          ))
                        )}
                      </Table.Tbody>
                    </Table>
                  </div>
                )}

                {/* Ignored Columns */}
                {mockValidationResults.ignoredColumns.length > 0 && (
                  <Alert icon={<IconAlertTriangle size={16} />} color="yellow">
                    <Text fw={500}>Ignored Columns:</Text>
                    <Text size="sm">
                      {mockValidationResults.ignoredColumns.join(', ')}
                    </Text>
                  </Alert>
                )}
              </Stack>
            </Card>

            {/* Submit */}
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Title order={3} mb="md">3. Submit Fitments</Title>
              
              {Object.keys(mockValidationResults.invalidRows).length === 0 ? (
                <Stack gap="md">
                  <Alert icon={<IconCheck size={16} />} color="green">
                    All data is valid and ready for import. Click Submit to proceed.
                  </Alert>
                  <Group justify="center">
                    <Button
                      leftSection={<IconCheck size={16} />}
                      size="lg"
                      onClick={submitFitments}
                    >
                      Submit Fitments
                    </Button>
                  </Group>
                </Stack>
              ) : (
                <Alert icon={<IconX size={16} />} color="red">
                  Please fix all invalid rows before submitting. You can download the corrected file, make changes, and re-upload.
                </Alert>
              )}
            </Card>
          </>
        )}
      </Stack>
    </div>
  )
}