type FormFieldProps = {
  label: string
  required?: boolean
  children: React.ReactNode
  style?: React.CSSProperties
  labelStyle?: React.CSSProperties
}

export function FormField({ label, required, children, style, labelStyle }: FormFieldProps) {
  return (
    <div style={{ marginBottom: 16, ...style }}>
      <label style={{ ...S.label, ...labelStyle }}>
        {label}
        {required && <span style={{ color: 'var(--danger)' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

const S: Record<string, React.CSSProperties> = {
  label: {
    display: 'block',
    fontWeight: 700,
    marginBottom: 6,
    fontSize: 'var(--body2-size)',
    color: 'var(--text-primary)',
  },
}
