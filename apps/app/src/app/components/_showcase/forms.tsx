"use client";

import { ArrowRight, Download, Heart, Mail, Plus, Send, Trash2 } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, RadioGroup, RadioGroupItem, Slider, Switch } from "@/components/ui/controls";
import { DatePicker } from "@/components/ui/date-picker";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toaster";
import { channelSchema } from "@/lib/demo-data";
import { Demo, Section } from "./shell";

export function Actions() {
  const [loading, setLoading] = useState(false);
  return (
    <Section id="actions" title="Buttons & badges" description="One loud primary per view. Everything else stays quiet glass, outline or ghost.">
      <div className="grid gap-4 lg:grid-cols-2">
        <Demo label="Variants">
          <div className="flex flex-wrap items-center gap-3">
            <Button>
              <Send />
              Send reply
            </Button>
            <Button variant="glass">
              <Download />
              Export
            </Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">
              <Trash2 />
              Delete
            </Button>
            <Button variant="link">
              Learn more <ArrowRight />
            </Button>
          </div>
        </Demo>
        <Demo label="Sizes & states">
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="icon" variant="glass" aria-label="Like">
              <Heart />
            </Button>
            <Button
              loading={loading}
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 1600);
              }}
            >
              {loading ? "Saving…" : "Click to load"}
            </Button>
            <Button disabled>Disabled</Button>
          </div>
        </Demo>
        <Demo label="Badges" className="lg:col-span-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="lime" dot>
              Live
            </Badge>
            <Badge variant="neutral">WhatsApp</Badge>
            <Badge variant="outline">Draft</Badge>
            <Badge variant="success" dot>
              Won
            </Badge>
            <Badge variant="warning">Follow-up due</Badge>
            <Badge variant="danger">Failed</Badge>
          </div>
        </Demo>
      </div>
    </Section>
  );
}

const contactSchema = z.object({
  name: z.string().trim().min(2, "Name needs at least 2 characters"),
  email: z.email("Enter a valid email address"),
  channel: channelSchema,
  message: z.string().trim().min(10, "Write at least 10 characters").max(500, "Keep it under 500 characters"),
  followUp: z.date().optional(),
  consent: z.literal(true, { error: "Consent is required before messaging" }),
});

type ContactErrors = Partial<Record<keyof z.infer<typeof contactSchema>, string>>;

export function Forms() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    channel: "whatsapp" as z.infer<typeof channelSchema>,
    message: "",
    followUp: undefined as Date | undefined,
    consent: false,
  });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [notify, setNotify] = useState(true);
  const [priority, setPriority] = useState("normal");
  const [budget, setBudget] = useState([250, 750]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const next: ContactErrors = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof ContactErrors;
        next[key] ??= issue.message;
      }
      setErrors(next);
      toast.error("Please fix the highlighted fields");
      return;
    }
    setErrors({});
    toast.success("Lead captured", { description: `${result.data.name} via ${result.data.channel}` });
  };

  return (
    <Section
      id="forms"
      title="Forms"
      description="Inputs read their label, hint and error from Field, so ids and aria wiring are automatic. Validation is a Zod schema; submit empty to see it."
    >
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <form noValidate onSubmit={submit} className="glass grid gap-5 rounded-2xl p-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name" required error={errors.name}>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ayesha Rahman" autoComplete="name" />
            </Field>
            <Field label="Email" required error={errors.email} hint="We never share it.">
              <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="ayesha@company.com" autoComplete="email" />
            </Field>
            <Field label="Channel" error={errors.channel}>
              <Select value={form.channel} onValueChange={(v) => set("channel", v as typeof form.channel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="messenger">Messenger</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Follow-up date" hint="Optional">
              <DatePicker value={form.followUp} onChange={(d) => set("followUp", d)} />
            </Field>
          </div>
          <Field label="Message" required error={errors.message} hint={`${form.message.length}/500 · grows as you type`}>
            <Textarea value={form.message} onChange={(e) => set("message", e.target.value)} placeholder="Hi! Thanks for reaching out about…" />
          </Field>
          <div className="grid gap-2">
            <div className="flex items-center gap-3">
              <Checkbox id="consent" checked={form.consent} onCheckedChange={(v) => set("consent", v === true)} aria-invalid={Boolean(errors.consent)} />
              <Label htmlFor="consent" className="font-normal text-muted-foreground">
                Contact has opted in to receive messages
              </Label>
            </div>
            {errors.consent && <p role="alert" className="text-xs font-medium text-destructive">{errors.consent}</p>}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setForm({ name: "", email: "", channel: "whatsapp", message: "", followUp: undefined, consent: false });
                setErrors({});
              }}
            >
              Reset
            </Button>
            <Button type="submit">
              <Mail />
              Save lead
            </Button>
          </div>
        </form>

        <div className="grid content-start gap-4">
          <Demo label="Switch">
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="notify">Desktop notifications</Label>
                <p className="mt-1 text-xs text-muted-foreground">Ping me on new messages</p>
              </div>
              <Switch id="notify" checked={notify} onCheckedChange={setNotify} />
            </div>
          </Demo>
          <Demo label="Radio group">
            <RadioGroup value={priority} onValueChange={setPriority} aria-label="Priority">
              {["low", "normal", "urgent"].map((p) => (
                <div key={p} className="flex items-center gap-3">
                  <RadioGroupItem id={`p-${p}`} value={p} />
                  <Label htmlFor={`p-${p}`} className="font-normal capitalize">
                    {p}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </Demo>
          <Demo label="Range slider">
            <Slider value={budget} onValueChange={setBudget} min={0} max={1000} step={25} />
            <p className="flex justify-between font-mono text-sm tabular-nums text-muted-foreground">
              <span>${budget[0]}</span>
              <span>${budget[1]}</span>
            </p>
          </Demo>
          <Demo label="Disabled">
            <Input disabled placeholder="Read-only field" />
            <Button variant="glass" disabled>
              <Plus />
              Can&apos;t add
            </Button>
          </Demo>
        </div>
      </div>
    </Section>
  );
}
