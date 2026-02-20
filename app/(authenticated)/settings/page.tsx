"use client"

import React, { Suspense } from "react"
import SettingsForm from "./SettingsForm"

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="p-4">Loading settings...</div>}>
      <SettingsForm />
    </Suspense>
  )
}
