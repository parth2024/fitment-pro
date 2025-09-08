import { useState } from 'react'
import { 
  Card, 
  Title, 
  Text, 
  Button, 
  Select, 
  Group,
  Stack,
  Table,
  Badge,
  Checkbox,
  Radio,
  Divider,
  Alert,
  Flex,
  Pagination
} from '@mantine/core'
import { IconBulb, IconChartDots, IconPlus, IconRefresh } from '@tabler/icons-react'

export default function PotentialFitments() {
  const [selectedPart, setSelectedPart] = useState<string>('')
  const [method, setMethod] = useState<string>('similarity')
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)

  // Mock parts data
  const mockParts = [
    { id: 'P-12345', description: 'Premium Brake Pad Set', status: 0 },
    { id: 'P-67890', description: 'Performance Air Filter', status: 0 },
    { id: 'P-11111', description: 'Oil Filter Assembly', status: 1 },
    { id: 'P-22222', description: 'Carbon Fiber Intake', status: 0 },
    { id: 'P-33333', description: 'Sport Suspension Kit', status: 0 }
  ]

  // Mock potential configurations based on your specification
  const mockPotentialConfigs = [
    {
      id: 'cfg-2001',
      year: 2024,
      make: 'Acura',
      model: 'ADX',
      submodel: 'Type S',
      driveType: 'AWD',
      fuelType: 'Gas',
      numDoors: 4,
      bodyType: 'Crossover',
      relevance: 95,
      reason: 'Same base vehicle, different trim'
    },
    {
      id: 'cfg-2002',
      year: 2023,
      make: 'Acura',
      model: 'ADX',
      submodel: 'Advance',
      driveType: 'AWD',
      fuelType: 'Gas',
      numDoors: 4,
      bodyType: 'Crossover',
      relevance: 92,
      reason: 'Same model, previous year'
    },
    {
      id: 'cfg-2003',
      year: 2025,
      make: 'Acura',
      model: 'MDX',
      submodel: 'Advance',
      driveType: 'AWD',
      fuelType: 'Gas',
      numDoors: 4,
      bodyType: 'SUV',
      relevance: 78,
      reason: 'Same make, similar platform'
    },
    {
      id: 'cfg-2004',
      year: 2024,
      make: 'Honda',
      model: 'Pilot',
      submodel: 'Touring',
      driveType: 'AWD',
      fuelType: 'Gas',
      numDoors: 4,
      bodyType: 'SUV',
      relevance: 72,
      reason: 'Similar engine and drivetrain'
    },
    {
      id: 'cfg-2005',
      year: 2024,
      make: 'Toyota',
      model: 'Highlander',
      submodel: 'Limited',
      driveType: 'AWD',
      fuelType: 'Gas',
      numDoors: 4,
      bodyType: 'SUV',
      relevance: 68,
      reason: 'Similar segment and specs'
    }
  ]

  const getRelevanceColor = (relevance: number) => {
    if (relevance >= 90) return 'green'
    if (relevance >= 75) return 'yellow'
    if (relevance >= 60) return 'orange'
    return 'red'
  }

  const getRelevanceLabel = (relevance: number) => {
    if (relevance >= 90) return 'Excellent Match'
    if (relevance >= 75) return 'Good Match'
    if (relevance >= 60) return 'Fair Match'
    return 'Poor Match'
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedConfigs(mockPotentialConfigs.map(c => c.id))
    } else {
      setSelectedConfigs([])
    }
  }

  const handleSelectConfig = (configId: string, checked: boolean) => {
    if (checked) {
      setSelectedConfigs(prev => [...prev, configId])
    } else {
      setSelectedConfigs(prev => prev.filter(id => id !== configId))
    }
  }

  const applySelectedFitments = () => {
    console.log('Applying fitments to selected configurations:', selectedConfigs)
    alert(`Redirecting to Apply Fitments page with ${selectedConfigs.length} pre-selected configurations`)
    // Here you would navigate to Apply Fitments page with pre-filled config IDs
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <Stack gap="lg">
        {/* Header */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={2}>Potential Fitments</Title>
              <Text c="dimmed">Discover potential fitments using AI-powered similarity algorithms</Text>
            </div>
            <IconBulb size={28} color="var(--mantine-color-yellow-6)" />
          </Group>

          <Alert icon={<IconBulb size={16} />} color="blue" mb="lg">
            Our algorithms analyze existing fitments to suggest new vehicle configurations that could be compatible with your selected part.
          </Alert>
        </Card>

        {/* Configuration */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Configuration</Title>
          
          <Stack gap="md">
            <Select
              label="Select Part"
              placeholder="Choose a part to analyze"
              value={selectedPart}
              onChange={(value) => setSelectedPart(value || '')}
              data={mockParts.map(part => ({
                value: part.id,
                label: `${part.id} - ${part.description}${part.status !== 0 ? ' (Inactive)' : ''}`
              }))}
              searchable
              required
            />

            <div>
              <Text fw={500} size="sm" mb="xs">Analysis Method</Text>
              <Radio.Group value={method} onChange={setMethod}>
                <Stack gap="xs">
                  <Radio 
                    value="similarity" 
                    label={
                      <div>
                        <Text fw={500}>Similarity Analysis</Text>
                        <Text size="xs" c="dimmed">Find vehicles with similar make, model, and year patterns</Text>
                      </div>
                    }
                  />
                  <Radio 
                    value="base-vehicle" 
                    label={
                      <div>
                        <Text fw={500}>Base Vehicle Analysis</Text>
                        <Text size="xs" c="dimmed">Find other configurations of the same base vehicle platform</Text>
                      </div>
                    }
                  />
                </Stack>
              </Radio.Group>
            </div>

            <Group>
              <Button 
                leftSection={<IconChartDots size={16} />}
                disabled={!selectedPart}
              >
                Analyze Potential Fitments
              </Button>
              <Button 
                leftSection={<IconRefresh size={16} />}
                variant="light"
                onClick={() => {
                  setSelectedPart('')
                  setSelectedConfigs([])
                }}
              >
                Reset
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* Results */}
        {selectedPart && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" mb="md">
              <div>
                <Title order={3}>Potential Vehicle Configurations</Title>
                <Text c="dimmed">
                  Analysis for {mockParts.find(p => p.id === selectedPart)?.description} using {method} method
                </Text>
              </div>
              {selectedConfigs.length > 0 && (
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={applySelectedFitments}
                >
                  Apply Selected ({selectedConfigs.length})
                </Button>
              )}
            </Group>

            {/* Selection Summary */}
            {selectedConfigs.length > 0 && (
              <Group justify="space-between" p="sm" mb="md" style={{ backgroundColor: 'var(--mantine-color-blue-0)', borderRadius: 4 }}>
                <Text size="sm" fw={500}>
                  {selectedConfigs.length} of {mockPotentialConfigs.length} configurations selected
                </Text>
                <Button size="xs" variant="light" onClick={() => setSelectedConfigs([])}>
                  Clear Selection
                </Button>
              </Group>
            )}

            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <Checkbox
                      checked={selectedConfigs.length === mockPotentialConfigs.length}
                      indeterminate={selectedConfigs.length > 0 && selectedConfigs.length < mockPotentialConfigs.length}
                      onChange={(event) => handleSelectAll(event.currentTarget.checked)}
                    />
                  </Table.Th>
                  <Table.Th>Vehicle</Table.Th>
                  <Table.Th>Specifications</Table.Th>
                  <Table.Th>Relevance</Table.Th>
                  <Table.Th>Match Quality</Table.Th>
                  <Table.Th>Reason</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {mockPotentialConfigs.map((config) => (
                  <Table.Tr key={config.id}>
                    <Table.Td>
                      <Checkbox
                        checked={selectedConfigs.includes(config.id)}
                        onChange={(event) => handleSelectConfig(config.id, event.currentTarget.checked)}
                      />
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text fw={500}>{config.year} {config.make} {config.model}</Text>
                        <Text size="xs" c="dimmed">{config.submodel}</Text>
                      </div>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={2}>
                        <Group gap="xs">
                          <Badge variant="light" size="xs">{config.driveType}</Badge>
                          <Badge variant="light" size="xs">{config.fuelType}</Badge>
                        </Group>
                        <Text size="xs" c="dimmed">
                          {config.numDoors} doors • {config.bodyType}
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs" align="center">
                        <Text fw={500} size="lg">{config.relevance}%</Text>
                        <div style={{ width: 60 }}>
                          <div 
                            style={{
                              height: 4,
                              backgroundColor: 'var(--mantine-color-gray-3)',
                              borderRadius: 2,
                              overflow: 'hidden'
                            }}
                          >
                            <div 
                              style={{
                                height: '100%',
                                width: `${config.relevance}%`,
                                backgroundColor: `var(--mantine-color-${getRelevanceColor(config.relevance)}-6)`,
                                transition: 'width 0.3s ease'
                              }}
                            />
                          </div>
                        </div>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge 
                        color={getRelevanceColor(config.relevance)}
                        variant="light"
                        size="sm"
                      >
                        {getRelevanceLabel(config.relevance)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">{config.reason}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {/* Pagination */}
            <Flex justify="space-between" align="center" mt="md">
              <Text size="sm" c="dimmed">
                Showing {mockPotentialConfigs.length} potential configurations
              </Text>
              <Pagination value={currentPage} onChange={setCurrentPage} total={3} />
            </Flex>
          </Card>
        )}

        {/* Method Info */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={4} mb="md">Analysis Methods</Title>
          <Stack gap="md">
            <div>
              <Text fw={500} mb="xs">Similarity Analysis</Text>
              <Text size="sm" c="dimmed">
                Analyzes patterns in existing fitments to find vehicles with similar characteristics (make, model, year range, drivetrain). 
                Uses machine learning to score compatibility based on historical fitting success.
              </Text>
            </div>
            <Divider />
            <div>
              <Text fw={500} mb="xs">Base Vehicle Analysis</Text>
              <Text size="sm" c="dimmed">
                Identifies vehicles that share the same platform or base vehicle ID. These typically have identical mounting points 
                and mechanical compatibility, making them excellent candidates for new fitments.
              </Text>
            </div>
          </Stack>
        </Card>
      </Stack>
    </div>
  )
}