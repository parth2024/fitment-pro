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

        {/* Data Import */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Data Import</Title>
          
          <Text c="dimmed" mb="lg">
            Import data from CSV files in the storage directory. Ensure files are placed in the correct subdirectories before importing.
          </Text>

          <Stack gap="lg">
            {/* VCDB Import */}
            <div>
              <Group justify="space-between" mb="sm">
                <div>
                  <Text fw={500}>1. VCDB Data</Text>
                  <Text size="sm" c="dimmed">Vehicle configuration database (base vehicles, configurations, submodels)</Text>
                </div>
                <Badge 
                  color={getStatusColor(mockImportStatus.vcdb.status)}
                  variant="light"
                >
                  {mockImportStatus.vcdb.status}
                </Badge>
              </Group>
              
              <Group justify="space-between" align="flex-end">
                <div>
                  <Text size="xs" c="dimmed">
                    Last run: {new Date(mockImportStatus.vcdb.lastRun).toLocaleString()}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Records processed: {mockImportStatus.vcdb.recordsProcessed.toLocaleString()}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Source: <Code>storage/vcdb/*.csv</Code>
                  </Text>
                </div>
                <Button
                  leftSection={<IconDatabase size={16} />}
                  onClick={() => handleImportData('VCDB')}
                  loading={importLoading}
                >
                  Import VCDB
                </Button>
              </Group>
            </div>

            <Divider />

            {/* Customer Data Import */}
            <div>
              <Group justify="space-between" mb="sm">
                <div>
                  <Text fw={500}>2. Customer Data</Text>
                  <Text size="sm" c="dimmed">Parts, part types, positions, and related reference data</Text>
                </div>
                <Badge 
                  color={getStatusColor(mockImportStatus.customer.status)}
                  variant="light"
                >
                  {mockImportStatus.customer.status}
                </Badge>
              </Group>
              
              <Group justify="space-between" align="flex-end">
                <div>
                  <Text size="xs" c="dimmed">
                    Last run: {new Date(mockImportStatus.customer.lastRun).toLocaleString()}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Records processed: {mockImportStatus.customer.recordsProcessed.toLocaleString()}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Source: <Code>storage/customer/*.csv</Code>
                  </Text>
                </div>
                <Button
                  leftSection={<IconUpload size={16} />}
                  onClick={() => handleImportData('Customer')}
                  loading={importLoading}
                >
                  Import Customer Data
                </Button>
              </Group>
            </div>
          </Stack>
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