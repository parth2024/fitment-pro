import { useState } from 'react'
import { 
  Card, 
  Title, 
  Text, 
  Button, 
  Table, 
  Checkbox, 
  TextInput, 
  Group,
  Stack,
  Badge,
  ActionIcon,
  Pagination,
  Select,
  Switch,
  Menu,
  Modal,
  Flex,
  ScrollArea
} from '@mantine/core'
import { IconSearch, IconDownload, IconTrash, IconFilter, IconDots, IconEdit, IconEye } from '@tabler/icons-react'

export default function Fitments() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFitments, setSelectedFitments] = useState<string[]>([])
  const [expandedView, setExpandedView] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState('partId')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)

  // Mock fitments data based on your specification
  const mockFitments = [
    {
      hash: 'fh001',
      partId: 'P-12345',
      itemStatus: 'Active',
      itemStatusCode: 0,
      baseVehicleId: '180952',
      year: 2025,
      makeName: 'Acura',
      modelName: 'ADX',
      subModelName: 'Advance',
      driveTypeName: 'AWD',
      fuelTypeName: 'Gas',
      bodyNumDoors: 4,
      bodyTypeName: 'Crossover',
      ptid: 'PT-22',
      partTypeDescriptor: 'Brake Pads',
      uom: 'Set',
      quantity: 1,
      fitmentTitle: 'Standard Brake Fit',
      fitmentDescription: 'OEM replacement brake pads',
      position: 'Front',
      positionId: 1,
      liftHeight: 'Stock',
      wheelType: 'Alloy',
      createdAt: '2024-01-15T10:30:00Z',
      createdBy: 'admin',
      updatedAt: '2024-01-20T14:45:00Z',
      updatedBy: 'admin'
    },
    {
      hash: 'fh002',
      partId: 'P-67890',
      itemStatus: 'Active',
      itemStatusCode: 0,
      baseVehicleId: '140100',
      year: 2024,
      makeName: 'Toyota',
      modelName: 'RAV4',
      subModelName: 'XLE',
      driveTypeName: 'AWD',
      fuelTypeName: 'Gas',
      bodyNumDoors: 4,
      bodyTypeName: 'Crossover',
      ptid: 'PT-33',
      partTypeDescriptor: 'Air Filter',
      uom: 'Each',
      quantity: 1,
      fitmentTitle: 'Performance Air Filter',
      fitmentDescription: 'High-flow air filter for improved performance',
      position: 'Engine Bay',
      positionId: 2,
      liftHeight: 'Stock',
      wheelType: 'N/A',
      createdAt: '2024-02-10T09:15:00Z',
      createdBy: 'tech1',
      updatedAt: '2024-02-12T16:20:00Z',
      updatedBy: 'tech1'
    },
    {
      hash: 'fh003',
      partId: 'P-11111',
      itemStatus: 'Inactive',
      itemStatusCode: 1,
      baseVehicleId: '150200',
      year: 2024,
      makeName: 'Ford',
      modelName: 'F-150',
      subModelName: 'Lariat',
      driveTypeName: '4WD',
      fuelTypeName: 'Gas',
      bodyNumDoors: 4,
      bodyTypeName: 'Truck',
      ptid: 'PT-44',
      partTypeDescriptor: 'Oil Filter',
      uom: 'Each',
      quantity: 1,
      fitmentTitle: 'Heavy Duty Oil Filter',
      fitmentDescription: 'Extended life oil filter',
      position: 'Engine',
      positionId: 3,
      liftHeight: '0-1in',
      wheelType: 'Steel',
      createdAt: '2024-03-05T11:00:00Z',
      createdBy: 'admin',
      updatedAt: '2024-03-08T13:30:00Z',
      updatedBy: 'admin'
    }
  ]

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFitments(mockFitments.map(f => f.hash))
    } else {
      setSelectedFitments([])
    }
  }

  const handleSelectFitment = (hash: string, checked: boolean) => {
    if (checked) {
      setSelectedFitments(prev => [...prev, hash])
    } else {
      setSelectedFitments(prev => prev.filter(h => h !== hash))
    }
  }

  const handleBulkDelete = () => {
    console.log('Deleting fitments:', selectedFitments)
    setSelectedFitments([])
    setDeleteModalOpen(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'green'
      case 'Inactive': return 'red'
      case 'Sunset': return 'orange'
      default: return 'gray'
    }
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="lg">
          {/* Header */}
          <Group justify="space-between">
            <div>
              <Title order={2}>Fitments Management</Title>
              <Text c="dimmed">View and manage all fitments with advanced filtering</Text>
            </div>
            <Group>
              <Switch
                label="Expanded View"
                checked={expandedView}
                onChange={(event) => setExpandedView(event.currentTarget.checked)}
              />
            </Group>
          </Group>

          {/* Filters and Actions */}
          <Group justify="space-between">
            <Group>
              <TextInput
                placeholder="Search by Part ID, Make, Model..."
                leftSection={<IconSearch size={16} />}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.currentTarget.value)}
                style={{ minWidth: 300 }}
              />
              <Select
                placeholder="Sort by"
                value={sortBy}
                onChange={(value) => setSortBy(value || 'partId')}
                data={[
                  { value: 'partId', label: 'Part ID' },
                  { value: 'makeName', label: 'Make' },
                  { value: 'modelName', label: 'Model' },
                  { value: 'year', label: 'Year' },
                  { value: 'updatedAt', label: 'Last Updated' }
                ]}
                leftSection={<IconFilter size={16} />}
              />
              <Select
                value={sortOrder}
                onChange={(value) => setSortOrder(value as 'asc' | 'desc')}
                data={[
                  { value: 'asc', label: 'Ascending' },
                  { value: 'desc', label: 'Descending' }
                ]}
                w={120}
              />
            </Group>

            <Group>
              {selectedFitments.length > 0 && (
                <Button
                  leftSection={<IconTrash size={16} />}
                  color="red"
                  variant="light"
                  onClick={() => setDeleteModalOpen(true)}
                >
                  Delete ({selectedFitments.length})
                </Button>
              )}
              <Button leftSection={<IconDownload size={16} />} variant="filled">
                Export CSV
              </Button>
            </Group>
          </Group>

          {/* Selection Summary */}
          {selectedFitments.length > 0 && (
            <Group justify="space-between" p="sm" style={{ backgroundColor: 'var(--mantine-color-blue-0)', borderRadius: 4 }}>
              <Text size="sm" fw={500}>
                {selectedFitments.length} of {mockFitments.length} fitments selected
              </Text>
              <Button size="xs" variant="light" onClick={() => setSelectedFitments([])}>
                Clear Selection
              </Button>
            </Group>
          )}

          {/* Table */}
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <Checkbox
                      checked={selectedFitments.length === mockFitments.length}
                      indeterminate={selectedFitments.length > 0 && selectedFitments.length < mockFitments.length}
                      onChange={(event) => handleSelectAll(event.currentTarget.checked)}
                    />
                  </Table.Th>
                  <Table.Th>Part ID</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Vehicle</Table.Th>
                  <Table.Th>Part Type</Table.Th>
                  <Table.Th>Position</Table.Th>
                  <Table.Th>Title</Table.Th>
                  {expandedView && (
                    <>
                      <Table.Th>Description</Table.Th>
                      <Table.Th>Quantity</Table.Th>
                      <Table.Th>Lift Height</Table.Th>
                      <Table.Th>Wheel Type</Table.Th>
                      <Table.Th>Updated</Table.Th>
                    </>
                  )}
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {mockFitments.map((fitment) => (
                  <Table.Tr key={fitment.hash}>
                    <Table.Td>
                      <Checkbox
                        checked={selectedFitments.includes(fitment.hash)}
                        onChange={(event) => handleSelectFitment(fitment.hash, event.currentTarget.checked)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{fitment.partId}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color={getStatusColor(fitment.itemStatus)} size="sm">
                        {fitment.itemStatus}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text size="sm" fw={500}>{fitment.year} {fitment.makeName} {fitment.modelName}</Text>
                        <Text size="xs" c="dimmed">{fitment.subModelName} • {fitment.driveTypeName}</Text>
                      </div>
                    </Table.Td>
                    <Table.Td>{fitment.partTypeDescriptor}</Table.Td>
                    <Table.Td>{fitment.position}</Table.Td>
                    <Table.Td>{fitment.fitmentTitle}</Table.Td>
                    {expandedView && (
                      <>
                        <Table.Td>
                          <Text size="sm" truncate="end" maw={200}>
                            {fitment.fitmentDescription}
                          </Text>
                        </Table.Td>
                        <Table.Td>{fitment.quantity}</Table.Td>
                        <Table.Td>{fitment.liftHeight}</Table.Td>
                        <Table.Td>{fitment.wheelType}</Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {new Date(fitment.updatedAt).toLocaleDateString()}
                          </Text>
                        </Table.Td>
                      </>
                    )}
                    <Table.Td>
                      <Menu shadow="md" width={200}>
                        <Menu.Target>
                          <ActionIcon variant="light" size="sm">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconEye size={14} />}>
                            View Details
                          </Menu.Item>
                          <Menu.Item leftSection={<IconEdit size={14} />}>
                            Edit Fitment
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item leftSection={<IconTrash size={14} />} color="red">
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          {/* Pagination */}
          <Flex justify="space-between" align="center">
            <Text size="sm" c="dimmed">
              Showing 1-{mockFitments.length} of {mockFitments.length} fitments
            </Text>
            <Pagination value={currentPage} onChange={setCurrentPage} total={5} />
          </Flex>
        </Stack>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Deletion"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete {selectedFitments.length} fitment{selectedFitments.length !== 1 ? 's' : ''}? 
            This action cannot be undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleBulkDelete}>
              Delete Fitments
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  )
}