import { AppShell, Container, Tabs, Title, Badge } from '@mantine/core'
import { IconCar, IconTable, IconUpload, IconChartBar, IconBulb, IconSettings } from '@tabler/icons-react'
import ApplyFitments from './pages/ApplyFitments'

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

            <Tabs.Panel value="apply">
              <ApplyFitments />
            </Tabs.Panel>

            <Tabs.Panel value="fitments" pt="xl">
              <Title order={2} mb="md">Fitments Management</Title>
              <div>Coming soon - Table with pagination, sorting, and bulk actions</div>
            </Tabs.Panel>

            <Tabs.Panel value="bulk" pt="xl">
              <Title order={2} mb="md">Bulk Upload</Title>
              <div>Coming soon - CSV upload with validation</div>
            </Tabs.Panel>

            <Tabs.Panel value="coverage" pt="xl">
              <Title order={2} mb="md">Coverage Analysis</Title>
              <div>Coming soon - Charts showing fitment coverage</div>
            </Tabs.Panel>

            <Tabs.Panel value="potential" pt="xl">
              <Title order={2} mb="md">Potential Fitments</Title>
              <div>Coming soon - AI-powered similarity recommendations</div>
            </Tabs.Panel>

            <Tabs.Panel value="admin" pt="xl">
              <Title order={2} mb="md">Admin Panel</Title>
              <div>Coming soon - Data import/export and system management</div>
            </Tabs.Panel>
          </Tabs>
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

export default App