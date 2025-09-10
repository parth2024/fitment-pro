import React from "react";
import { Card, Text, Group, Stack, Badge, Box } from "@mantine/core";
import {
  IconCheck,
  IconX,
  IconInfoCircle,
  IconAlertTriangle,
  IconUpload,
  IconRobot,
  IconDatabase,
  IconDownload,
  IconCar,
  IconSettings,
} from "@tabler/icons-react";

interface ProfessionalToastProps {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
  onClose: () => void;
}

const getToastConfig = (type: string, message: string) => {
  const configs = {
    success: {
      icon: <IconCheck size={20} />,
      color: "#10b981",
      bgColor: "#f0fdf4",
      borderColor: "#10b981",
      iconBg: "#dcfce7",
      badgeColor: "green",
      badgeText: "Success",
    },
    error: {
      icon: <IconX size={20} />,
      color: "#ef4444",
      bgColor: "#fef2f2",
      borderColor: "#ef4444",
      iconBg: "#fee2e2",
      badgeColor: "red",
      badgeText: "Error",
    },
    info: {
      icon: <IconInfoCircle size={20} />,
      color: "#3b82f6",
      bgColor: "#f0f9ff",
      borderColor: "#3b82f6",
      iconBg: "#dbeafe",
      badgeColor: "blue",
      badgeText: "Info",
    },
    warning: {
      icon: <IconAlertTriangle size={20} />,
      color: "#f59e0b",
      bgColor: "#fffbeb",
      borderColor: "#f59e0b",
      iconBg: "#fef3c7",
      badgeColor: "yellow",
      badgeText: "Warning",
    },
  };

  const baseConfig = configs[type as keyof typeof configs];

  // Add contextual icons based on message content
  if (
    message.toLowerCase().includes("upload") ||
    message.toLowerCase().includes("file")
  ) {
    return { ...baseConfig, icon: <IconUpload size={20} /> };
  }
  if (
    message.toLowerCase().includes("ai") ||
    message.toLowerCase().includes("generate")
  ) {
    return { ...baseConfig, icon: <IconRobot size={20} /> };
  }
  if (
    message.toLowerCase().includes("database") ||
    message.toLowerCase().includes("apply")
  ) {
    return { ...baseConfig, icon: <IconDatabase size={20} /> };
  }
  if (
    message.toLowerCase().includes("export") ||
    message.toLowerCase().includes("download")
  ) {
    return { ...baseConfig, icon: <IconDownload size={20} /> };
  }
  if (
    message.toLowerCase().includes("vehicle") ||
    message.toLowerCase().includes("search")
  ) {
    return { ...baseConfig, icon: <IconCar size={20} /> };
  }
  if (
    message.toLowerCase().includes("fitment") ||
    message.toLowerCase().includes("configure")
  ) {
    return { ...baseConfig, icon: <IconSettings size={20} /> };
  }

  return baseConfig;
};

export const ProfessionalToast: React.FC<ProfessionalToastProps> = ({
  message,
  type,
  duration = 4000,
  onClose,
}) => {
  const config = getToastConfig(type, message);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <Card
      style={{
        background: config.bgColor,
        border: `2px solid ${config.borderColor}`,
        borderRadius: "12px",
        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
        minWidth: "320px",
        maxWidth: "480px",
        position: "relative",
        overflow: "hidden",
        animation: "slideInRight 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
      p="md"
    >
      {/* Progress bar */}
      <Box
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          height: "3px",
          background: `linear-gradient(90deg, ${config.color} 0%, ${config.color}80 100%)`,
          width: "100%",
          animation: `progressBar ${duration}ms linear forwards`,
        }}
      />

      <Group gap="md" align="flex-start">
        {/* Icon */}
        <Box
          style={{
            background: config.iconBg,
            borderRadius: "50%",
            padding: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: config.color,
            flexShrink: 0,
          }}
        >
          {config.icon}
        </Box>

        {/* Content */}
        <Stack gap="xs" style={{ flex: 1 }}>
          <Group gap="sm" align="center">
            <Badge
              size="sm"
              color={config.badgeColor}
              variant="light"
              style={{
                fontWeight: 600,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {config.badgeText}
            </Badge>
          </Group>

          <Text
            size="sm"
            style={{
              color: "#374151",
              fontWeight: 500,
              lineHeight: 1.4,
            }}
          >
            {message}
          </Text>
        </Stack>

        {/* Close button */}
        <Box
          onClick={onClose}
          style={{
            cursor: "pointer",
            padding: "4px",
            borderRadius: "4px",
            color: "#9ca3af",
            transition: "all 0.2s ease",
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#6b7280";
            e.currentTarget.style.background = "#f3f4f6";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#9ca3af";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <IconX size={16} />
        </Box>
      </Group>

      <style
        dangerouslySetInnerHTML={{
          __html: `
          @keyframes slideInRight {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }
          
          @keyframes progressBar {
            from {
              width: 100%;
            }
            to {
              width: 0%;
            }
          }
        `,
        }}
      />
    </Card>
  );
};

// Custom toast function
export const showProfessionalToast = (
  message: string,
  type: "success" | "error" | "info" | "warning" = "info",
  duration?: number
) => {
  // This will be used with react-hot-toast
  return {
    message,
    type,
    duration,
  };
};
