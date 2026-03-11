"use client"

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from "react"
import {
  ArrowRight,
  ChevronLeft,
  Ellipsis,
  Grid2x2,
  Mic,
  MicOff,
  PhoneOff,
  Play,
  Plus,
  RotateCcw,
  Video,
  Volume2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  demoSpeedOptions,
  landingContent,
  type DemoOwnerMessage,
  type DemoScenario,
  type DemoScenarioKey,
} from "@/lib/landing-content"

type CaptionItem = {
  id: string
  speaker: "agent" | "customer"
  text: string
}

type SmsItem = {
  id: string
  text: string
  tone: "default" | "alert"
  timestamp: string
}

type PhoneDemoShowcaseProps = {
  onJumpToSignup?: () => void
}

const callControls = [
  { label: "Speaker", icon: Volume2 },
  { label: "FaceTime", icon: Video },
  { label: "Mute", icon: MicOff },
  { label: "More", icon: Ellipsis },
  { label: "End", icon: PhoneOff },
  { label: "Keypad", icon: Grid2x2 },
] as const

const NORMAL_WORDS_PER_SECOND = 2.9
const MIN_SPEECH_DURATION_MS = 900
const MIN_CHARACTER_DELAY_MS = 18
const MAX_CHARACTER_DELAY_MS = 78
const waveformPattern = [16, 28, 18, 36, 14, 32, 20, 38, 17, 29, 15, 33]
const speakerTone = {
  agent: {
    text: "text-[#0f766e]",
    wave: "#15b8a6",
    label: "AI agent",
  },
  customer: {
    text: "text-[#2563eb]",
    wave: "#4f8cff",
    label: "Customer",
  },
} as const

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function formatTimer(seconds: number) {
  const mins = String(Math.floor(seconds / 60)).padStart(2, "0")
  const secs = String(seconds % 60).padStart(2, "0")
  return `${mins}:${secs}`
}

function formatSmsTimestamp(index: number) {
  return index === 0 ? "Today 9:41 AM" : `Today 9:${String(41 + index).padStart(2, "0")} AM`
}

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function getPlaybackScale(wordsPerSecond: number) {
  const safeWordsPerSecond = Math.max(wordsPerSecond, 0.1)
  return NORMAL_WORDS_PER_SECOND / safeWordsPerSecond
}

function estimateSpeechDuration(text: string, wordsPerSecond: number) {
  const wordCount = Math.max(countWords(text), 1)
  const shortPauseCount = (text.match(/[,;:]/g) ?? []).length
  const longPauseCount = (text.match(/[.!?]/g) ?? []).length
  const baseDurationMs = (wordCount / Math.max(wordsPerSecond, 0.1)) * 1000
  return Math.max(
    MIN_SPEECH_DURATION_MS,
    baseDurationMs + shortPauseCount * 120 + longPauseCount * 180
  )
}

function PhoneShell({
  children,
  indicatorClassName = "bg-black/88",
}: {
  children: ReactNode
  indicatorClassName?: string
}) {
  return (
    <div className="rounded-[54px] bg-[linear-gradient(135deg,#d7dbe3_0%,#8d95a1_34%,#eef1f5_100%)] p-[2px] shadow-[0_44px_120px_-30px_rgba(15,23,42,0.56)]">
      <div className="rounded-[51px] bg-[linear-gradient(135deg,#020202_0%,#1d222a_42%,#090c10_100%)] p-[5.5px]">
        <div className="relative h-[644px] w-[322px] overflow-hidden rounded-[46px] bg-white">
          <div className="absolute left-1/2 top-2 z-30 h-7 w-[120px] -translate-x-1/2 rounded-full bg-black" />
          {children}
          <div
            className={cn(
              "absolute bottom-1.5 left-1/2 z-30 h-[4px] w-[116px] -translate-x-1/2 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.18)]",
              indicatorClassName
            )}
          />
        </div>
      </div>
    </div>
  )
}

function BatteryIcon({ level, light = false }: { level: number; light?: boolean }) {
  const charge = Math.max(0, Math.min(level, 100))
  const fillWidth = Math.max(2.2, Math.round((charge / 100) * 17))
  const fillColor = charge < 30 ? "#c98a3d" : light ? "#ffffff" : "#000000"

  return (
    <svg
      aria-hidden="true"
      className="h-[13px] w-[26px]"
      viewBox="0 0 26 13"
      fill="none"
    >
      <rect x="0.9" y="1" width="21.8" height="11" rx="3.2" stroke="currentColor" strokeWidth="1.6" />
      <rect x="24" y="4.05" width="1.6" height="4.9" rx="0.8" fill="currentColor" opacity="0.45" />
      <rect x="3" y="3.1" width={fillWidth} height="6.8" rx="2" fill={fillColor} />
    </svg>
  )
}

function StatusCluster({
  light = false,
  batteryLevel = 100,
}: {
  light?: boolean
  batteryLevel?: number
}) {
  return (
    <div className={cn("flex items-center gap-[4px]", light ? "text-white" : "text-[#111827]")}>
      <svg aria-hidden="true" className="h-[13px] w-[21px]" viewBox="0 0 21 13" fill="none">
        <rect x="0.6" y="7.2" width="3.2" height="5.2" rx="1.1" fill="currentColor" />
        <rect x="5.8" y="5.4" width="3.2" height="7" rx="1.1" fill="currentColor" />
        <rect x="11" y="3.1" width="3.2" height="9.3" rx="1.1" fill="currentColor" />
        <rect x="16.2" y="0.8" width="3.2" height="11.6" rx="1.1" fill="currentColor" />
      </svg>
      <svg
        aria-hidden="true"
        className="h-[13px] w-[17px]"
        viewBox="0 0 17 13"
        fill="currentColor"
      >
        <path d="M8.5 1.2c2.6 0 5.08.92 7.08 2.6l-1.55 1.64C12.48 4.13 10.58 3.4 8.5 3.4S4.52 4.13 2.97 5.44L1.42 3.8A10.47 10.47 0 0 1 8.5 1.2Z" />
        <path d="M8.5 5.55c1.67 0 3.2.58 4.45 1.6l-1.6 1.7A4.21 4.21 0 0 0 8.5 7.8c-1.08 0-2.07.39-2.85 1.05l-1.6-1.7a6.89 6.89 0 0 1 4.45-1.6Z" />
        <path d="M8.5 9.2c.82 0 1.55.27 2.12.74L8.5 12.2 6.38 9.94c.57-.47 1.3-.74 2.12-.74Z" />
      </svg>
      <BatteryIcon level={batteryLevel} light={light} />
    </div>
  )
}

function ControlButton({
  label,
  icon: Icon,
  danger,
}: {
  label: string
  icon: ComponentType<{ className?: string }>
  danger?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "flex h-[72px] w-[72px] items-center justify-center rounded-full border text-white shadow-sm",
          danger
            ? "border-[#ff453a] bg-[#ff3b30]"
            : "border-white/28 bg-white/10 backdrop-blur-sm"
        )}
      >
        <Icon className={cn("size-7", danger ? "-rotate-135" : "")} />
      </div>
      <span className="text-[13px] font-medium text-white/92">{label}</span>
    </div>
  )
}

export default function PhoneDemoShowcase({ onJumpToSignup }: PhoneDemoShowcaseProps) {
  const [scenarioKey, setScenarioKey] = useState<DemoScenarioKey>(landingContent.demo.scenarioOrder[0])
  const [wordsPerSecond, setWordsPerSecond] = useState<number>(NORMAL_WORDS_PER_SECOND)
  const [captions, setCaptions] = useState<CaptionItem[]>([])
  const [smsItems, setSmsItems] = useState<SmsItem[]>([])
  const [callLabel, setCallLabel] = useState("Calling...")
  const [callTimer, setCallTimer] = useState("00:00")
  const [currentAction, setCurrentAction] = useState("")
  const [activeSpeaker, setActiveSpeaker] = useState<"agent" | "customer" | null>(null)
  const [replayToken, setReplayToken] = useState(0)

  const runIdRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const idleReplayTimerRef = useRef<number | null>(null)
  const wordsPerSecondRef = useRef(wordsPerSecond)
  const captionsScrollRef = useRef<HTMLDivElement | null>(null)
  const smsScrollRef = useRef<HTMLDivElement | null>(null)
  const sectionRef = useRef<HTMLDivElement | null>(null)
  const phonesRef = useRef<HTMLDivElement | null>(null)
  const isDemoVisibleRef = useRef(false)
  const hasEnteredViewportRef = useRef(false)
  const playbackStateRef = useRef<"idle" | "running" | "complete">("idle")

  const scenario = landingContent.demo.scenarios[scenarioKey] as DemoScenario

  const clearIdleReplayTimer = () => {
    if (idleReplayTimerRef.current !== null) {
      window.clearTimeout(idleReplayTimerRef.current)
      idleReplayTimerRef.current = null
    }
  }

  useEffect(() => {
    wordsPerSecondRef.current = wordsPerSecond
  }, [wordsPerSecond])

  useEffect(() => {
    const container = captionsScrollRef.current
    if (!container) return
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    })
  }, [captions])

  useEffect(() => {
    const container = smsScrollRef.current
    if (!container) return
    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    })
  }, [smsItems])

  useEffect(() => {
    const node = phonesRef.current
    if (!node) return

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        const isIntersecting = Boolean(entry?.isIntersecting)
        isDemoVisibleRef.current = isIntersecting

        if (!isIntersecting) return

        clearIdleReplayTimer()

        if (!hasEnteredViewportRef.current) {
          hasEnteredViewportRef.current = true
          setReplayToken((value) => value + 1)
          return
        }

        if (playbackStateRef.current === "complete") {
          setReplayToken((value) => value + 1)
        }
      },
      { threshold: 0.6 }
    )

    observer.observe(node)
    return () => {
      observer.disconnect()
      clearIdleReplayTimer()
    }
  }, [])

  useEffect(() => {
    if (replayToken === 0) {
      return
    }

    let cancelled = false
    const runId = runIdRef.current + 1
    runIdRef.current = runId

    const stopTimer = () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    const resetDemo = () => {
      clearIdleReplayTimer()
      stopTimer()
      setCaptions([])
      setSmsItems([])
      setCallLabel("Calling...")
      setCallTimer("00:00")
      setCurrentAction("")
      setActiveSpeaker(null)
      playbackStateRef.current = "idle"
    }

    const startTimer = () => {
      let seconds = 0
      stopTimer()
      timerRef.current = window.setInterval(() => {
        if (runIdRef.current !== runId) {
          stopTimer()
          return
        }
        if (!isDemoVisibleRef.current) {
          return
        }
        seconds += 1
        setCallTimer(formatTimer(seconds))
      }, Math.max(120, 1000 * getPlaybackScale(wordsPerSecondRef.current)))
    }

    const waitScaled = async (ms: number) => {
      let remainingMs = ms * getPlaybackScale(wordsPerSecondRef.current)

      while (remainingMs > 0) {
        if (cancelled || runIdRef.current !== runId) {
          throw new Error("demo-aborted")
        }

        if (!isDemoVisibleRef.current) {
          await wait(140)
          continue
        }

        const chunkMs = Math.min(remainingMs, 80)
        await wait(chunkMs)
        remainingMs -= chunkMs
      }
    }

    const scheduleIdleReplay = () => {
      clearIdleReplayTimer()
      idleReplayTimerRef.current = window.setTimeout(() => {
        if (cancelled || runIdRef.current !== runId) return
        if (!isDemoVisibleRef.current) return
        if (playbackStateRef.current !== "complete") return
        setReplayToken((value) => value + 1)
      }, 30000)
    }

    const appendDueOwnerMessages = async (
      eventIndex: number,
      sentIndexes: Set<number>,
      ownerMessages: DemoOwnerMessage[]
    ) => {
      for (let index = 0; index < ownerMessages.length; index += 1) {
        if (sentIndexes.has(index)) continue
        if (ownerMessages[index].triggerAfterEvent > eventIndex) continue
        sentIndexes.add(index)
        await waitScaled(260)
        setSmsItems((current) => [
          ...current,
          {
            id: `${runId}-sms-${index}`,
            text: ownerMessages[index].text,
            tone: ownerMessages[index].tone ?? "default",
            timestamp: formatSmsTimestamp(current.length),
          },
        ])
      }
    }

    const runDemo = async () => {
      resetDemo()
      playbackStateRef.current = "running"
      const sentOwnerMessages = new Set<number>()

      try {
        for (let index = 0; index < scenario.events.length; index += 1) {
          const event = scenario.events[index]

          if (event.type === "ringing") {
            setCallLabel("Calling...")
            setActiveSpeaker(null)
            await waitScaled(event.durationMs)
            await appendDueOwnerMessages(index, sentOwnerMessages, scenario.ownerMessages)
            continue
          }

          if (event.type === "connected") {
            setCallLabel("Connected")
            setCurrentAction("")
            startTimer()
            await waitScaled(800)
            await appendDueOwnerMessages(index, sentOwnerMessages, scenario.ownerMessages)
            continue
          }

          if (event.type === "speech") {
            setCurrentAction("")
            setActiveSpeaker(event.speaker)
            const captionId = `${runId}-${index}`
            setCaptions((current) => [
              ...current,
              {
                id: captionId,
                speaker: event.speaker,
                text: "",
              },
            ])

            const speechDurationMs = estimateSpeechDuration(event.text, wordsPerSecondRef.current)
            const characterDelay = Math.max(
              MIN_CHARACTER_DELAY_MS,
              Math.min(MAX_CHARACTER_DELAY_MS, speechDurationMs / Math.max(event.text.length, 1))
            )

            for (let characterIndex = 1; characterIndex <= event.text.length; characterIndex += 1) {
              setCaptions((current) =>
                current.map((item) =>
                  item.id === captionId
                    ? {
                        ...item,
                        text: event.text.slice(0, characterIndex),
                      }
                    : item
                )
              )
              await waitScaled(characterDelay)
            }

            await waitScaled(280)
            await appendDueOwnerMessages(index, sentOwnerMessages, scenario.ownerMessages)
            continue
          }

          if (event.type === "action") {
            setActiveSpeaker(null)
            setCurrentAction(event.text)
            await waitScaled(1350)
            await appendDueOwnerMessages(index, sentOwnerMessages, scenario.ownerMessages)
            continue
          }

          if (event.type === "call_end") {
            stopTimer()
            setCallLabel("Call ended")
            setActiveSpeaker(null)
            setCurrentAction(`Call ended - ${event.durationLabel}`)
            await appendDueOwnerMessages(index, sentOwnerMessages, scenario.ownerMessages)
            playbackStateRef.current = "complete"
            scheduleIdleReplay()
            break
          }
        }
      } catch (error) {
        if ((error as Error).message !== "demo-aborted") {
          throw error
        }
      }
    }

    void runDemo()

    return () => {
      cancelled = true
      clearIdleReplayTimer()
      stopTimer()
    }
  }, [replayToken, scenario])

  return (
    <section id="live-demo" ref={sectionRef} className="mt-12">
      <div className="flex flex-col items-center">
        <div className="mb-6 flex max-w-3xl flex-col items-center text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-[#6b7280] shadow-[0_8px_24px_-20px_rgba(15,23,42,0.22)]">
            <Play className="size-3.5 text-[#111827]" />
            Live demo
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-[#111827] md:text-3xl">
            {scenario.business}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[#6b7280] md:text-base">
            {scenario.summary}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {landingContent.demo.scenarioOrder.map((key) => {
            const item = landingContent.demo.scenarios[key]
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  clearIdleReplayTimer()
                  setScenarioKey(key)
                  setReplayToken((value) => value + 1)
                }}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  scenarioKey === key
                    ? "bg-[#111827] text-white"
                    : "bg-white text-[#4b5563] shadow-[0_8px_24px_-20px_rgba(15,23,42,0.22)] hover:text-[#111827]"
                )}
              >
                {item.label}
              </button>
            )
          })}
        </div>

        <div ref={phonesRef} className="mt-8 flex flex-wrap items-start justify-center gap-10 lg:gap-14">
          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8f8f8f]">
              Customer Call
            </span>
            <PhoneShell indicatorClassName="bg-white/95">
              <div className="flex h-full flex-col bg-[linear-gradient(180deg,#6c8ea0_0%,#4c90a1_46%,#006c9a_100%)] px-6 pb-7 pt-4 text-white">
                <div className="flex items-center justify-between text-[12px] font-semibold">
                  <span>9:41</span>
                  <StatusCluster light batteryLevel={82} />
                </div>

                <div className="mt-10 flex-1">
                  <div className="text-center">
                    <p className="text-[15px] font-semibold text-white/62">
                      {callLabel === "Connected" ? callTimer : callLabel}
                    </p>
                    <h3 className="mt-3 text-[31px] font-semibold tracking-tight text-white">
                      {landingContent.demo.supportPhoneNumber}
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-y-5">
                  {callControls.map((control) => (
                    <ControlButton
                      key={control.label}
                      label={control.label}
                      icon={control.icon}
                      danger={control.label === "End"}
                    />
                  ))}
                </div>
              </div>
            </PhoneShell>
          </div>

          <div className="flex flex-col items-center gap-3">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8f8f8f]">
              Owner iMessage
            </span>
            <PhoneShell indicatorClassName="bg-black/90">
              <div className="flex h-full flex-col bg-[#f2f2f7] text-[#111827]">
                <div className="flex items-center justify-between px-5 pt-4 text-[12px] font-semibold">
                  <span>9:41</span>
                  <StatusCluster batteryLevel={24} />
                </div>

                <div className="border-b border-[#e5e5ea] bg-[#f8f8fa] px-4 pb-2 pt-2">
                  <div className="relative flex items-center justify-center">
                    <button type="button" className="absolute left-0 text-[#007aff]" aria-label="Back">
                      <ChevronLeft className="size-6" />
                    </button>

                    <div className="flex flex-col items-center">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#d9dcdf] text-sm font-semibold text-[#4b5563]">
                        SO
                      </div>
                      <p className="mt-1.5 text-[16px] font-semibold leading-none">SpeakOps Agent</p>
                    </div>

                    <button type="button" className="absolute right-0 text-[#007aff]" aria-label="Video">
                      <Video className="size-6" />
                    </button>
                  </div>
                </div>

                <div
                  ref={smsScrollRef}
                  className="flex flex-1 flex-col overflow-y-auto px-4 pb-3 pt-3"
                >
                  <div className="mb-4 text-center text-[13px] leading-4 text-[#8e8e93]">
                    iMessage
                    <br />
                    Today 9:41 AM
                  </div>

                  {smsItems.length === 0 ? (
                    <div className="mt-28 text-center text-sm text-[#b4b4b8]">
                      Waiting for the first owner update...
                    </div>
                  ) : null}

                  <div className="mt-auto flex flex-col gap-2">
                    {smsItems.map((message, index) => (
                      <div key={message.id} className="animate-[landing-sms_0.28s_ease]">
                        {index > 0 ? (
                          <div className="mb-2 text-center text-[11px] text-[#b4b4b8]">
                            {message.timestamp}
                          </div>
                        ) : null}
                        <div
                          className={cn(
                            "max-w-[82%] rounded-[20px] rounded-bl-md px-4 py-2.5 text-[15px] leading-5 text-[#111827]",
                            message.tone === "alert"
                              ? "border border-[#fcd34d] bg-[#fef3c7] text-[#92400e]"
                              : "bg-[#e5e5ea]"
                          )}
                        >
                          {message.text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[#e5e5ea] bg-[#f2f2f7] px-3 pb-4 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e5e5ea] text-[#7a7a80]"
                      aria-label="Add"
                    >
                      <Plus className="size-5" />
                    </button>
                    <div className="flex h-10 flex-1 items-center rounded-full border border-[#d1d1d6] bg-white px-4 text-[15px] text-[#b4b4b8]">
                      iMessage
                    </div>
                    <button
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full text-[#9c9ca3]"
                      aria-label="Voice"
                    >
                      <Mic className="size-5" />
                    </button>
                  </div>
                </div>
              </div>
            </PhoneShell>
          </div>
        </div>

          <div className="mt-9 w-full max-w-4xl">
            <div className="flex min-h-[24px] items-center justify-center">
              {currentAction ? (
                <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-medium text-[#6b7280] shadow-[0_8px_24px_-20px_rgba(15,23,42,0.2)]">
                  {currentAction}
                </span>
              ) : null}
          </div>

          <div className="mt-4 flex flex-col items-center">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8f8f8f]">
              <span>Voice signal</span>
              <span
                className={cn(
                  "transition-colors",
                  activeSpeaker ? speakerTone[activeSpeaker].text : "text-[#9ca3af]"
                )}
              >
                {activeSpeaker ? speakerTone[activeSpeaker].label : "Idle"}
              </span>
            </div>

            <div className="mt-3 flex h-12 items-end justify-center gap-[5px]">
              {waveformPattern.map((height, index) => (
                <span
                  key={`${index}-${activeSpeaker ?? "idle"}`}
                  className={cn(
                    "block w-[4px] rounded-full transition-colors duration-300",
                    activeSpeaker
                      ? "animate-[landing-waveform_0.7s_ease-in-out_infinite_alternate]"
                      : "opacity-45"
                  )}
                  style={{
                    height: activeSpeaker ? `${height}px` : "10px",
                    backgroundColor: activeSpeaker ? speakerTone[activeSpeaker].wave : "#c9ced6",
                    animationDelay: `${index * 0.06}s`,
                  }}
                />
              ))}
            </div>
          </div>

          <div
            ref={captionsScrollRef}
            className="mt-5 max-h-[240px] overflow-y-auto px-3 py-3"
          >
            {captions.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#b4b4b8]">Waiting for the first spoken line...</div>
            ) : null}

            <div className="flex flex-col gap-4">
              {captions.map((caption, index) => {
                const tone = speakerTone[caption.speaker]
                const isLatest = index === captions.length - 1

                return (
                  <div
                    key={caption.id}
                    className={cn(
                      "animate-[landing-caption_0.35s_ease]",
                      caption.speaker === "agent" ? "self-start text-left" : "self-end text-right"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[78%] text-[1.45rem] font-medium leading-tight tracking-tight transition-opacity md:text-[1.6rem]",
                        tone.text,
                        isLatest ? "opacity-100" : "opacity-50"
                      )}
                    >
                      {caption.text}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <select
            aria-label="Demo speed"
            className="rounded-full bg-white px-4 py-2 text-sm text-[#4b5563] shadow-[0_8px_24px_-20px_rgba(15,23,42,0.22)] outline-none"
            value={String(wordsPerSecond)}
            onChange={(event) => {
              clearIdleReplayTimer()
              setWordsPerSecond(Number(event.target.value))
            }}
          >
            {demoSpeedOptions.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => {
              clearIdleReplayTimer()
              setReplayToken((value) => value + 1)
            }}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#4b5563] shadow-[0_8px_24px_-20px_rgba(15,23,42,0.22)] transition hover:text-[#111827]"
          >
            <RotateCcw className="size-4" />
            Replay
          </button>

          <button
            type="button"
            onClick={onJumpToSignup}
            className="inline-flex items-center gap-2 rounded-full bg-[#111827] px-5 py-2 text-sm font-medium text-white transition hover:bg-[#1f2937]"
          >
            Continue to setup
            <ArrowRight className="size-4" />
          </button>
        </div>
      </div>
    </section>
  )
}
