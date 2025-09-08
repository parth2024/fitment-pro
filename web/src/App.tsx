import { AppShell, Container, Tabs, Title, Text, Badge } from '@mantine/core'
import { IconCar, IconTable, IconUpload, IconChartBar, IconBulb, IconSettings } from '@tabler/icons-react'

function App() {
  return (
    <AppShell header={{ height: 60 }} padding="md">
      <AppShell.Header>
        <Container size="xl" h="100%" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <IconCar size={28} />
            <Title order={3}>Mass Fitment Tool</Title>
            <Badge variant="light" color="blue">v2.0</Badge>
          </div>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl">
          <Tabs defaultValue="apply" orientation="horizontal">
            <Tabs.List>
              <Tabs.Tab value="apply" leftSection={<IconCar size={16} />}>
                Apply Fitments
              </Tabs.Tab>
              <Tabs.Tab value="fitments" leftSection={<IconTable size={16} />}>
                Fitments
              </Tabs.Tab>
              <Tabs.Tab value="bulk" leftSection={<IconUpload size={16} />}>
                Bulk Upload
              </Tabs.Tab>
              <Tabs.Tab value="coverage" leftSection={<IconChartBar size={16} />}>
                Coverage
              </Tabs.Tab>
              <Tabs.Tab value="potential" leftSection={<IconBulb size={16} />}>
                Potential Fitments
              </Tabs.Tab>
              <Tabs.Tab value="admin" leftSection={<IconSettings size={16} />}>
                Admin
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="apply" pt="xl">
              <Title order={2} mb="md">Apply Fitments</Title>
              <Text c="dimmed">Configure vehicle fitments for specific parts</Text>
            </Tabs.Panel>

            <Tabs.Panel value="fitments" pt="xl">
              <Title order={2} mb="md">Fitments Management</Title>
              <Text c="dimmed">View and manage existing fitments</Text>
            </Tabs.Panel>

            <Tabs.Panel value="bulk" pt="xl">
              <Title order={2} mb="md">Bulk Upload</Title>
              <Text c="dimmed">Upload CSV files to import fitments in bulk</Text>
            </Tabs.Panel>

            <Tabs.Panel value="coverage" pt="xl">
              <Title order={2} mb="md">Coverage Analysis</Title>
              <Text c="dimmed">Analyze fitment coverage across vehicle configurations</Text>
            </Tabs.Panel>

            <Tabs.Panel value="potential" pt="xl">
              <Title order={2} mb="md">Potential Fitments</Title>
              <Text c="dimmed">Discover potential fitments using similarity algorithms</Text>
            </Tabs.Panel>

            <Tabs.Panel value="admin" pt="xl">
              <Title order={2} mb="md">Admin Panel</Title>
              <Text c="dimmed">Manage data imports, exports, and system configuration</Text>
            </Tabs.Panel>
          </Tabs>
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

export default App