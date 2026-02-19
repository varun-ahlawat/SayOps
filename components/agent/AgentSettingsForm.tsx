"use client"

import * as React from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
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
import { IconChevronDown, IconChevronRight, IconLoader2 } from "@tabler/icons-react"
import { ConnectorSelector } from "./ConnectorSelector"
import { updateAgent } from "@/lib/api-client"
import { toast } from "sonner"
import { Agent } from "@/lib/types"

const agentFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  system_prompt: z.string().min(10, {
    message: "Instructions must be at least 10 characters.",
  }),
  enabled_connectors: z.array(z.string()),
  has_knowledge_base: z.boolean().default(true),
})

type AgentFormValues = z.infer<typeof agentFormSchema>

export function AgentSettingsForm({ agent }: { agent: Agent }) {
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentFormSchema),
    defaultValues: {
      name: agent.name,
      description: agent.description || "",
      system_prompt: agent.system_prompt,
      enabled_connectors: agent.enabled_connectors || [],
      has_knowledge_base: agent.has_knowledge_base ?? true,
    },
  })

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
              <p className="text-xs text-muted-foreground">Manage connectors and knowledge base access.</p>
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
