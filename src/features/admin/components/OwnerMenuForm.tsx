import { useState, type FormEvent } from "react";
import { Loader2, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { RequiredMark } from "@/shared/ui/required-mark";
import { useCreateMenuItem } from "../hooks/useAdminData";
import { menuFormSchema } from "@/lib/menu-form";
import { menuImage } from "@/lib/shop";

const defaultImageKey = "classic";
const imageKeys = ["classic", "double", "berbere", "chicken", "veggie"];

export function OwnerMenuForm() {
  const createMenuItem = useCreateMenuItem();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [available, setAvailable] = useState(true);
  const [imageKey, setImageKey] = useState(defaultImageKey);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState("");
  const busy = createMenuItem.isPending;

  function resetForm() {
    setName("");
    setDescription("");
    setPrice("");
    setAvailable(true);
    setImageKey(defaultImageKey);
    setFile(null);
    setPreview(null);
    setError("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;

    const result = menuFormSchema.safeParse({ name, description, price, available });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Check the burger details");
      return;
    }

    setError("");
    try {
      await createMenuItem.mutateAsync({ ...result.data, imageFile: file, imageKey });
      toast.success(`${result.data.name} added to the menu`);
      setOpen(false);
      resetForm();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Couldn't save the burger. Please try again.",
      );
    }
  }

  function chooseFile(selected: File | undefined, input: HTMLInputElement) {
    if (!selected) {
      setFile(null);
      setPreview(null);
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
      selected.size > 5 * 1024 * 1024
    ) {
      input.value = "";
      setFile(null);
      setPreview(null);
      setError("Choose a JPG, PNG, or WebP picture smaller than 5 MB");
      return;
    }

    setFile(selected);
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setPreview(reader.result);
    };
    reader.onerror = () => setError("Couldn't preview that picture. Please choose another file.");
    reader.readAsDataURL(selected);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus />
        Add burger
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!busy) setOpen(value);
        }}
      >
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl">Add burger</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            <fieldset disabled={busy} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="burger-name" className="text-sm font-semibold">
                  Burger name <RequiredMark />
                </label>
                <Input
                  id="burger-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={120}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="burger-description" className="text-sm font-semibold">
                  Description
                </label>
                <Textarea
                  id="burger-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  maxLength={1000}
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="burger-price" className="text-sm font-semibold">
                  Price (ETB) <RequiredMark />
                </label>
                <Input
                  id="burger-price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  required
                />
              </div>
              <div className="flex items-center gap-4">
                <img
                  src={preview ?? menuImage(imageKey)}
                  alt="Burger picture preview"
                  className="h-24 w-24 shrink-0 rounded-md object-cover"
                  width={96}
                  height={96}
                />
                <div className="min-w-0 flex-1 space-y-2">
                  <label
                    htmlFor="burger-photo"
                    className="flex items-center gap-2 text-sm font-semibold"
                  >
                    <Upload className="h-4 w-4" />
                    Picture
                  </label>
                  <Input
                    id="burger-photo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => chooseFile(event.target.files?.[0], event.currentTarget)}
                  />
                  {!file && (
                    <Select value={imageKey} onValueChange={setImageKey}>
                      <SelectTrigger aria-label="Existing burger picture">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {imageKeys.map((key) => (
                          <SelectItem key={key} value={key}>
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label htmlFor="burger-available" className="text-sm font-semibold">
                  Available to order
                </label>
                <Switch id="burger-available" checked={available} onCheckedChange={setAvailable} />
              </div>
            </fieldset>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Plus />}
                {busy ? "Saving…" : "Save burger"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
