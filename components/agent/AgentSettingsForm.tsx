"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { IconChevronDown, IconChevronRight, IconLoader2, IconCheck, IconPlugConnected, IconX } from "@tabler/icons-react"
import { ConnectorSelector } from "./ConnectorSelector"
import {
  updateAgent,
  getAgentChannels,
  enableAgentChannel,
  disableAgentChannel,
  type AgentChannelBinding,
} from "@/lib/api-client"
import { toast } from "sonner"
import { Agent } from "@/lib/types"

// Non-Meta channels — simple checkboxes (no account binding needed)
const SIMPLE_PLATFORMS = [
  { id: 'sms', label: 'SMS' },
  { id: 'voice', label: 'Voice' },
  { id: 'web', label: 'Web Chat' },
]

// Meta channels — need full provisioning flow
const META_CHANNELS = [
  { id: 'facebook', label: 'Facebook Messenger' },
  { id: 'instagram', label: 'Instagram DM' },
]

const agentFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  system_prompt: z.string().min(10, {
    message: "Instructions must be at least 10 characters.",
  }),
  enabled_connectors: z.array(z.string()),
  platforms: z.array(z.string()),
  has_knowledge_base: z.boolean().default(true),
})

type AgentFormValues = z.infer<typeof agentFormSchema>

function MetaChannelCard({
  channel,
  label,
  agentId,
  binding,
  onRefresh,
}: {
  channel: string
  label: string
  agentId: string
  binding: AgentChannelBinding | undefined
  onRefresh: () => void
}) {
  const [loading, setLoading] = React.useState(false)
  const [pendingAccounts, setPendingAccounts] = React.useState<{ id: string; name: string | null }[] | null>(null)

  async function handleEnable(accountId?: string) {
    setLoading(true)
    try {
      const result = await enableAgentChannel(agentId, channel, accountId)

      if (result.status === 'success') {
        toast.success(`${label} connected successfully`)
        setPendingAccounts(null)
        onRefresh()
      } else if (result.status === 'needs_oauth') {
        // Redirect to Facebook OAuth — will come back to agent settings after
        window.location.href = result.oauthUrl
      } else if (result.status === 'needs_selection') {
        setPendingAccounts(result.accounts)
      } else if (result.status === 'error') {
        toast.error(result.error)
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to enable ${label}`)
    } finally {
      setLoading(false)
    }
  }

  async function handleDisable() {
    setLoading(true)
    try {
      await disableAgentChannel(agentId, channel)
      toast.success(`${label} disconnected`)
      onRefresh()
    } catch (err: any) {
      toast.error(err.message || `Failed to disable ${label}`)
    } finally {
      setLoading(false)
    }
  }

  // Page picker when org has multiple Facebook pages
  if (pendingAccounts) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <div className="text-sm font-medium">{label}</div>
        <p className="text-xs text-muted-foreground">Select which page to connect:</p>
        <div className="flex flex-col gap-1">
          {pendingAccounts.map((account) => (
            <Button
              key={account.id}
              variant="outline"
              size="sm"
              onClick={() => handleEnable(account.id)}
              disabled={loading}
              className="justify-start"
            >
              {account.name || account.id}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setPendingAccounts(null)}>
          Cancel
        </Button>
      </div>
    )
  }

  // Connected state
  if (binding) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950 p-3">
        <div className="flex items-center gap-2">
          <IconCheck className="h-4 w-4 text-green-600" />
          <div>
            <div className="text-sm font-medium">{label}</div>
            <div className="text-xs text-muted-foreground">
              {binding.account_name || binding.account_id}
              {!binding.webhook_subscribed && (
                <span className="text-amber-600 ml-1">(webhook pending)</span>
              )}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisable}
          disabled={loading}
          className="text-destructive hover:text-destructive"
        >
          {loading ? <IconLoader2 className="h-4 w-4 animate-spin" /> : <IconX className="h-4 w-4" />}
        </Button>
      </div>
    )
  }

  // Disconnected state
  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="text-sm font-medium">{label}</div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleEnable()}
        disabled={loading}
      >
        {loading ? (
          <IconLoader2 className="mr-1 h-4 w-4 animate-spin" />
        ) : (
          <IconPlugConnected className="mr-1 h-4 w-4" />
        )}
        Connect
      </Button>
    </div>
  )
}

export function AgentSettingsForm({ agent }: { agent: Agent }) {
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [channelBindings, setChannelBindings] = React.useState<AgentChannelBinding[]>([])

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: agent.name,
      description: agent.description || "",
      system_prompt: agent.system_prompt,
      enabled_connectors: agent.enabled_connectors || [],
      platforms: agent.platforms || ['sms', 'voice'],
      has_knowledge_base: agent.has_knowledge_base ?? true,
    },
  })

  // Load channel bindings on mount
  const loadChannels = React.useCallback(async () => {
    try {
      const channels = await getAgentChannels(agent.id)
      setChannelBindings(channels)
    } catch {
      // silently fail — channels section still shows "disconnected"
    }
  }, [agent.id])

  React.useEffect(() => {
    loadChannels()

    // Check for channel_connected query param (after OAuth redirect)
    const params = new URLSearchParams(window.location.search)
    const connected = params.get('channel_connected')
    if (connected) {
      toast.success(`${connected === 'facebook' ? 'Facebook Messenger' : 'Instagram DM'} connected successfully`)
      // Clean up URL
      params.delete('channel_connected')
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params}`
        : window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [loadChannels])

  async function onSubmit(data: AgentFormValues) {
    setIsSubmitting(true)
    try {
      await updateAgent(agent.id, data)
      toast.success("Agent settings updated successfully")
    } catch (err: any) {
      toast.error(err.message || "Failed to update agent settings")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="instructions">System Prompt</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Agent Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Support Bot" {...field} />
                  </FormControl>
                  <FormDescription>
                    This is the name that will be displayed to users.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Short description..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>

          <TabsContent value="instructions" className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="system_prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="You are a helpful assistant..."
                      className="min-h-[250px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Define the agent's persona, rules, and core logic.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        <Collapsible
          open={isAdvancedOpen}
          onOpenChange={setIsAdvancedOpen}
          className="border rounded-lg p-4 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Advanced Settings</h4>
              <p className="text-xs text-muted-foreground">Manage connectors, channels, and knowledge base access.</p>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="w-9 p-0">
                {isAdvancedOpen ? (
                  <IconChevronDown className="h-4 w-4" />
                ) : (
                  <IconChevronRight className="h-4 w-4" />
                )}
                <span className="sr-only">Toggle</span>
              </Button>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent className="space-y-6 pt-4">
            <FormField
              control={form.control}
              name="has_knowledge_base"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Knowledge Base Access</FormLabel>
                    <FormDescription>
                      Allow this agent to search your business documents.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enabled_connectors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Enabled Connectors</FormLabel>
                  <FormDescription>Select which third-party tools this agent can use.</FormDescription>
                  <FormControl>
                    <ConnectorSelector
                      selected={field.value || []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Simple channels — checkboxes (sms, voice, web) */}
            <FormField
              control={form.control}
              name="platforms"
              render={() => (
                <FormItem>
                  <FormLabel>Basic Channels</FormLabel>
                  <FormDescription>
                    Toggle simple channels that don't require account linking.
                  </FormDescription>
                  <div className="grid grid-cols-2 gap-2 pt-2">
                    {SIMPLE_PLATFORMS.map((platform) => (
                      <FormField
                        key={platform.id}
                        control={form.control}
                        name="platforms"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(platform.id)}
                                onCheckedChange={(checked) => {
                                  const current = field.value || []
                                  if (checked) {
                                    field.onChange([...current, platform.id])
                                  } else {
                                    field.onChange(current.filter((v) => v !== platform.id))
                                  }
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {platform.label}
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Meta channels — full provisioning cards */}
            <div>
              <h4 className="text-sm font-medium mb-1">Social Channels</h4>
              <p className="text-xs text-muted-foreground mb-3">
                Connect your Facebook Page or Instagram Business Account. OAuth authorization is required.
              </p>
              <div className="flex flex-col gap-2">
                {META_CHANNELS.map((ch) => (
                  <MetaChannelCard
                    key={ch.id}
                    channel={ch.id}
                    label={ch.label}
                    agentId={agent.id}
                    binding={channelBindings.find(b => b.channel === ch.id)}
                    onRefresh={loadChannels}
                  />
                ))}
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="flex justify-end pt-4 border-t">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
