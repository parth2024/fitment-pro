import { AppShell, Container, Tabs, Title, Badge, Group } from '@mantine/core'
import { IconCar, IconTable, IconUpload, IconChartBar, IconBulb, IconSettings } from '@tabler/icons-react'
import ApplyFitments from './pages/ApplyFitments'
import Fitments from './pages/Fitments'
import BulkUpload from './pages/BulkUpload'
import Coverage from './pages/Coverage'
import PotentialFitments from './pages/PotentialFitments'
import Admin from './pages/Admin'

function App() {
  return (
    <AppShell 
      header={{ height: 80 }} 
      padding="0"
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
      }}
    >
      <AppShell.Header 
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
          borderBottom: '2px solid #e2e8f0',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Container size="xl" h="100%" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Group gap="lg">
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
              borderRadius: '16px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <IconCar size={28} color="white" />
            </div>
            <div>
              <Title order={2} style={{ 
                background: 'linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                fontWeight: 700,
                marginBottom: '4px'
              }}>
                Mass Fitment Tool
              </Title>
              <Badge 
                variant="gradient" 
                gradient={{ from: 'primary.6', to: 'secondary.6', deg: 135 }}
                size="lg"
                radius="lg"
                style={{ fontWeight: 600 }}
              >
                v2.0
              </Badge>
            </div>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Container size="xl" style={{ padding: 0 }}>
          <Tabs defaultValue="apply" orientation="horizontal">
            <Tabs.List 
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                border: 'none',
                borderBottom: '2px solid #e2e8f0',
                padding: '16px 24px 0',
                marginBottom: '0'
              }}
            >
              <Tabs.Tab 
                value="apply" 
                leftSection={<IconCar size={16} />}
                style={{
                  fontWeight: 600,
                  fontSize: '15px',
                  padding: '16px 24px',
                  borderRadius: '12px 12px 0 0',
                  transition: 'all 0.2s ease'
                }}
              >
                Apply Fitments
              </Tabs.Tab>
              <Tabs.Tab 
                value="fitments" 
                leftSection={<IconTable size={16} />}
                style={{
                  fontWeight: 600,
                  fontSize: '15px',
                  padding: '16px 24px',
                  borderRadius: '12px 12px 0 0',
                  transition: 'all 0.2s ease'
                }}
              >
                Fitments
              </Tabs.Tab>
              <Tabs.Tab 
                value="bulk" 
                leftSection={<IconUpload size={16} />}
                style={{
                  fontWeight: 600,
                  fontSize: '15px',
                  padding: '16px 24px',
                  borderRadius: '12px 12px 0 0',
                  transition: 'all 0.2s ease'
                }}
              >
                Bulk Upload
              </Tabs.Tab>
              <Tabs.Tab 
                value="coverage" 
                leftSection={<IconChartBar size={16} />}
                style={{
                  fontWeight: 600,
                  fontSize: '15px',
                  padding: '16px 24px',
                  borderRadius: '12px 12px 0 0',
                  transition: 'all 0.2s ease'
                }}
              >
                Coverage
              </Tabs.Tab>
              <Tabs.Tab 
                value="potential" 
                leftSection={<IconBulb size={16} />}
                style={{
                  fontWeight: 600,
                  fontSize: '15px',
                  padding: '16px 24px',
                  borderRadius: '12px 12px 0 0',
                  transition: 'all 0.2s ease'
                }}
              >
                Potential Fitments
              </Tabs.Tab>
              <Tabs.Tab 
                value="admin" 
                leftSection={<IconSettings size={16} />}
                style={{
                  fontWeight: 600,
                  fontSize: '15px',
                  padding: '16px 24px',
                  borderRadius: '12px 12px 0 0',
                  transition: 'all 0.2s ease'
                }}
              >
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