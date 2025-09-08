import { useState } from 'react'
import { 
  Card, 
  Title, 
  Text, 
  NumberInput, 
  Button, 
  Group,
  Stack,
  Table,
  Progress,
  Badge,
  Select,
  Grid
} from '@mantine/core'
import { IconChartBar, IconDownload, IconRefresh, IconCar } from '@tabler/icons-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function Coverage() {
  const [yearFrom, setYearFrom] = useState(2020)
  const [yearTo, setYearTo] = useState(2025)
  const [sortBy, setSortBy] = useState('make')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  // Mock coverage data based on your specification
  const mockCoverageData = [
    { 
      make: 'Acura', 
      configsCount: 150, 
      fittedConfigsCount: 120, 
      coveragePercent: 80,
      models: ['ADX', 'MDX', 'TLX']
    },
    { 
      make: 'Toyota', 
      configsCount: 380, 
      fittedConfigsCount: 342, 
      coveragePercent: 90,
      models: ['RAV4', 'Camry', 'Prius', 'Highlander']
    },
    { 
      make: 'Ford', 
      configsCount: 280, 
      fittedConfigsCount: 210, 
      coveragePercent: 75,
      models: ['F-150', 'Explorer', 'Mustang']
    },
    { 
      make: 'Jeep', 
      configsCount: 120, 
      fittedConfigsCount: 96, 
      coveragePercent: 80,
      models: ['Wrangler', 'Cherokee', 'Grand Cherokee']
    },
    { 
      make: 'Honda', 
      configsCount: 320, 
      fittedConfigsCount: 272, 
      coveragePercent: 85,
      models: ['Accord', 'Civic', 'CR-V', 'Pilot']
    },
    { 
      make: 'Nissan', 
      configsCount: 200, 
      fittedConfigsCount: 140, 
      coveragePercent: 70,
      models: ['Altima', 'Sentra', 'Pathfinder']
    }
  ]

  const totalConfigs = mockCoverageData.reduce((sum, item) => sum + item.configsCount, 0)
  const totalFitted = mockCoverageData.reduce((sum, item) => sum + item.fittedConfigsCount, 0)
  const overallCoverage = Math.round((totalFitted / totalConfigs) * 100)

  const getBarColor = (percentage: number) => {
    if (percentage >= 85) return '#12B76A' // Green
    if (percentage >= 70) return '#F79009' // Orange
    return '#F04438' // Red
  }

  const getCoverageStatus = (percentage: number) => {
    if (percentage >= 85) return { label: 'Excellent', color: 'green' }
    if (percentage >= 70) return { label: 'Good', color: 'yellow' }
    return { label: 'Needs Attention', color: 'red' }
  }

  return (
    <div style={{ padding: '24px 0' }}>
      <Stack gap="lg">
        {/* Header & Controls */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={2}>Coverage Analysis</Title>
              <Text c="dimmed">Analyze fitment coverage across vehicle configurations</Text>
            </div>
            <Button leftSection={<IconDownload size={16} />} variant="light">
              Export Report
            </Button>
          </Group>

          <Group>
            <NumberInput
              label="Year From"
              value={yearFrom}
              onChange={(val) => setYearFrom(typeof val === 'number' ? val : 2020)}
              min={2010}
              max={2030}
              w={120}
            />
            <NumberInput
              label="Year To"
              value={yearTo}
              onChange={(val) => setYearTo(typeof val === 'number' ? val : 2025)}
              min={2010}
              max={2030}
              w={120}
            />
            <Button leftSection={<IconRefresh size={16} />} mt={25}>
              Update Analysis
            </Button>
          </Group>
        </Card>

        {/* Overall Stats */}
        <Grid>
          <Grid.Col span={4}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" size="sm">Total Configurations</Text>
                  <Title order={2}>{totalConfigs.toLocaleString()}</Title>
                </div>
                <IconCar size={32} color="var(--mantine-color-blue-6)" />
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" size="sm">Fitted Configurations</Text>
                  <Title order={2}>{totalFitted.toLocaleString()}</Title>
                </div>
                <IconChartBar size={32} color="var(--mantine-color-green-6)" />
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" size="sm">Overall Coverage</Text>
                  <Group align="center" gap="xs">
                    <Title order={2}>{overallCoverage}%</Title>
                    <Badge {...getCoverageStatus(overallCoverage)} size="sm">
                      {getCoverageStatus(overallCoverage).label}
                    </Badge>
                  </Group>
                </div>
                <div>
                  <Progress value={overallCoverage} size="lg" radius="xl" />
                </div>
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Coverage Chart */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">Coverage by Make</Title>
          <div style={{ height: 400 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockCoverageData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="make" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'coveragePercent' ? `${value}%` : value,
                    name === 'coveragePercent' ? 'Coverage' : 
                    name === 'fittedConfigsCount' ? 'Fitted' : 'Total'
                  ]}
                />
                <Bar dataKey="configsCount" fill="#E5E7EB" name="Total Configurations" />
                <Bar dataKey="fittedConfigsCount" name="Fitted Configurations">
                  {mockCoverageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.coveragePercent)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Detailed Table */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={3}>Detailed Coverage Report</Title>
            <Group>
              <Select
                placeholder="Sort by"
                value={sortBy}
                onChange={(value) => setSortBy(value || 'make')}
                data={[
                  { value: 'make', label: 'Make' },
                  { value: 'coveragePercent', label: 'Coverage %' },
                  { value: 'configsCount', label: 'Total Configs' },
                  { value: 'fittedConfigsCount', label: 'Fitted Configs' }
                ]}
                w={150}
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
          </Group>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Make</Table.Th>
                <Table.Th>Models</Table.Th>
                <Table.Th>Total Configurations</Table.Th>
                <Table.Th>Fitted Configurations</Table.Th>
                <Table.Th>Coverage</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {mockCoverageData.map((row, index) => (
                <Table.Tr key={index}>
                  <Table.Td>
                    <Text fw={500}>{row.make}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {row.models.join(', ')}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text>{row.configsCount.toLocaleString()}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>{row.fittedConfigsCount.toLocaleString()}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="sm">
                      <Progress 
                        value={row.coveragePercent} 
                        size="md" 
                        radius="xl" 
                        color={getBarColor(row.coveragePercent)}
                        style={{ flex: 1, minWidth: 80 }}
                      />
                      <Text fw={500} size="sm" style={{ minWidth: 40 }}>
                        {row.coveragePercent}%
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge 
                      color={getCoverageStatus(row.coveragePercent).color}
                      variant="light"
                      size="sm"
                    >
                      {getCoverageStatus(row.coveragePercent).label}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>
    </div>
  )
}