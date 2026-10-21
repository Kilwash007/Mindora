import PageHeader from './PageHeader.jsx'
import Card from './Card.jsx'

export default function Placeholder({ title, eyebrow, description, icon: Icon }) {
  return (
    <div>
      <PageHeader eyebrow={eyebrow} title={title} />
      <div className="p-8 max-w-2xl">
        <Card className="text-center py-16">
          {Icon && (
            <div className="mx-auto h-12 w-12 rounded-xl bg-navy-50 text-navy-600 flex items-center justify-center mb-4">
              <Icon className="h-6 w-6" />
            </div>
          )}
          <p className="text-ink-500 text-sm max-w-sm mx-auto">
            {description || 'This section is coming soon. We are building it step by step.'}
          </p>
        </Card>
      </div>
    </div>
  )
}