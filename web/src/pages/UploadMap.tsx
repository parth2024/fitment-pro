import { useState, useRef } from "react";
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Table,
  Badge,
  Center,
  rem,
} from "@mantine/core";
import {
  IconCloudUpload,
  IconWand,
  IconChecks,
  IconCheck,
} from "@tabler/icons-react";
import { uploadsService } from "../api/services";

export default function UploadMap() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleSelect = (f: File) => {
    setFile(f);
  };

  const doUpload = async () => {
    if (!file) return;
    const res = await uploadsService.create(file, { tenantId: "default" });
    setUploadId(res.data?.id);
  };

  const doAiMap = async () => {
    if (!uploadId) return;
    const res = await uploadsService.aiMap(uploadId);
    setSuggestions(res.data?.suggestions?.columnMappings || []);
  };

  const doValidate = async () => {
    if (!uploadId) return;
    await uploadsService.vcdbValidate(uploadId);
    alert("Validation job created");
  };

  return (
    <div style={{ padding: "24px 0" }}>
      <Stack gap="lg">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={2}>Upload & Map</Title>
          <Text c="dimmed">
            Upload your file, get AI mapping suggestions, and run VCDB
            validation.
          </Text>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">
            1. Upload
          </Title>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              border: "2px dashed var(--mantine-color-gray-4)",
              borderRadius: rem(8),
              padding: rem(40),
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.tsv,.xlsx"
              style={{ display: "none" }}
              onChange={(e) =>
                e.target.files?.[0] && handleSelect(e.target.files[0])
              }
            />
            <Center>
              <Stack align="center" gap="sm">
                <IconCloudUpload size={48} />
                <Text fw={500}>
                  {file ? file.name : "Select CSV/TSV/XLSX file"}
                </Text>
                <Group>
                  <Button disabled={!file} onClick={doUpload}>
                    Upload
                  </Button>
                  {uploadId && (
                    <Badge color="green" leftSection={<IconCheck size={12} />}>
                      Uploaded
                    </Badge>
                  )}
                </Group>
              </Stack>
            </Center>
          </div>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">
            2. AI Mapping
          </Title>
          <Group>
            <Button
              leftSection={<IconWand size={16} />}
              disabled={!uploadId}
              onClick={doAiMap}
            >
              Get Suggestions
            </Button>
          </Group>
          {suggestions.length > 0 && (
            <Table mt="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Source Column</Table.Th>
                  <Table.Th>VCDB Target</Table.Th>
                  <Table.Th>Confidence</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {suggestions.map((s, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>{s.source}</Table.Td>
                    <Table.Td>{s.target}</Table.Td>
                    <Table.Td>
                      <Badge>{Math.round((s.confidence || 0) * 100)}%</Badge>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">
            3. VCDB Validate
          </Title>
          <Group>
            <Button
              leftSection={<IconChecks size={16} />}
              disabled={!uploadId}
              onClick={doValidate}
            >
              Run Validation
            </Button>
          </Group>
        </Card>
      </Stack>
    </div>
  );
}
