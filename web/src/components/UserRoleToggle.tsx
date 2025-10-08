import React, { useState } from "react";
import {
  Button,
  Menu,
  Text,
  Badge,
  Group,
  Avatar,
  Stack,
  Divider,
} from "@mantine/core";
import { IconShield, IconUsers, IconChevronDown } from "@tabler/icons-react";
import { useAuth } from "../contexts/AuthContext";

interface UserRoleToggleProps {
  compact?: boolean;
}

export const UserRoleToggle: React.FC<UserRoleToggleProps> = ({
  compact = false,
}) => {
  const { user, logout } = useAuth();
  const [opened, setOpened] = useState(false);

  if (!user) {
    return null;
  }

  const getRoleColor = (isAdmin: boolean) => {
    return isAdmin ? "blue" : "green";
  };

  const getRoleIcon = (isAdmin: boolean) => {
    return isAdmin ? IconShield : IconUsers;
  };

  const getRoleLabel = (isAdmin: boolean) => {
    return isAdmin ? "Admin User" : "MFT User";
  };

  const RoleIcon = getRoleIcon(user.is_admin);
  const roleColor = getRoleColor(user.is_admin);
  const roleLabel = getRoleLabel(user.is_admin);

  if (compact) {
    return (
      <Group gap="xs">
        <RoleIcon size={16} color={`var(--mantine-color-${roleColor}-6)`} />
        <Text size="sm" fw={500} c={`${roleColor}.7`}>
          {roleLabel}
        </Text>
      </Group>
    );
  }

  return (
    <Menu
      width={280}
      position="bottom-end"
      withArrow
      opened={opened}
      onChange={setOpened}
    >
      <Menu.Target>
        <Button
          variant="subtle"
          size="sm"
          rightSection={<IconChevronDown size={14} />}
          leftSection={
            <Avatar
              size={24}
              radius="xl"
              gradient={{
                from: `${roleColor}.6`,
                to: `${roleColor}.8`,
                deg: 135,
              }}
            >
              <RoleIcon size={14} />
            </Avatar>
          }
          style={{ fontWeight: 500 }}
        >
          {roleLabel}
        </Button>
      </Menu.Target>

      <Menu.Dropdown>
        <Stack gap="xs" p="md">
          <Group gap="sm">
            <Avatar
              size={40}
              radius="xl"
              gradient={{
                from: `${roleColor}.6`,
                to: `${roleColor}.8`,
                deg: 135,
              }}
            >
              <RoleIcon size={20} />
            </Avatar>
            <div style={{ flex: 1 }}>
              <Text fw={600} size="sm">
                {user.display_name}
              </Text>
              <Text size="xs" c="dimmed">
                {user.email}
              </Text>
              <Badge
                color={roleColor}
                size="xs"
                variant="light"
                leftSection={<RoleIcon size={10} />}
                style={{ marginTop: 4 }}
              >
                {roleLabel}
              </Badge>
            </div>
          </Group>

          {/* <Group gap="xs">
            <IconUser size={16} />
            <div style={{ flex: 1 }}>
              <Text size="sm" fw={500}>
                Current Entity
              </Text>
              <Text size="xs" c="dimmed">
                {user.tenant.name}
              </Text>
            </div>
          </Group> */}

          {user.roles.length > 0 && (
            <>
              <Divider />
              <Group gap="xs" align="flex-start">
                <IconShield size={16} style={{ marginTop: 2 }} />
                <div style={{ flex: 1 }}>
                  <Text size="sm" fw={500}>
                    Roles & Permissions
                  </Text>
                  <Stack gap={4} style={{ marginTop: 4 }}>
                    {user.roles.map((role, index) => (
                      <Badge
                        key={index}
                        size="xs"
                        variant="light"
                        color={role === "Admin" ? "blue" : "green"}
                      >
                        {role}
                      </Badge>
                    ))}
                  </Stack>
                  {user.is_admin && (
                    <Text size="xs" c="blue" style={{ marginTop: 4 }}>
                      Full access including VCDB data
                    </Text>
                  )}
                  {user.is_mft_user && !user.is_admin && (
                    <Text size="xs" c="green" style={{ marginTop: 4 }}>
                      Limited access (no VCDB data)
                    </Text>
                  )}
                </div>
              </Group>
            </>
          )}

          {/* <Divider /> */}

          <Button
            variant="subtle"
            color="red"
            size="sm"
            fullWidth
            onClick={logout}
            style={{ justifyContent: "flex-start" }}
          >
            Sign Out
          </Button>
        </Stack>
      </Menu.Dropdown>
    </Menu>
  );
};

export default UserRoleToggle;
