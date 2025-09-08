import { AppShell, Container, Tabs, Title, Badge } from '@mantine/core'
import { IconCar, IconTable, IconUpload, IconChartBar, IconBulb, IconSettings } from '@tabler/icons-react'
import ApplyFitments from './pages/ApplyFitments'
import Fitments from './pages/Fitments'
import BulkUpload from './pages/BulkUpload'
import Coverage from './pages/Coverage'
import PotentialFitments from './pages/PotentialFitments'
import Admin from './pages/Admin'

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

            <Tabs.Panel value="fitments">
              <Fitments />
            </Tabs.Panel>

            <Tabs.Panel value="bulk">
              <BulkUpload />
            </Tabs.Panel>

            <Tabs.Panel value="coverage">
              <Coverage />
            </Tabs.Panel>

            <Tabs.Panel value="potential">
              <PotentialFitments />
            </Tabs.Panel>

            <Tabs.Panel value="admin">
              <Admin />
            </Tabs.Panel>
          </Tabs>
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

export default App