// The professional types a practitioner can register as, with the labels
// shown across the app. Must match the ProfessionalType enum in the
// backend's prisma/schema.prisma and src/lib/professionalTypes.js.
export const PROFESSIONAL_TYPE_OPTIONS = [
  { value: 'COUNSELLOR', label: 'Counsellor' },
  { value: 'PSYCHOLOGIST', label: 'Psychologist' },
  { value: 'CLINICAL_PSYCHOLOGIST', label: 'Clinical Psychologist' },
  { value: 'PSYCHIATRIST', label: 'Psychiatrist' },
  { value: 'PSYCHIATRIC_CLINICAL_OFFICER', label: 'Psychiatric Clinical Officer' },
  { value: 'PSYCHIATRIC_NURSE', label: 'Psychiatric Nurse' },
]

export const PROFESSIONAL_TYPE_LABELS = Object.fromEntries(
  PROFESSIONAL_TYPE_OPTIONS.map((o) => [o.value, o.label])
)

export function professionalTypeLabel(type) {
  return PROFESSIONAL_TYPE_LABELS[type] ?? type
}