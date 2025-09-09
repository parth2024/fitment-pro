import { useState } from 'react'
import { 
  Card, 
  Title, 
  Text, 
  Button, 
  Group,
  Stack,
  Badge,
  Alert,
  Select,
  NumberInput,
  Grid,
  Divider,
  Code,
  ActionIcon,
  Modal,
  List,
  Center
} from '@mantine/core'
import { 
  IconSettings, 
  IconDatabase, 
  IconDownload, 
  IconUpload, 
  IconRefresh, 
  IconCheck,
  IconAlertTriangle,
  IconFolder,
  IconFile
} from '@tabler/icons-react'

export default function Admin() {
  const [importLoading, setImportLoading] = useState(false)
  const [exportFormat, setExportFormat] = useState('both')
  const [exportDays, setExportDays] = useState(30)
  const [resetModalOpen, setResetModalOpen] = useState(false)

  // Mock system data
  const systemInfo = {
    appVersion: '2.0.0',
    vcdbVersion: '2024.1',
    buildDate: '2024-09-08T12:00:00Z',
    environment: 'development',
    database: 'Connected',
    storage: './storage'
  }

  const mockImportStatus = {
    vcdb: { status: 'completed', lastRun: '2024-09-07T14:30:00Z', recordsProcessed: 15420 },
    customer: { status: 'completed', lastRun: '2024-09-07T15:45:00Z', recordsProcessed: 8934 }
  }

  const handleImportData = async (dataKind: string) => {
    setImportLoading(true)
    
    // Simulate import process
    setTimeout(() => {
      setImportLoading(false)
      alert(`${dataKind} data imported successfully!`)
    }, 3000)
  }

  const handleExportFitments = async () => {
    console.log(`Exporting fitments: format=${exportFormat}, days=${exportDays}`)
    alert('Export started! Files will be available in storage/exports/')
  }

  const handleResetDemo = () => {
    console.log('Resetting demo data...')
    setResetModalOpen(false)
    alert('Demo data reset successfully!')
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green'
      case 'running': return 'yellow'
      case 'failed': return 'red'
      default: return 'gray'
    }
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <Stack gap="lg">
        {/* Header */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={2}>System Administration</Title>
              <Text c="dimmed">Manage data imports, exports, and system configuration</Text>
            </div>
            <IconSettings size={28} color="var(--mantine-color-blue-6)" />
          </Group>

          <Alert icon={<IconAlertTriangle size={16} />} color="yellow">
            <Text fw={500}>Development Environment</Text>
            <Text size="sm">
              This admin panel controls the development database. Production operations should be performed through the production environment.
            </Text>
          </Alert>
        </Card>

        {/* System Information */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">System Information</Title>
          
          <Grid>
            <Grid.Col span={6}>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Application Version</Text>
                  <Badge variant="light" color="blue">{systemInfo.appVersion}</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">VCDB Version</Text>
                  <Badge variant="light" color="green">{systemInfo.vcdbVersion}</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Build Date</Text>
                  <Text size="sm">{new Date(systemInfo.buildDate).toLocaleString()}</Text>
                </Group>
              </Stack>
            </Grid.Col>
            <Grid.Col span={6}>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Environment</Text>
                  <Badge variant="light" color="orange">{systemInfo.environment}</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Database Status</Text>
                  <Badge variant="light" color="green">{systemInfo.database}</Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Storage Directory</Text>
                  <Code>{systemInfo.storage}</Code>
                </Group>
              </Stack>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Stunning Upload Required Files Section */}
        <Card 
          shadow="lg" 
          padding="xl" 
          radius="xl" 
          withBorder
          style={{
            background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #e0f2fe 100%)",
            border: "2px solid #e2e8f0",
            overflow: "hidden",
            position: "relative"
          }}
        >
          <div style={{
            position: "absolute",
            top: "-50%",
            right: "-50%",
            width: "200%",
            height: "200%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.03) 0%, transparent 70%)",
            pointerEvents: "none"
          }} />
          
          <Group justify="space-between" mb="xl" style={{ position: "relative", zIndex: 1 }}>
            <div>
              <Title 
                order={2} 
                style={{
                  background: "linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontSize: "28px",
                  fontWeight: 700,
                  marginBottom: "8px"
                }}
              >
                Upload Required Files
              </Title>
              <Text 
                size="lg" 
                c="dimmed" 
                style={{ 
                  fontSize: "16px",
                  fontWeight: 500
                }}
              >
                Upload your VCDB and Products data files to get started with the Mass Fitment Tool
              </Text>
            </div>
            <div style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              borderRadius: "20px",
              padding: "20px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 10px 25px rgba(59, 130, 246, 0.3)"
            }}>
              <IconUpload size={40} color="white" />
            </div>
          </Group>

          <Grid gutter="xl" style={{ position: "relative", zIndex: 1 }}>
            {/* VCDB Upload Section */}
            <Grid.Col span={6}>
              <Card 
                shadow="md" 
                padding="lg" 
                radius="xl" 
                withBorder
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%)",
                  border: "2px solid #dbeafe",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow = "0 20px 40px rgba(59, 130, 246, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0px)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                }}
              >
                <div style={{
                  position: "absolute",
                  top: "0",
                  left: "0",
                  right: "0",
                  height: "4px",
                  background: "linear-gradient(90deg, #3b82f6 0%, #06b6d4 100%)"
                }} />
                
                <Stack align="center" gap="lg">
                  <div style={{
                    background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
                    borderRadius: "24px",
                    padding: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 25px rgba(59, 130, 246, 0.3)"
                  }}>
                    <IconDatabase size={48} color="white" />
                  </div>
                  
                  <div style={{ textAlign: "center" }}>
                    <Title 
                      order={3} 
                      mb="xs"
                      style={{
                        background: "linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontWeight: 700
                      }}
                    >
                      VCDB Data Files
                    </Title>
                    <Text size="sm" c="dimmed" mb="md">
                      Vehicle Configuration Database files including base vehicles, configurations, and submodels
                    </Text>
                    
                    <Group justify="center" gap="xs" mb="lg">
                      <Badge 
                        variant="gradient"
                        gradient={{ from: 'blue.6', to: 'cyan.6', deg: 135 }}
                        size="lg"
                        radius="lg"
                      >
                        {mockImportStatus.vcdb.recordsProcessed.toLocaleString()} records
                      </Badge>
                      <Badge 
                        color={getStatusColor(mockImportStatus.vcdb.status)}
                        variant="light"
                        size="lg"
                        radius="lg"
                        style={{ textTransform: "capitalize" }}
                      >
                        {mockImportStatus.vcdb.status}
                      </Badge>
                    </Group>
                  </div>
                  
                  <div 
                    style={{
                      width: "100%",
                      height: "120px",
                      border: "3px dashed #3b82f6",
                      borderRadius: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%)",
                      transition: "all 0.3s ease",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%)";
                      e.currentTarget.style.borderColor = "#06b6d4";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(6, 182, 212, 0.05) 100%)";
                      e.currentTarget.style.borderColor = "#3b82f6";
                    }}
                  >
                    <Stack align="center" gap="xs">
                      <IconFolder size={32} color="#3b82f6" />
                      <Text size="sm" fw={600} c="blue">
                        Drop VCDB files here
                      </Text>
                      <Text size="xs" c="dimmed">
                        CSV, TSV, XLSX supported
                      </Text>
                    </Stack>
                  </div>
                  
                  <Button
                    fullWidth
                    size="lg"
                    variant="gradient"
                    gradient={{ from: 'blue.6', to: 'cyan.6', deg: 135 }}
                    leftSection={<IconDatabase size={20} />}
                    onClick={() => handleImportData('VCDB')}
                    loading={importLoading}
                    style={{
                      borderRadius: "12px",
                      fontSize: "16px",
                      fontWeight: 600,
                      padding: "16px",
                      boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)"
                    }}
                  >
                    Import VCDB Data
                  </Button>
                  
                  <Text size="xs" c="dimmed" style={{ textAlign: "center" }}>
                    Last imported: {new Date(mockImportStatus.vcdb.lastRun).toLocaleDateString()} at {new Date(mockImportStatus.vcdb.lastRun).toLocaleTimeString()}
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>

            {/* Products Upload Section */}
            <Grid.Col span={6}>
              <Card 
                shadow="md" 
                padding="lg" 
                radius="xl" 
                withBorder
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)",
                  border: "2px solid #dcfce7",
                  transition: "all 0.3s ease",
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.boxShadow = "0 20px 40px rgba(34, 197, 94, 0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0px)";
                  e.currentTarget.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";
                }}
              >
                <div style={{
                  position: "absolute",
                  top: "0",
                  left: "0",
                  right: "0",
                  height: "4px",
                  background: "linear-gradient(90deg, #22c55e 0%, #10b981 100%)"
                }} />
                
                <Stack align="center" gap="lg">
                  <div style={{
                    background: "linear-gradient(135deg, #22c55e 0%, #10b981 100%)",
                    borderRadius: "24px",
                    padding: "24px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 25px rgba(34, 197, 94, 0.3)"
                  }}>
                    <IconFile size={48} color="white" />
                  </div>
                  
                  <div style={{ textAlign: "center" }}>
                    <Title 
                      order={3} 
                      mb="xs"
                      style={{
                        background: "linear-gradient(135deg, #1e293b 0%, #22c55e 100%)",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontWeight: 700
                      }}
                    >
                      Products Data Files
                    </Title>
                    <Text size="sm" c="dimmed" mb="md">
                      Parts inventory, part types, positions, and related reference data
                    </Text>
                    
                    <Group justify="center" gap="xs" mb="lg">
                      <Badge 
                        variant="gradient"
                        gradient={{ from: 'green.6', to: 'emerald.6', deg: 135 }}
                        size="lg"
                        radius="lg"
                      >
                        {mockImportStatus.customer.recordsProcessed.toLocaleString()} records
                      </Badge>
                      <Badge 
                        color={getStatusColor(mockImportStatus.customer.status)}
                        variant="light"
                        size="lg"
                        radius="lg"
                        style={{ textTransform: "capitalize" }}
                      >
                        {mockImportStatus.customer.status}
                      </Badge>
                    </Group>
                  </div>
                  
                  <div 
                    style={{
                      width: "100%",
                      height: "120px",
                      border: "3px dashed #22c55e",
                      borderRadius: "16px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)",
                      transition: "all 0.3s ease",
                      cursor: "pointer"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)";
                      e.currentTarget.style.borderColor = "#10b981";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(16, 185, 129, 0.05) 100%)";
                      e.currentTarget.style.borderColor = "#22c55e";
                    }}
                  >
                    <Stack align="center" gap="xs">
                      <IconFile size={32} color="#22c55e" />
                      <Text size="sm" fw={600} c="green">
                        Drop Products files here
                      </Text>
                      <Text size="xs" c="dimmed">
                        CSV, TSV, XLSX supported
                      </Text>
                    </Stack>
                  </div>
                  
                  <Button
                    fullWidth
                    size="lg"
                    variant="gradient"
                    gradient={{ from: 'green.6', to: 'emerald.6', deg: 135 }}
                    leftSection={<IconUpload size={20} />}
                    onClick={() => handleImportData('Products')}
                    loading={importLoading}
                    style={{
                      borderRadius: "12px",
                      fontSize: "16px",
                      fontWeight: 600,
                      padding: "16px",
                      boxShadow: "0 4px 15px rgba(34, 197, 94, 0.3)"
                    }}
                  >
                    Import Products Data
                  </Button>
                  
                  <Text size="xs" c="dimmed" style={{ textAlign: "center" }}>
                    Last imported: {new Date(mockImportStatus.customer.lastRun).toLocaleDateString()} at {new Date(mockImportStatus.customer.lastRun).toLocaleTimeString()}
                  </Text>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>

          {/* Progress Indicator */}
          <Card 
            mt="xl" 
            p="lg" 
            radius="lg" 
            style={{
              background: "linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(139, 92, 246, 0.05) 100%)",
              border: "1px solid rgba(99, 102, 241, 0.2)",
              position: "relative",
              zIndex: 1
            }}
          >
            <Group justify="space-between" align="center">
              <div>
                <Text fw={600} size="lg" mb="xs">
                  Upload Progress
                </Text>
                <Text size="sm" c="dimmed">
                  Both VCDB and Products files are required to proceed with fitment operations
                </Text>
              </div>
              <Group gap="lg">
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: mockImportStatus.vcdb.status === 'completed' 
                      ? "linear-gradient(135deg, #22c55e 0%, #10b981 100%)"
                      : "linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "8px",
                    boxShadow: mockImportStatus.vcdb.status === 'completed' 
                      ? "0 4px 15px rgba(34, 197, 94, 0.3)"
                      : "none"
                  }}>
                    <IconCheck size={24} color="white" />
                  </div>
                  <Text size="xs" fw={600}>VCDB</Text>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: "60px",
                    height: "60px",
                    borderRadius: "50%",
                    background: mockImportStatus.customer.status === 'completed' 
                      ? "linear-gradient(135deg, #22c55e 0%, #10b981 100%)"
                      : "linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "8px",
                    boxShadow: mockImportStatus.customer.status === 'completed' 
                      ? "0 4px 15px rgba(34, 197, 94, 0.3)"
                      : "none"
                  }}>
                    <IconCheck size={24} color="white" />
                  </div>
                  <Text size="xs" fw={600}>Products</Text>
                </div>
              </Group>
            </Group>
          </Card>
        </Card>

        {/* Data Export */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Data Export</Title>
          
          <Text c="dimmed" mb="lg">
            Export fitments data to CSV files. Files will be saved to the storage/exports directory with timestamps.
          </Text>

          <Stack gap="md">
            <Group grow>
              <Select
                label="Export Format"
                value={exportFormat}
                onChange={(value) => setExportFormat(value || 'both')}
                data={[
                  { value: 'both', label: 'Both (Compressed & Expanded)' },
                  { value: 'compressed', label: 'Compressed' },
                  { value: 'expanded', label: 'Expanded' }
                ]}
              />
              <NumberInput
                label="Number of Days"
                description="Export fitments from last N days"
                value={exportDays}
                onChange={(val) => setExportDays(typeof val === 'number' ? val : 30)}
                min={1}
                max={365}
              />
            </Group>

            <Group justify="space-between">
              <div>
                <Text size="sm" fw={500}>Export Location</Text>
                <Text size="xs" c="dimmed">Files will be saved to: <Code>storage/exports/fitments_*_[timestamp].csv</Code></Text>
              </div>
              <Button
                leftSection={<IconDownload size={16} />}
                onClick={handleExportFitments}
              >
                Export Fitments
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* Storage Management */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Storage Management</Title>
          
          <Grid>
            <Grid.Col span={4}>
              <Center>
                <Stack align="center" gap="xs">
                  <ActionIcon variant="light" size="xl" color="blue">
                    <IconFolder size={24} />
                  </ActionIcon>
                  <Text fw={500}>VCDB</Text>
                  <Text size="sm" c="dimmed">15 files</Text>
                  <Text size="xs" c="dimmed">245 MB</Text>
                </Stack>
              </Center>
            </Grid.Col>
            <Grid.Col span={4}>
              <Center>
                <Stack align="center" gap="xs">
                  <ActionIcon variant="light" size="xl" color="green">
                    <IconFolder size={24} />
                  </ActionIcon>
                  <Text fw={500}>Customer</Text>
                  <Text size="sm" c="dimmed">8 files</Text>
                  <Text size="xs" c="dimmed">12 MB</Text>
                </Stack>
              </Center>
            </Grid.Col>
            <Grid.Col span={4}>
              <Center>
                <Stack align="center" gap="xs">
                  <ActionIcon variant="light" size="xl" color="orange">
                    <IconFile size={24} />
                  </ActionIcon>
                  <Text fw={500}>Exports</Text>
                  <Text size="sm" c="dimmed">23 files</Text>
                  <Text size="xs" c="dimmed">156 MB</Text>
                </Stack>
              </Center>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Demo Controls */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Demo & Development Tools</Title>
          
          <Stack gap="md">
            <Alert icon={<IconCheck size={16} />} color="blue">
              <Text fw={500}>Demo Mode Active</Text>
              <Text size="sm">
                The system is running with sample data for demonstration purposes. Use the controls below to manage demo data.
              </Text>
            </Alert>

            <Group justify="space-between">
              <div>
                <Text fw={500}>Reset Demo Data</Text>
                <Text size="sm" c="dimmed">
                  Clear all data and reload fresh demo dataset including VCDB, parts, and sample fitments
                </Text>
              </div>
              <Button
                leftSection={<IconRefresh size={16} />}
                color="orange"
                onClick={() => setResetModalOpen(true)}
              >
                Reset Demo
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>

      {/* Reset Demo Modal */}
      <Modal
        opened={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Demo Data"
        centered
      >
        <Stack gap="md">
          <Alert icon={<IconAlertTriangle size={16} />} color="red">
            This will permanently delete all current data and reload the demo dataset.
          </Alert>
          
          <div>
            <Text fw={500} mb="xs">This action will:</Text>
            <List size="sm">
              <List.Item>Delete all existing fitments</List.Item>
              <List.Item>Reset VCDB to demo configuration</List.Item>
              <List.Item>Reload sample parts and part types</List.Item>
              <List.Item>Create fresh demo fitments</List.Item>
            </List>
          </div>

          <Group justify="flex-end">
            <Button variant="light" onClick={() => setResetModalOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleResetDemo}>
              Reset Demo Data
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  )
}