import { useState, useEffect } from 'react'
import { 
  Grid, 
  Card, 
  Title, 
  Text, 
  Select, 
  NumberInput, 
  Button, 
  Table, 
  Checkbox, 
  TextInput, 
  Textarea,
  Group,
  Stack,
  Divider,
  Badge,
  ActionIcon,
  ScrollArea
} from '@mantine/core'
import { IconSearch, IconDownload, IconCar, IconSettings } from '@tabler/icons-react'
import { vcdbService, partsService, fitmentsService } from '../api/services'
import { useApi, useAsyncOperation } from '../hooks/useApi'
import toast from 'react-hot-toast'

export default function ApplyFitments() {
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>([])
  const [filters, setFilters] = useState({
    yearFrom: 2020,
    yearTo: 2025,
    make: '',
    model: '',
    submodel: '',
    driveType: '',
    fuelType: '',
    numDoors: '',
    bodyType: ''
  })
  const [fitmentForm, setFitmentForm] = useState({
    partId: '',
    partTypeId: '',
    position: '',
    quantity: 1,
    wheelType: '',
    liftHeight: '',
    wheelDiameter1: '',
    wheelDiameter2: '',
    wheelDiameter3: '',
    tireDiameter1: '',
    tireDiameter2: '',
    tireDiameter3: '',
    backspacing1: '',
    backspacing2: '',
    backspacing3: '',
    title: '',
    description: '',
    notes: ''
  })

  // API hooks
  const { data: yearRange } = useApi(() => vcdbService.getYearRange(), [])
  const { data: parts } = useApi(() => partsService.getParts({ 'with-fitments': false }), [])
  const { data: partTypes } = useApi(() => partsService.getPartTypes(), [])
  const { data: configurationsData, loading: configsLoading, refetch: refetchConfigs } = useApi(
    () => vcdbService.getConfigurations(filters),
    [filters]
  )
  const { execute: applyFitment, loading: applyingFitment } = useAsyncOperation()

  // Update year range when data loads
  useEffect(() => {
    if (yearRange) {
      setFilters(prev => ({
        ...prev,
        yearFrom: yearRange.minYear,
        yearTo: yearRange.maxYear
      }))
    }
  }, [yearRange])

  const configurations = configurationsData?.configurations || []

  const positions = ['Front', 'Rear', 'Front Left', 'Front Right', 'Rear Left', 'Rear Right']
  const wheelTypes = ['Steel', 'Alloy', 'Forged', 'Carbon Fiber']
  const liftHeights = ['Stock', '0-1in', '1-2in', '2-3in', '3-4in', '4+in']

  const handleSearchVehicles = async () => {
    try {
      await refetchConfigs()
      toast.success('Vehicle configurations updated')
    } catch (error) {
      toast.error('Failed to fetch configurations')
    }
  }

  const handleApplyFitment = async () => {
    if (selectedConfigs.length === 0 || !fitmentForm.partId || !fitmentForm.partTypeId) {
      toast.error('Please select configurations and complete the fitment form')
      return
    }

    const fitmentData = {
      partIDs: [fitmentForm.partId],
      partTypeID: fitmentForm.partTypeId,
      configurationIDs: selectedConfigs,
      quantity: fitmentForm.quantity,
      position: fitmentForm.position,
      liftHeight: fitmentForm.liftHeight,
      wheelType: fitmentForm.wheelType,
      wheelParameters: [
        {
          wheelDiameter: fitmentForm.wheelDiameter1,
          tireDiameter: fitmentForm.tireDiameter1,
          backspacing: fitmentForm.backspacing1
        },
        {
          wheelDiameter: fitmentForm.wheelDiameter2,
          tireDiameter: fitmentForm.tireDiameter2,
          backspacing: fitmentForm.backspacing2
        },
        {
          wheelDiameter: fitmentForm.wheelDiameter3,
          tireDiameter: fitmentForm.tireDiameter3,
          backspacing: fitmentForm.backspacing3
        }
      ].filter(param => param.wheelDiameter || param.tireDiameter || param.backspacing),
      title: fitmentForm.title,
      description: fitmentForm.description,
      notes: fitmentForm.notes
    }

    const result = await applyFitment(() => fitmentsService.createFitment(fitmentData))
    if (result) {
      toast.success(`Fitment applied to ${selectedConfigs.length} configurations`)
      setSelectedConfigs([])
      setFitmentForm({
        partId: '',
        partTypeId: '',
        position: '',
        quantity: 1,
        wheelType: '',
        liftHeight: '',
        wheelDiameter1: '',
        wheelDiameter2: '',
        wheelDiameter3: '',
        tireDiameter1: '',
        tireDiameter2: '',
        tireDiameter3: '',
        backspacing1: '',
        backspacing2: '',
        backspacing3: '',
        title: '',
        description: '',
        notes: ''
      })
    }
  }

  return (
    <div style={{ 
      padding: '32px 24px', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      minHeight: 'calc(100vh - 64px)'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: 700, 
          background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px',
          margin: 0
        }}>
          Apply Fitments
        </h1>
        <p style={{ 
          color: '#64748b', 
          fontSize: '18px', 
          margin: 0,
          fontWeight: 400
        }}>
          Apply automotive parts to compatible vehicle configurations
        </p>
      </div>
      
      <Grid gutter="xl">
        {/* Left Pane: Vehicle Configuration Filters */}
        <Grid.Col span={4}>
          <Card 
            shadow="lg" 
            padding="xl" 
            radius="xl" 
            withBorder
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid #e2e8f0',
              transition: 'all 0.3s ease',
            }}
          >
            <Group justify="space-between" mb="xl">
              <div>
                <Title order={3} style={{ 
                  color: '#1e293b', 
                  fontWeight: 700,
                  marginBottom: '4px'
                }}>
                  Vehicle Filters
                </Title>
                <Text size="sm" c="dimmed" style={{ fontWeight: 500 }}>
                  Specify target configurations
                </Text>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconCar size={20} color="white" />
              </div>
            </Group>
            
            <Stack gap="md">
              <Group grow>
                <NumberInput
                  label="Year From"
                  value={filters.yearFrom}
                  onChange={(val) => setFilters(prev => ({ ...prev, yearFrom: typeof val === 'number' ? val : 2020 }))}
                  min={2010}
                  max={2030}
                />
                <NumberInput
                  label="Year To"
                  value={filters.yearTo}
                  onChange={(val) => setFilters(prev => ({ ...prev, yearTo: typeof val === 'number' ? val : 2025 }))}
                  min={2010}
                  max={2030}
                />
              </Group>

              <Select
                label="Make"
                placeholder="Select make"
                value={filters.make}
                onChange={(val) => setFilters(prev => ({ ...prev, make: val || '' }))}
                data={['Acura', 'Toyota', 'Ford', 'Jeep', 'Honda', 'Nissan']}
                searchable
                clearable
              />

              <Select
                label="Model"
                placeholder="Select model"
                value={filters.model}
                onChange={(val) => setFilters(prev => ({ ...prev, model: val || '' }))}
                data={['ADX', 'RAV4', 'F-150', 'Wrangler', 'Accord', 'Altima']}
                searchable
                clearable
              />

              <Select
                label="Submodel"
                placeholder="Select submodel"
                value={filters.submodel}
                onChange={(val) => setFilters(prev => ({ ...prev, submodel: val || '' }))}
                data={['Advance', 'XLE', 'Lariat', 'Rubicon', 'Sport', 'Touring']}
                searchable
                clearable
              />

              <Group grow>
                <Select
                  label="Drive Type"
                  placeholder="Select drive type"
                  value={filters.driveType}
                  onChange={(val) => setFilters(prev => ({ ...prev, driveType: val || '' }))}
                  data={['AWD', 'FWD', 'RWD', '4WD']}
                  clearable
                />
                <Select
                  label="Fuel Type"
                  placeholder="Select fuel type"
                  value={filters.fuelType}
                  onChange={(val) => setFilters(prev => ({ ...prev, fuelType: val || '' }))}
                  data={['Gas', 'Hybrid', 'Electric', 'Diesel']}
                  clearable
                />
              </Group>

              <Group grow>
                <Select
                  label="Doors"
                  placeholder="Number of doors"
                  value={filters.numDoors}
                  onChange={(val) => setFilters(prev => ({ ...prev, numDoors: val || '' }))}
                  data={['2', '4', '5']}
                  clearable
                />
                <Select
                  label="Body Type"
                  placeholder="Select body type"
                  value={filters.bodyType}
                  onChange={(val) => setFilters(prev => ({ ...prev, bodyType: val || '' }))}
                  data={['Sedan', 'SUV', 'Crossover', 'Truck', 'Coupe', 'Hatchback']}
                  clearable
                />
              </Group>

              <Button 
                fullWidth 
                leftSection={<IconSearch size={16} />}
                variant="gradient"
                gradient={{ from: 'primary.6', to: 'secondary.6', deg: 135 }}
                onClick={handleSearchVehicles}
                loading={configsLoading}
                size="lg"
                radius="lg"
                style={{
                  fontWeight: 600,
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease'
                }}
              >
                Display Vehicles
              </Button>
            </Stack>
          </Card>
        </Grid.Col>

        {/* Center Pane: Matched Vehicle Configurations */}
        <Grid.Col span={4}>
          <Card 
            shadow="lg" 
            padding="xl" 
            radius="xl" 
            withBorder 
            h="100%"
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid #e2e8f0',
              transition: 'all 0.3s ease',
            }}
          >
            <Group justify="space-between" mb="xl">
              <div>
                <Title order={3} style={{ 
                  color: '#1e293b', 
                  fontWeight: 700,
                  marginBottom: '4px'
                }}>
                  Vehicle Configurations
                </Title>
                <Text size="sm" style={{ 
                  color: '#64748b',
                  fontWeight: 500,
                  background: configurations.length > 0 ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#6b7280',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  {configurations.length} configurations found
                </Text>
              </div>
              <ActionIcon 
                variant="gradient" 
                gradient={{ from: 'primary.6', to: 'secondary.6', deg: 135 }}
                size="lg"
                radius="lg"
                style={{
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease',
                }}
              >
                <IconDownload size={18} />
              </ActionIcon>
            </Group>

            <ScrollArea h={400}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>
                      <Checkbox
                        checked={selectedConfigs.length === configurations.length}
                        indeterminate={selectedConfigs.length > 0 && selectedConfigs.length < configurations.length}
                        onChange={(event) => {
                          if (event.currentTarget.checked) {
                            setSelectedConfigs(configurations.map((config: any) => config.id))
                          } else {
                            setSelectedConfigs([])
                          }
                        }}
                      />
                    </Table.Th>
                    <Table.Th>Year</Table.Th>
                    <Table.Th>Make</Table.Th>
                    <Table.Th>Model</Table.Th>
                    <Table.Th>Submodel</Table.Th>
                    <Table.Th>Drive</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {configurations.map((config: any) => (
                    <Table.Tr key={config.id}>
                      <Table.Td>
                        <Checkbox
                          checked={selectedConfigs.includes(config.id)}
                          onChange={(event) => {
                            if (event.currentTarget.checked) {
                              setSelectedConfigs(prev => [...prev, config.id])
                            } else {
                              setSelectedConfigs(prev => prev.filter(id => id !== config.id))
                            }
                          }}
                        />
                      </Table.Td>
                      <Table.Td>{config.year}</Table.Td>
                      <Table.Td>{config.make}</Table.Td>
                      <Table.Td>{config.model}</Table.Td>
                      <Table.Td>{config.submodel}</Table.Td>
                      <Table.Td>
                        <Badge variant="light" size="sm">{config.driveType}</Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            {selectedConfigs.length > 0 && (
              <Group justify="space-between" mt="xl" p="lg" style={{ 
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                borderRadius: '16px',
                border: '1px solid #93c5fd'
              }}>
                <Text size="sm" fw={600} style={{ 
                  color: '#1e40af',
                  fontSize: '14px'
                }}>
                  {selectedConfigs.length} of {configurations.length} selected
                </Text>
                <Button 
                  size="xs" 
                  variant="light" 
                  onClick={() => setSelectedConfigs([])}
                  radius="lg"
                  style={{
                    fontWeight: 500,
                    transition: 'all 0.2s ease'
                  }}
                >
                  Clear Selection
                </Button>
              </Group>
            )}
          </Card>
        </Grid.Col>

        {/* Right Pane: Define Part Fitment */}
        <Grid.Col span={4}>
          <Card 
            shadow="lg" 
            padding="xl" 
            radius="xl" 
            withBorder 
            h="100%"
            style={{
              background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              border: '1px solid #e2e8f0',
              transition: 'all 0.3s ease',
            }}
          >
            <Group justify="space-between" mb="xl">
              <div>
                <Title order={3} style={{ 
                  color: '#1e293b', 
                  fontWeight: 700,
                  marginBottom: '4px'
                }}>
                  Part Fitment
                </Title>
                <Text size="sm" c="dimmed" style={{ fontWeight: 500 }}>
                  Configure part application
                </Text>
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <IconSettings size={20} color="white" />
              </div>
            </Group>

            <Stack gap="md">
              <Select
                label="Part Name"
                placeholder="Select part"
                value={fitmentForm.partId}
                onChange={(value) => setFitmentForm(prev => ({ ...prev, partId: value || '' }))}
                data={(parts || []).map((part: any) => ({
                  value: part.id || part.hash,
                  label: `${part.id || part.hash} - ${part.description}${part.itemStatus !== 0 ? ' (Inactive)' : ''}`
                }))}
                searchable
              />

              <Select
                label="Part Type"
                placeholder="Select part type"
                value={fitmentForm.partTypeId}
                onChange={(value) => setFitmentForm(prev => ({ ...prev, partTypeId: value || '' }))}
                data={(partTypes || []).map((type: any) => ({
                  value: type.id,
                  label: type.description
                }))}
              />

              <Select
                label="Position"
                placeholder="Select position"
                value={fitmentForm.position}
                onChange={(value) => setFitmentForm(prev => ({ ...prev, position: value || '' }))}
                data={positions}
              />

              <Group grow>
                <NumberInput
                  label="Quantity"
                  placeholder="1"
                  min={1}
                  value={fitmentForm.quantity}
                  onChange={(val) => setFitmentForm(prev => ({ ...prev, quantity: typeof val === 'number' ? val : 1 }))}
                />
                <Select
                  label="Wheel Type"
                  placeholder="Select wheel type"
                  value={fitmentForm.wheelType}
                  onChange={(value) => setFitmentForm(prev => ({ ...prev, wheelType: value || '' }))}
                  data={wheelTypes}
                />
              </Group>

              <Select
                label="Lift Height"
                placeholder="Select lift height"
                value={fitmentForm.liftHeight}
                onChange={(value) => setFitmentForm(prev => ({ ...prev, liftHeight: value || '' }))}
                data={liftHeights}
              />

              <Divider label="Wheel Parameters" labelPosition="center" />

              <Grid>
                <Grid.Col span={4}><Text size="sm" fw={500}>Parameter</Text></Grid.Col>
                <Grid.Col span={8}><Text size="sm" fw={500}>Values</Text></Grid.Col>
                
                <Grid.Col span={4}><Text size="sm">Wheel Diameter</Text></Grid.Col>
                <Grid.Col span={8}>
                  <Group gap="xs">
                    <TextInput placeholder="18" size="xs" />
                    <TextInput placeholder="19" size="xs" />
                    <TextInput placeholder="20" size="xs" />
                  </Group>
                </Grid.Col>

                <Grid.Col span={4}><Text size="sm">Tire Diameter</Text></Grid.Col>
                <Grid.Col span={8}>
                  <Group gap="xs">
                    <TextInput placeholder="255/55R18" size="xs" />
                    <TextInput placeholder="275/50R19" size="xs" />
                    <TextInput placeholder="295/45R20" size="xs" />
                  </Group>
                </Grid.Col>

                <Grid.Col span={4}><Text size="sm">Backspacing</Text></Grid.Col>
                <Grid.Col span={8}>
                  <Group gap="xs">
                    <TextInput placeholder="35mm" size="xs" />
                    <TextInput placeholder="40mm" size="xs" />
                    <TextInput placeholder="45mm" size="xs" />
                  </Group>
                </Grid.Col>
              </Grid>

              <TextInput 
                label="Title" 
                placeholder="Standard fit"
                value={fitmentForm.title}
                onChange={(event) => setFitmentForm(prev => ({ ...prev, title: event.currentTarget.value }))}
              />
              <TextInput 
                label="Description" 
                placeholder="Works with OEM wheel"
                value={fitmentForm.description}
                onChange={(event) => setFitmentForm(prev => ({ ...prev, description: event.currentTarget.value }))}
              />
              <Textarea 
                label="Notes" 
                placeholder="Check brake clearance" 
                rows={3}
                value={fitmentForm.notes}
                onChange={(event) => setFitmentForm(prev => ({ ...prev, notes: event.currentTarget.value }))}
              />

              <Button 
                fullWidth 
                size="lg"
                variant="gradient"
                gradient={{ from: 'accent.6', to: 'success.6', deg: 135 }}
                disabled={selectedConfigs.length === 0 || !fitmentForm.partId || !fitmentForm.partTypeId}
                loading={applyingFitment}
                onClick={handleApplyFitment}
                radius="lg"
                style={{ 
                  marginTop: 24,
                  fontWeight: 600,
                  fontSize: '16px',
                  height: '48px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease'
                }}
              >
                Apply Fitment ({selectedConfigs.length} configs)
              </Button>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </div>
  )
}