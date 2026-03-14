"use client"

import * as React from "react"
import type { ExistingNumberAssignmentRequest, ExistingNumberSource } from "@/lib/types"
import { Button, type ButtonProps } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { toast } from "sonner"

interface BindExistingNumberDialogProps {
  subjectLabel: string
  currentPhoneNumber?: string | null
  onBind: (request: ExistingNumberAssignmentRequest) => Promise<void>
  successMessage: (phoneNumber: string) => string
  buttonLabel?: string
  buttonVariant?: ButtonProps["variant"]
  buttonSize?: ButtonProps["size"]
  buttonClassName?: string
}

export function BindExistingNumberDialog({
  subjectLabel,
  currentPhoneNumber,
  onBind,
  successMessage,
  buttonLabel,
  buttonVariant = "outline",
  buttonSize = "default",
  buttonClassName,
}: BindExistingNumberDialogProps) {
  const formId = React.useId()
  const [open, setOpen] = React.useState(false)
  const [source, setSource] = React.useState<ExistingNumberSource>("vapi")
  const [phoneNumber, setPhoneNumber] = React.useState("")
  const [vapiPhoneNumberId, setVapiPhoneNumberId] = React.useState("")
  const [twilioAccountSid, setTwilioAccountSid] = React.useState("")
  const [twilioAuthToken, setTwilioAuthToken] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)

  const resetForm = React.useCallback(() => {
    setSource("vapi")
    setPhoneNumber("")
    setVapiPhoneNumberId("")
    setTwilioAccountSid("")
    setTwilioAuthToken("")
    setSubmitting(false)
  }, [])

  const handleOpenChange = React.useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }, [resetForm])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalizedPhone = phoneNumber.trim()
    const request: ExistingNumberAssignmentRequest = {
      phoneNumber: normalizedPhone,
      source,
    }

    if (!normalizedPhone) return

    if (source === "vapi") {
      const normalizedVapiPhoneNumberId = vapiPhoneNumberId.trim()
      if (!normalizedVapiPhoneNumberId) return
      request.vapiPhoneNumberId = normalizedVapiPhoneNumberId
    } else {
      const normalizedTwilioAccountSid = twilioAccountSid.trim()
      const normalizedTwilioAuthToken = twilioAuthToken.trim()
      if (!normalizedTwilioAccountSid || !normalizedTwilioAuthToken) return
      request.twilioAccountSid = normalizedTwilioAccountSid
      request.twilioAuthToken = normalizedTwilioAuthToken
    }

    setSubmitting(true)
    try {
      await onBind(request)
      toast.success(successMessage(normalizedPhone))
      handleOpenChange(false)
    } catch (err: any) {
      setSubmitting(false)
      toast.error(err?.message || "Failed to bind existing number")
    }
  }

  const resolvedButtonLabel = buttonLabel ?? (
    currentPhoneNumber ? "Replace Existing Number" : "Use Existing Number"
  )

  const isValid =
    phoneNumber.trim().length > 0 &&
    (
      (source === "vapi" && vapiPhoneNumberId.trim().length > 0) ||
      (source === "twilio" && twilioAccountSid.trim().length > 0 && twilioAuthToken.trim().length > 0)
    )

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize} className={buttonClassName}>
          {resolvedButtonLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{resolvedButtonLabel}</DialogTitle>
          <DialogDescription className="space-y-2">
            <span className="block">
              Bind a phone number to {subjectLabel}. You can either attach a number already in your Vapi workspace or import one you already own in Twilio.
            </span>
            <span className="block">
              This does not port numbers from another carrier. The number must already exist in Vapi or already be owned in your Twilio account.
            </span>
            {currentPhoneNumber ? (
              <span className="block">
                This will replace the current number: {currentPhoneNumber}
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={source} onValueChange={(value) => setSource(value as ExistingNumberSource)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="vapi">Already in Vapi</TabsTrigger>
              <TabsTrigger value="twilio">Import from Twilio</TabsTrigger>
            </TabsList>

            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor={`${formId}-phone`}>Phone Number</Label>
                <Input
                  id={`${formId}-phone`}
                  placeholder="+15551234567"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  autoComplete="off"
                  required
                />
              </div>

              <TabsContent value="vapi" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${formId}-vapi-id`}>Vapi Phone Number ID</Label>
                  <Input
                    id={`${formId}-vapi-id`}
                    placeholder="pn_abc123"
                    value={vapiPhoneNumberId}
                    onChange={(event) => setVapiPhoneNumberId(event.target.value)}
                    autoComplete="off"
                    required={source === "vapi"}
                  />
                </div>
              </TabsContent>

              <TabsContent value="twilio" className="mt-0 space-y-4">
                <Alert>
                  <AlertTitle>Twilio import</AlertTitle>
                  <AlertDescription>
                    Enter the credentials for the Twilio account that already owns this number. SpeakOps will import the number into Vapi and bind it for you.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor={`${formId}-twilio-sid`}>Twilio Account SID</Label>
                  <Input
                    id={`${formId}-twilio-sid`}
                    placeholder="AC..."
                    value={twilioAccountSid}
                    onChange={(event) => setTwilioAccountSid(event.target.value)}
                    autoComplete="off"
                    required={source === "twilio"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${formId}-twilio-token`}>Twilio Auth Token</Label>
                  <Input
                    id={`${formId}-twilio-token`}
                    type="password"
                    placeholder="••••••••••••••••"
                    value={twilioAuthToken}
                    onChange={(event) => setTwilioAuthToken(event.target.value)}
                    autoComplete="off"
                    required={source === "twilio"}
                  />
                </div>
              </TabsContent>
            </div>
          </Tabs>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting || !isValid}>
              {submitting ? <Spinner className="mr-2" /> : null}
              Save Number
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
