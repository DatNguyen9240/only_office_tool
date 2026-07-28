import { SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  compact?: boolean;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search documents",
  className,
  compact = false,
}: SearchBarProps) {
  return (
    <Input
      allowClear
      aria-label={placeholder}
      className={className}
      prefix={<SearchOutlined aria-hidden="true" />}
      placeholder={placeholder}
      value={value}
      onChange={(event) => onChange?.(event.target.value)}
      style={{ width: compact ? 280 : "100%", maxWidth: compact ? 280 : 520 }}
    />
  );
}
