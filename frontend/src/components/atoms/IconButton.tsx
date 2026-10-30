import type { ButtonHTMLAttributes } from "react";
import { Icon, type IconName } from "./Icon";

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: IconName;
  /** Accessible name and tooltip. */
  label: string;
}

/** Icon-only button: the label is its accessible name and its tooltip. */
export function IconButton({ icon, label, className = "", ...props }: Props) {
  return (
    <button type="button" className={`btn icon-btn ${className}`.trim()} aria-label={label} title={label} {...props}>
      <Icon name={icon} />
    </button>
  );
}
