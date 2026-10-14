import { BookOpen, ExternalLink, Smartphone, GraduationCap, Globe, LifeBuoy, AlertTriangle } from 'lucide-react'
import PageHeader from '../../components/PageHeader.jsx'
import Card from '../../components/Card.jsx'

// Clinical reference material for professionals only — never shown in the
// patient portal. Everything links to WHO/PAHO's official pages rather than
// hosting copies, so professionals always reach the current version and
// Mindora doesn't redistribute WHO publications.
const resources = [
  {
    icon: BookOpen,
    title: 'mhGAP Intervention Guide, Version 2.0',
    description:
      "WHO's guide for managing mental, neurological and substance use conditions in non-specialist settings, with clinical decision algorithms, including the self-harm and suicide module and Essential Care and Practice.",
    linkLabel: 'Open on WHO',
    href: 'https://www.who.int/publications/i/item/9789241549790',
  },
  {
    icon: Globe,
    title: 'mhGAP Intervention Guide, online e-version',
    description: 'An interactive web version of the guide, useful for quick reference during practice.',
    linkLabel: 'Open the e-version',
    href: 'https://www3.paho.org/mhgap/en/',
  },
  {
    icon: Smartphone,
    title: 'e-mhGAP app (iOS)',
    description: 'The mhGAP Intervention Guide as a mobile app for use on the go.',
    linkLabel: 'View in the App Store',
    href: 'https://itunes.apple.com/gb/app/mhgap-ig-2-0-app-e-mhgap/id1291414206?mt=8',
  },
  {
    icon: GraduationCap,
    title: 'mhGAP Training Manual',
    description: 'Training material for health workers implementing the mhGAP Intervention Guide.',
    linkLabel: 'Open on WHO',
    href: 'https://apps.who.int/iris/handle/10665/259161',
  },
  {
    icon: LifeBuoy,
    title: 'mhGAP Humanitarian Intervention Guide (mhGAP-HIG)',
    description:
      'Guidance for clinical management of mental, neurological and substance use conditions in humanitarian and emergency settings, including trauma.',
    linkLabel: 'Open on WHO',
    href: 'https://www.who.int/publications/i/item/9789241548922',
  },
]

const crisisLines = [
  { name: 'Emergency services', contact: '999 or 112' },
  { name: 'Kenya Red Cross', contact: '1199' },
  { name: 'Befrienders Kenya', contact: '+254 722 178 177' },
  { name: 'NACADA (substance use)', contact: '1192' },
]

export default function ClinicalResources() {
  return (
    <div>
      <PageHeader
        eyebrow="Clinical resources"
        title="Reference guides for practice"
        subtitle="Official WHO resources to support assessment, safety planning and care. These are clinical tools for professionals and should not be shared with clients as self-help material."
      />

      <div className="p-4 md:p-8 max-w-3xl space-y-4">
        {resources.map((r) => (
          <Card key={r.title} className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-navy-50 text-navy-700 flex items-center justify-center shrink-0">
              <r.icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-navy-800 mb-1">{r.title}</h3>
              <p className="text-sm text-ink-600 mb-3">{r.description}</p>
              <a
                href={r.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700"
              >
                {r.linkLabel} <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </Card>
        ))}

        <Card>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <h3 className="font-semibold text-navy-800">Crisis lines for urgent referral</h3>
          </div>
          <p className="text-sm text-ink-600 mb-4">
            If a client is at immediate risk, follow Mindora's safety escalation procedure and connect them to
            emergency support straight away.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {crisisLines.map((c) => (
              <div key={c.name} className="rounded-lg bg-ink-50 px-4 py-3">
                <p className="text-xs text-ink-500">{c.name}</p>
                <p className="font-semibold text-navy-800">{c.contact}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}