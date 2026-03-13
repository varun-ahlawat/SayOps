"use client"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IconPhone } from "@tabler/icons-react"

interface CallForwardingGuideProps {
  phoneNumber: string
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5">
      <div className="flex-none w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
        {n}
      </div>
      <p className="text-xs text-foreground/80 leading-relaxed">{children}</p>
    </div>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded bg-muted font-mono text-[11px] text-foreground">
      {children}
    </code>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-4 mb-2">
      {children}
    </p>
  )
}

export function CallForwardingGuide({ phoneNumber }: CallForwardingGuideProps) {
  const num = phoneNumber

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2 decoration-dashed mt-1 block">
          How to forward calls to this number
        </button>
      </DialogTrigger>

      <DialogContent className="w-full max-w-none sm:max-w-xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-5 pb-0 flex-none">
          <DialogTitle className="flex items-center gap-2 text-base">
            <IconPhone className="size-4 text-primary flex-none" />
            Call Forwarding Setup Guide
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1 break-all">
            Forward your business number to:{" "}
            <span className="font-mono font-medium text-foreground">{num}</span>
          </p>
        </DialogHeader>

        <Tabs defaultValue="iphone" className="mt-3 flex flex-col flex-1 min-h-0">
          <div className="px-4 sm:px-6 flex-none">
            <TabsList className="w-full h-8">
              <TabsTrigger value="iphone" className="flex-1 text-xs">iPhone</TabsTrigger>
              <TabsTrigger value="android" className="flex-1 text-xs">
                <span className="hidden sm:inline">Samsung / </span>Android
              </TabsTrigger>
              <TabsTrigger value="landline" className="flex-1 text-xs">Landline</TabsTrigger>
            </TabsList>
          </div>

          {/* Scrollable area */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="px-4 sm:px-6 pb-4">

              {/* ── iPhone ── */}
              <TabsContent value="iphone" className="mt-0 space-y-0.5">
                <SectionLabel>Forward all calls — via Settings</SectionLabel>
                <div className="space-y-2.5">
                  <Step n={1}>Open <strong>Settings</strong></Step>
                  <Step n={2}>Tap <strong>Phone</strong></Step>
                  <Step n={3}>Tap <strong>Call Forwarding</strong></Step>
                  <Step n={4}>Turn <strong>Call Forwarding ON</strong></Step>
                  <Step n={5}>Tap <strong>Forward To</strong></Step>
                  <Step n={6}>Enter your AI agent number: <Code>{num}</Code></Step>
                  <Step n={7}>Go back — confirm it shows as enabled</Step>
                </div>

                <SectionLabel>Conditional forwarding — dial codes</SectionLabel>
                <p className="text-xs text-muted-foreground mb-2">
                  iPhone hides conditional forwarding in Settings. Use these dial codes from your Phone app.
                </p>

                <div className="rounded-lg border divide-y">
                  <div className="flex flex-wrap justify-between items-center gap-2 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Busy or declined</span>
                    <Code>*67*{num}#</Code>
                  </div>
                  <div className="flex flex-wrap justify-between items-center gap-2 px-3 py-2">
                    <span className="text-xs text-muted-foreground">No answer</span>
                    <Code>*61*{num}#</Code>
                  </div>
                  <div className="flex flex-wrap justify-between items-center gap-2 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Unreachable</span>
                    <Code>*62*{num}#</Code>
                  </div>
                </div>

                <SectionLabel>Disable conditional forwarding</SectionLabel>
                <div className="rounded-lg border divide-y">
                  <div className="flex flex-wrap justify-between items-center gap-2 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Disable busy</span>
                    <Code>##67#</Code>
                  </div>
                  <div className="flex flex-wrap justify-between items-center gap-2 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Disable no answer</span>
                    <Code>##61#</Code>
                  </div>
                  <div className="flex flex-wrap justify-between items-center gap-2 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Disable unreachable</span>
                    <Code>##62#</Code>
                  </div>
                </div>
              </TabsContent>

              {/* ── Samsung / Android ── */}
              <TabsContent value="android" className="mt-0 space-y-0.5">
                <SectionLabel>Forward calls — via Settings</SectionLabel>
                <div className="space-y-2.5">
                  <Step n={1}>Open the <strong>Phone</strong> app</Step>
                  <Step n={2}>Tap the <strong>three-dot menu</strong> (top right)</Step>
                  <Step n={3}>Tap <strong>Settings</strong></Step>
                  <Step n={4}>Tap <strong>Supplementary Services</strong></Step>
                  <Step n={5}>Tap <strong>Call Forwarding</strong></Step>
                  <Step n={6}>Choose your option and enter <Code>{num}</Code></Step>
                </div>

                <SectionLabel>Available options</SectionLabel>
                <div className="rounded-lg border divide-y">
                  {["Always forward", "Forward when busy", "Forward when unanswered", "Forward when unreachable"].map((opt) => (
                    <div key={opt} className="flex items-center gap-2.5 px-3 py-2">
                      <div className="size-1.5 rounded-full bg-primary/60 flex-none" />
                      <span className="text-xs text-foreground/80">{opt}</span>
                    </div>
                  ))}
                </div>

                <SectionLabel>Dial code alternative</SectionLabel>
                <div className="rounded-lg border divide-y">
                  <div className="flex flex-wrap justify-between items-center gap-2 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Forward all calls</span>
                    <Code>*21*{num}#</Code>
                  </div>
                  <div className="flex flex-wrap justify-between items-center gap-2 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Cancel forwarding</span>
                    <Code>#21#</Code>
                  </div>
                </div>
              </TabsContent>

              {/* ── Landline ── */}
              <TabsContent value="landline" className="mt-0 space-y-0.5">
                <SectionLabel>Forward all calls</SectionLabel>
                <div className="space-y-2.5">
                  <Step n={1}>Pick up your phone handset</Step>
                  <Step n={2}>Dial <Code>*72 {num}</Code></Step>
                  <Step n={3}>Wait for a confirmation tone or announcement</Step>
                  <Step n={4}>Hang up — all calls now forward to your AI agent</Step>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-2 rounded-lg border px-3 py-2 mt-3">
                  <span className="text-xs text-muted-foreground">Disable all forwarding</span>
                  <Code>*73</Code>
                </div>

                <SectionLabel>Conditional forwarding (if supported)</SectionLabel>
                <div className="rounded-lg border divide-y">
                  <div className="flex flex-wrap justify-between items-center gap-2 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Forward when busy</span>
                    <Code>*90 {num}</Code>
                  </div>
                  <div className="flex flex-wrap justify-between items-center gap-2 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Forward when no answer</span>
                    <Code>*92 {num}</Code>
                  </div>
                  <div className="flex flex-wrap justify-between items-center gap-2 px-3 py-2">
                    <span className="text-xs text-muted-foreground">Disable conditional</span>
                    <Code>*91</Code>
                  </div>
                </div>
              </TabsContent>

            </div>

            {/* Important Notes — inside scroll so it's always reachable */}
            <div className="border-t mx-4 sm:mx-6 mb-4 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Important Notes</p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>· Your carrier must support call forwarding.</li>
                <li>· Some carriers use slightly different codes — check with your provider if a code fails.</li>
                <li>· Test by calling your business number after setup to confirm it reaches your AI agent.</li>
                <li>· You can disable forwarding anytime using the codes above.</li>
              </ul>
            </div>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
