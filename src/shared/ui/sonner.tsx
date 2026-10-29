import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group pointer-events-none"
      position="top-right"
      offset={{ top: "4.5rem", right: "1rem" }}
      mobileOffset={{ top: "4.5rem", left: "1rem", right: "1rem" }}
      richColors
      toastOptions={{
        classNames: {
          toast:
            "pointer-events-auto group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          success: "!border-green-600 !bg-green-600 !text-white",
          error: "!border-red-600 !bg-red-600 !text-white",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
