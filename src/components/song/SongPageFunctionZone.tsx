'use client'

import { useEffect, useState } from 'react'

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
  variant?: 'buttons' | 'switch'
}

type SongPageFunctionZoneProps = {
  selects: SongPageFunctionZoneSelectControl[]
  toggles: SongPageFunctionZoneToggleControl[]
  onNavigate?: (href: string) => void
}

export default function SongPageFunctionZone({
  selects,
  toggles,
  onNavigate
}: SongPageFunctionZoneProps) {
  const [isReady, setIsReady] = useState(false)
  const [isMobileExpanded, setIsMobileExpanded] = useState(false)

  useEffect(() => {
    setIsReady(true)
  }, [])

  function navigate(href: string) {
    if (!href) {
      return
    }

    if (onNavigate) {
      onNavigate(href)
      return
    }

    window.location.replace(href)
  }

  const primarySelectIds = new Set(['instrument', 'note-view'])
  const primaryToggleIds = new Set<string>()
  const primarySelects = selects.filter(control => primarySelectIds.has(control.id))
  const secondarySelects = selects.filter(control => !primarySelectIds.has(control.id))
  const primaryToggles = toggles.filter(control => primaryToggleIds.has(control.id))
  const secondaryToggles = toggles.filter(control => !primaryToggleIds.has(control.id))

  return (
    <section
      className="page-function-zone"
      aria-label="Function Zone"
      data-function-zone-ready={isReady ? '1' : '0'}
    >
      <div className="page-function-zone-mobile">
          <div className="page-function-zone-grid page-function-zone-grid-mobile">
            {primarySelects.map(control => (
              <label key={control.id} className="page-function-zone-field">
                <span className="page-function-zone-label">{control.label}</span>
                <select
                  aria-label={`${control.label} Mobile`}
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

          {primaryToggles.length > 0 ? (
            <div className="page-function-zone-toggle-row page-function-zone-toggle-row-mobile">
              {primaryToggles.map(control => (
                control.variant === 'switch' && control.options.length === 2 ? (
                  <SwitchToggleGroup key={control.id} control={control} onNavigate={navigate} />
                ) : (
                  <div key={control.id} className="page-function-zone-toggle-group">
                    <span className="page-function-zone-label">{control.label}</span>
                    <div className="page-function-zone-toggle-list">
                      {control.options.map(option => (
                        <button
                          key={`${control.id}-${option.label}`}
                          type="button"
                          aria-label={`${control.label}: ${option.label} Mobile`}
                          aria-pressed={option.isActive}
                          className={
                            option.isActive
                              ? 'page-function-zone-toggle page-function-zone-toggle-active'
                              : 'page-function-zone-toggle'
                          }
                          onClick={() => navigate(option.href)}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          ) : null}

          {secondarySelects.length > 0 || secondaryToggles.length > 0 ? (
            <div className="page-function-zone-disclosure">
              <button
                type="button"
                className="page-function-zone-disclosure-summary"
                aria-expanded={isMobileExpanded}
                onClick={() => setIsMobileExpanded(current => !current)}
              >
                <span>More controls</span>
                <span className="page-function-zone-disclosure-summary-state">
                  {isMobileExpanded ? 'Close' : 'Open'}
                </span>
              </button>
              {isMobileExpanded ? (
                <div className="page-function-zone-disclosure-content">
                  {secondarySelects.length > 0 ? (
                    <div className="page-function-zone-grid page-function-zone-grid-mobile-secondary">
                      {secondarySelects.map(control => (
                        <label key={control.id} className="page-function-zone-field">
                          <span className="page-function-zone-label">{control.label}</span>
                          <select
                            aria-label={`${control.label} Mobile`}
                            className="page-function-zone-select"
                            value={control.value}
                            onChange={event => {
                              const selected = control.options.find(
                                option => option.value === event.target.value
                              )
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
                  ) : null}

                  {secondaryToggles.length > 0 ? (
                    <div className="page-function-zone-toggle-row page-function-zone-toggle-row-mobile-secondary">
                      {secondaryToggles.map(control => (
                        control.variant === 'switch' && control.options.length === 2 ? (
                          <SwitchToggleGroup key={control.id} control={control} onNavigate={navigate} />
                        ) : (
                          <div key={control.id} className="page-function-zone-toggle-group">
                            <span className="page-function-zone-label">{control.label}</span>
                            <div className="page-function-zone-toggle-list">
                              {control.options.map(option => (
                                <button
                                  key={`${control.id}-${option.label}`}
                                  type="button"
                                  aria-label={`${control.label}: ${option.label} Mobile`}
                                  aria-pressed={option.isActive}
                                  className={
                                    option.isActive
                                      ? 'page-function-zone-toggle page-function-zone-toggle-active'
                                      : 'page-function-zone-toggle'
                                  }
                                  onClick={() => navigate(option.href)}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
      </div>

      <div className="page-function-zone-desktop">
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
            control.variant === 'switch' && control.options.length === 2 ? (
              <SwitchToggleGroup key={control.id} control={control} onNavigate={navigate} />
            ) : (
              <div key={control.id} className="page-function-zone-toggle-group">
                <span className="page-function-zone-label">{control.label}</span>
                <div className="page-function-zone-toggle-list">
                  {control.options.map(option => (
                    <button
                      key={`${control.id}-${option.label}`}
                      type="button"
                      aria-label={`${control.label}: ${option.label}`}
                      aria-pressed={option.isActive}
                      className={
                        option.isActive
                          ? 'page-function-zone-toggle page-function-zone-toggle-active'
                          : 'page-function-zone-toggle'
                      }
                      onClick={() => navigate(option.href)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          ))}
        </div>
      </div>
    </section>
  )
}

function SwitchToggleGroup({
  control,
  onNavigate
}: {
  control: SongPageFunctionZoneToggleControl
  onNavigate: (href: string) => void
}) {
  const activeOption = control.options.find(option => option.isActive) ?? control.options[0]
  const inactiveOption = control.options.find(option => !option.isActive) ?? control.options[1]
  const isActive = activeOption?.label === 'On'

  return (
    <div className="page-function-zone-switch-group">
      <span className="page-function-zone-label">{control.label}</span>
      <button
        type="button"
        aria-label={`${control.label}: ${activeOption?.label ?? 'Off'}`}
        aria-pressed="true"
        className={
          isActive
            ? 'page-function-zone-switch page-function-zone-switch-active'
            : 'page-function-zone-switch'
        }
        onClick={() => {
          if (inactiveOption) {
            onNavigate(inactiveOption.href)
          }
        }}
      >
        <span className="page-function-zone-switch-track">
          <span className="page-function-zone-switch-state page-function-zone-switch-state-off">
            Off
          </span>
          <span className="page-function-zone-switch-state page-function-zone-switch-state-on">
            On
          </span>
          <span className="page-function-zone-switch-thumb" aria-hidden="true" />
        </span>
      </button>
    </div>
  )
}
