'use client'

import Link from 'next/link'

export type SongPageFunctionZoneSelectOption = {
  value: string
  label: string
  href: string
}

export type SongPageFunctionZoneSelectControl = {
  id: string
  label: string
  value: string
  options: SongPageFunctionZoneSelectOption[]
}

export type SongPageFunctionZoneToggleOption = {
  label: string
  href: string
  isActive: boolean
}

export type SongPageFunctionZoneToggleControl = {
  id: string
  label: string
  options: SongPageFunctionZoneToggleOption[]
}

type SongPageFunctionZoneProps = {
  summary: string
  selects: SongPageFunctionZoneSelectControl[]
  toggles: SongPageFunctionZoneToggleControl[]
}

export default function SongPageFunctionZone({
  summary,
  selects,
  toggles
}: SongPageFunctionZoneProps) {
  function navigate(href: string) {
    if (!href) {
      return
    }

    window.location.assign(href)
  }

  return (
    <section className="page-function-zone" aria-label="Function Zone">
      <div className="page-function-zone-header">
        <div>
          <p className="page-function-zone-eyebrow">Quick Setup</p>
          <h2 className="page-function-zone-title">Function Zone</h2>
        </div>
        <p className="page-function-zone-summary">{summary}</p>
      </div>

      <div className="page-function-zone-grid">
        {selects.map(control => (
          <label key={control.id} className="page-function-zone-field">
            <span className="page-function-zone-label">{control.label}</span>
            <select
              aria-label={control.label}
              className="page-function-zone-select"
              value={control.value}
              onChange={event => {
                const selected = control.options.find(option => option.value === event.target.value)
                if (selected) {
                  navigate(selected.href)
                }
              }}
            >
              {control.options.map(option => (
                <option key={`${control.id}-${option.value}`} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <div className="page-function-zone-toggle-row">
        {toggles.map(control => (
          <div key={control.id} className="page-function-zone-toggle-group">
            <span className="page-function-zone-label">{control.label}</span>
            <div className="page-function-zone-toggle-list">
              {control.options.map(option => (
                <Link
                  key={`${control.id}-${option.label}`}
                  href={option.href}
                  aria-label={`${control.label}: ${option.label}`}
                  aria-current={option.isActive ? 'page' : undefined}
                  className={
                    option.isActive
                      ? 'page-function-zone-toggle page-function-zone-toggle-active'
                      : 'page-function-zone-toggle'
                  }
                >
                  {option.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
