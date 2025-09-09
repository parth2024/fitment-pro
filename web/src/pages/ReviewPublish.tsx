import { useEffect, useState } from "react";
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Table,
  Checkbox,
  Badge,
} from "@mantine/core";
import { reviewService, uploadsService } from "../api/services";

export default function ReviewPublish() {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [uploadId, setUploadId] = useState<string | null>(null);

  const load = async () => {
    const res = await reviewService.list({ status: "pending" });
    setItems(res.data?.items || []);
  };
  useEffect(() => {
    load();
  }, []);

  const approve = async () => {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (ids.length === 0) return;
    await reviewService.actions("approve", ids);
    setSelected({});
    await load();
  };

  const reject = async () => {
    const ids = Object.keys(selected).filter((k) => selected[k]);
    if (ids.length === 0) return;
    await reviewService.actions("reject", ids);
    setSelected({});
    await load();
  };

  const publish = async () => {
    if (!uploadId) {
      alert("Select a row to infer uploadId");
      return;
    }
    const res = await uploadsService.publish(uploadId);
    alert(`Published: ${res.data?.result?.publishedCount ?? 0}`);
  };

  return (
    <div style={{ padding: "24px 0" }}>
      <Stack gap="lg">
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={2}>Review & Publish</Title>
          <Text c="dimmed">
            Approve or reject pending items, then publish approved ones.
          </Text>
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Group>
              <Button onClick={approve}>Approve</Button>
              <Button color="red" onClick={reject}>
                Reject
              </Button>
            </Group>
            <Button color="green" onClick={publish}>
              Publish
            </Button>
          </Group>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>
                  <Checkbox
                    checked={
                      items.length > 0 && items.every((i) => selected[i.id])
                    }
                    indeterminate={
                      items.some((i) => selected[i.id]) &&
                      !items.every((i) => selected[i.id])
                    }
                    onChange={(e) => {
                      const c = e.currentTarget.checked;
                      const next: Record<string, boolean> = {};
                      items.forEach((i) => (next[i.id] = c));
                      setSelected(next);
                    }}
                  />
                </Table.Th>
                <Table.Th>ID</Table.Th>
                <Table.Th>Upload</Table.Th>
                <Table.Th>Row</Table.Th>
                <Table.Th>Confidence</Table.Th>
                <Table.Th>Status</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {items.map((i) => (
                <Table.Tr key={i.id} onClick={() => setUploadId(i.upload_id)}>
                  <Table.Td>
                    <Checkbox
                      checked={!!selected[i.id]}
                      onChange={(e) =>
                        setSelected((prev) => ({
                          ...prev,
                          [i.id]: e.currentTarget.checked,
                        }))
                      }
                    />
                  </Table.Td>
                  <Table.Td>{i.id}</Table.Td>
                  <Table.Td>{i.upload_id}</Table.Td>
                  <Table.Td>{i.row_index}</Table.Td>
                  <Table.Td>
                    <Badge>{Math.round((i.confidence || 0) * 100)}%</Badge>
                  </Table.Td>
                  <Table.Td>{i.status}</Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>
    </div>
  );
}
