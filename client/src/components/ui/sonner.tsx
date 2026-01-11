import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
import { sonnerClassNames } from "@/lib/sonner-styles";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{ classNames: sonnerClassNames }}
      {...props}
    />
  );
};

export { Toaster };
