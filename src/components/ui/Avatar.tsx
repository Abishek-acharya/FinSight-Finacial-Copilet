import { useState, type ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "alt"> {
  name: string;
  alt?: string;
  size?: "sm" | "md" | "lg";
  status?: "online" | "offline" | "busy";
}

const sizes = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-12 text-base" };
const statusColors = { online: "bg-success", offline: "bg-[#a4a19a]", busy: "bg-error" };

export function Avatar({ name, alt = name, size = "md", status, src, className, ...props }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <span className={cn("relative inline-flex shrink-0", className)}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          className={cn("rounded-full object-cover", sizes[size])}
          {...props}
        />
      ) : (
        <span
          role="img"
          aria-label={alt}
          className={cn("inline-flex items-center justify-center rounded-full bg-[#f4e3d8] font-semibold text-[#803d22]", sizes[size])}
        >
          {initials || "?"}
        </span>
      )}
      {status && (
        <span
          aria-label={status}
          className={cn("absolute bottom-0 right-0 size-3 rounded-full border-2 border-surface", statusColors[status])}
        />
      )}
    </span>
  );
}