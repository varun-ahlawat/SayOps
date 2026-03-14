"use client"

import { assignExistingEvaNumber } from "@/lib/api-client"
import type { EvaNumberBinding } from "@/lib/types"
import { BindExistingNumberDialog } from "@/components/phone/BindExistingNumberDialog"
import type { ButtonProps } from "@/components/ui/button"

interface AssignExistingEvaNumberDialogProps {
  currentPhoneNumber?: string | null
  onAssigned: (binding: EvaNumberBinding) => void
  buttonLabel?: string
  buttonVariant?: ButtonProps["variant"]
  buttonSize?: ButtonProps["size"]
  buttonClassName?: string
}

export function AssignExistingEvaNumberDialog({
  currentPhoneNumber,
  onAssigned,
  buttonLabel,
  buttonVariant = "outline",
  buttonSize = "default",
  buttonClassName,
}: AssignExistingEvaNumberDialogProps) {
  const resolvedButtonLabel = buttonLabel ?? (
    currentPhoneNumber ? "Replace EVA Number" : "Use Existing Number"
  )

  return (
    <BindExistingNumberDialog
      subjectLabel="Eva"
      currentPhoneNumber={currentPhoneNumber}
      buttonLabel={resolvedButtonLabel}
      buttonVariant={buttonVariant}
      buttonSize={buttonSize}
      buttonClassName={buttonClassName}
      onBind={async (request) => {
        const binding = await assignExistingEvaNumber(request)
        onAssigned(binding)
      }}
      successMessage={(phoneNumber) => (
        currentPhoneNumber && currentPhoneNumber !== phoneNumber
          ? `Replaced Eva number ${currentPhoneNumber}`
          : `Bound ${phoneNumber} to Eva`
      )}
    />
  )
}
