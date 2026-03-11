import type { Metadata } from "next"
import MarketingPageShell from "@/components/marketing/MarketingPageShell"

export const metadata: Metadata = {
  title: "Messaging Policy & Terms | SpeakOps by 0 Lumen Labs",
  description:
    "Messaging Policy, Terms & Conditions, and opt-in consent information for SpeakOps AI customer support messaging service.",
}

export default function TermsPage() {
  return (
    <MarketingPageShell
      title="Messaging Policy & Terms"
      subtitle="Effective Date: February 12, 2026"
    >
      <div className="space-y-10 text-[#111827]">
        <section className="rounded-[22px] border-l-4 border-[#111827] bg-white px-6 py-6 shadow-[0_14px_34px_-30px_rgba(15,23,42,0.28)]">
          <h2 className="text-2xl font-semibold tracking-tight text-[#111827]">Proof of consent (opt-in)</h2>
          <div className="mt-5 space-y-4 text-base leading-8 text-[#374151]">
            <p>SpeakOps, provided by 0 Lumen Labs, offers AI-powered SMS customer service for small businesses. Customers initiate messaging by texting a business&apos;s publicly listed toll-free phone number (for example, on the business website, Google Business Profile, or signage).</p>
            <p>By sending the first message, the customer consents to receive conversational responses and service-related notifications regarding their inquiry, such as:</p>
            <ul className="list-disc space-y-2 pl-6">
              <li>Customer support replies</li>
              <li>Scheduling updates</li>
              <li>Appointment confirmations</li>
              <li>Job status alerts</li>
              <li>Service-related information and updates</li>
            </ul>
            <p><strong>SpeakOps does not send promotional or marketing messages.</strong> All messages are transactional and service-related, responding directly to customer inquiries and providing necessary support updates.</p>
            <p>Customers can opt out at any time by replying <strong>STOP</strong>. For help, reply <strong>HELP</strong>. Message and data rates may apply.</p>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="border-b border-black/10 pb-3 text-2xl font-semibold tracking-tight text-[#111827]">Messaging Service Terms</h2>
          <div className="space-y-6 text-base leading-8 text-[#374151]">
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Service Description</h3>
              <p className="mt-2">SpeakOps provides AI-powered customer support via SMS and phone. When customers contact a business using SpeakOps by texting or calling the business&apos;s toll-free number, they will receive automated responses powered by artificial intelligence, as well as service-related notifications about their inquiries.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Message Frequency</h3>
              <p className="mt-2">Message frequency varies based on customer interaction and inquiry needs. Customers will receive:</p>
              <ul className="mt-2 list-disc space-y-2 pl-6">
                <li>Immediate responses to their text messages</li>
                <li>Follow-up messages related to their service request</li>
                <li>Status updates and notifications as needed</li>
                <li>Confirmation messages for appointments or actions</li>
              </ul>
              <p className="mt-2">No recurring promotional messages are sent.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Opt-Out Instructions</h3>
              <p className="mt-2">Customers may opt out of receiving messages at any time by replying <strong>STOP</strong>, <strong>UNSUBSCRIBE</strong>, <strong>CANCEL</strong>, <strong>END</strong>, or <strong>QUIT</strong> to any message. Upon receipt of an opt-out request, the customer will receive a final confirmation message and will no longer receive messages from that business&apos;s SpeakOps number.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Help Instructions</h3>
              <p className="mt-2">For assistance, customers can reply <strong>HELP</strong> or <strong>INFO</strong> to any message. They will receive information about the service and contact details for support.</p>
              <p className="mt-2">For additional support, customers can contact the business directly or reach SpeakOps support at: <strong>shwejan@0lumens.com</strong></p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Message and Data Rates</h3>
              <p className="mt-2">Standard message and data rates may apply based on the customer&apos;s mobile carrier plan. SpeakOps does not charge customers for messages, but carrier charges may apply.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Supported Carriers</h3>
              <p className="mt-2">SpeakOps messaging services are available on all major U.S. wireless carriers, including but not limited to AT&amp;T, T-Mobile, Verizon, Sprint, and other participating carriers.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Privacy</h3>
              <p className="mt-2">Customer information is handled in accordance with our privacy practices. Message content, phone numbers, and interaction data are used solely to provide customer support services. We do not sell or share customer data with third parties for marketing purposes.</p>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="border-b border-black/10 pb-3 text-2xl font-semibold tracking-tight text-[#111827]">Terms of Service</h2>
          <div className="space-y-6 text-base leading-8 text-[#374151]">
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Acceptance of Terms</h3>
              <p className="mt-2">By using SpeakOps services (messaging or voice support), you agree to these Terms of Service. If you do not agree, please do not use the service.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Service Use</h3>
              <p className="mt-2">SpeakOps is designed to provide customer support for businesses. The service should be used for legitimate customer service inquiries. Prohibited uses include:</p>
              <ul className="mt-2 list-disc space-y-2 pl-6">
                <li>Harassment, abuse, or threatening behavior</li>
                <li>Fraudulent requests or impersonation</li>
                <li>Attempts to exploit, spam, or misuse the service</li>
                <li>Any illegal activity or violation of applicable laws</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Service Availability</h3>
              <p className="mt-2">We strive to provide reliable service, but SpeakOps is provided &quot;as is&quot; without warranties of any kind. Service availability may be affected by factors including but not limited to:</p>
              <ul className="mt-2 list-disc space-y-2 pl-6">
                <li>Mobile carrier network availability</li>
                <li>Internet connectivity</li>
                <li>Scheduled maintenance</li>
                <li>Technical issues beyond our control</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Limitation of Liability</h3>
              <p className="mt-2">0 Lumen Labs and SpeakOps are not liable for any indirect, incidental, special, or consequential damages arising from the use or inability to use the service, including but not limited to service interruptions, message delivery failures, or AI response accuracy.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">AI-Powered Service Disclaimer</h3>
              <p className="mt-2">SpeakOps uses artificial intelligence to provide customer support. While we strive for accuracy, AI responses may occasionally contain errors or misunderstandings. For critical or sensitive matters, customers are encouraged to request human assistance.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Modifications to Terms</h3>
              <p className="mt-2">We reserve the right to modify these terms at any time. Continued use of SpeakOps after changes constitutes acceptance of the modified terms. Material changes will be communicated through our website.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-[#111827]">Governing Law</h3>
              <p className="mt-2">These terms are governed by the laws of the jurisdiction in which 0 Lumen Labs operates, without regard to conflict of law provisions.</p>
            </div>
          </div>
        </section>

        <section className="space-y-5">
          <h2 className="border-b border-black/10 pb-3 text-2xl font-semibold tracking-tight text-[#111827]">Contact Information</h2>
          <div className="space-y-4 text-base leading-8 text-[#374151]">
            <p>For questions about these terms, our messaging policy, or SpeakOps services, please contact:</p>
            <p>
              <strong>0 Lumen Labs</strong>
              <br />
              Email: <a href="mailto:shwejan@0lumens.com" className="font-medium text-[#111827] underline underline-offset-4">shwejan@0lumens.com</a>
              <br />
              Website: <a href="https://0lumens.com" className="font-medium text-[#111827] underline underline-offset-4">https://0lumens.com</a>
            </p>
          </div>
        </section>

        <div className="border-t border-black/10 pt-8 text-sm text-[#6b7280]">
          Last Updated: February 12, 2026
        </div>
      </div>
    </MarketingPageShell>
  )
}
