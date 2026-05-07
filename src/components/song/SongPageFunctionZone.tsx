'use client'

import { ChevronDown, ChevronUp, LoaderCircle, PlayCircle, SlidersHorizontal, Square } from 'lucide-react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { useEffect, useRef, useState } from 'react'

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

export type SongPageFunctionZoneActionControl = {
  id: string
  label: string
  ariaLabel: string
  onClick: () => void
  icon?: 'play' | 'stop' | 'loading'
  disabled?: boolean
}

type SongPageFunctionZoneProps = {
  selects: SongPageFunctionZoneSelectControl[]
  toggles: SongPageFunctionZoneToggleControl[]
  actions?: SongPageFunctionZoneActionControl[]
  onNavigate?: (href: string) => void
}

type NavigateOptions = {
  closeMobile?: boolean
  closeDesktop?: boolean
}

export default function SongPageFunctionZone({
  selects,
  toggles,
  actions = [],
  onNavigate
}: SongPageFunctionZoneProps) {
  const [isReady, setIsReady] = useState(false)
  const [isMobileExpanded, setIsMobileExpanded] = useState(false)
  const [isDesktopExpanded, setIsDesktopExpanded] = useState(false)
  const mobileSheetRef = useRef<HTMLDivElement | null>(null)
  const mobileBackdropDragRef = useRef<{
    startY: number
    lastY: number
    moved: boolean
  } | null>(null)
  const desktopMoreRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    setIsReady(true)
  }, [])

  useEffect(() => {
    if (!isDesktopExpanded) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!desktopMoreRef.current?.contains(event.target as Node)) {
        setIsDesktopExpanded(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDesktopExpanded(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isDesktopExpanded])

  useEffect(() => {
    if (!isMobileExpanded) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsMobileExpanded(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isMobileExpanded])

  function handleMobileBackdropPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation()
    mobileBackdropDragRef.current = {
      startY: event.clientY,
      lastY: event.clientY,
      moved: false
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleMobileBackdropPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const gesture = mobileBackdropDragRef.current
    if (!gesture) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    const totalDelta = event.clientY - gesture.startY
    const scrollDelta = gesture.lastY - event.clientY
    if (Math.abs(totalDelta) > 6) {
      gesture.moved = true
    }
    if (scrollDelta !== 0) {
      window.scrollBy({ top: scrollDelta, behavior: 'auto' })
    }
    gesture.lastY = event.clientY
  }

  function handleMobileBackdropPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    const gesture = mobileBackdropDragRef.current
    mobileBackdropDragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!gesture?.moved) {
      setIsMobileExpanded(false)
    }
  }

  function handleMobileBackdropWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    window.scrollBy({ top: event.deltaY, behavior: 'auto' })
  }

  function navigate(href: string, options: NavigateOptions = {}) {
    if (!href) {
      return
    }

    if (options.closeMobile ?? true) {
      setIsMobileExpanded(false)
    }

    if (options.closeDesktop ?? true) {
      setIsDesktopExpanded(false)
    }

    if (onNavigate) {
      onNavigate(href)
      return
    }

    window.location.replace(href)
  }

  const primarySelectIds = new Set(['instrument', 'fingering-key'])
  const desktopPrimarySelectIds = new Set(['instrument', 'fingering-key'])
  const primaryToggleIds = new Set<string>()
  const primarySelects = selects.filter(control => primarySelectIds.has(control.id))
  const secondarySelects = selects.filter(control => !primarySelectIds.has(control.id))
  const desktopPrimarySelects = selects.filter(control => desktopPrimarySelectIds.has(control.id))
  const desktopSecondarySelects = selects.filter(control => !desktopPrimarySelectIds.has(control.id))
  const primaryToggles = toggles.filter(control => primaryToggleIds.has(control.id))
  const secondaryToggles = toggles.filter(control => !primaryToggleIds.has(control.id))
  const hasDesktopMoreControls = desktopSecondarySelects.length > 0 || toggles.length > 0
  const hasMobileMoreControls = secondarySelects.length > 0 || secondaryToggles.length > 0
  const navigateWithinMobileSheet = (href: string) =>
    navigate(href, { closeMobile: false, closeDesktop: false })
  const navigateWithinDesktopPanel = (href: string) =>
    navigate(href, { closeMobile: false, closeDesktop: false })

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

          {hasMobileMoreControls || actions.length > 0 ? (
            <>
              <div
                className={
                  hasMobileMoreControls
                    ? 'page-function-zone-mobile-action-row'
                    : 'page-function-zone-mobile-action-row page-function-zone-mobile-action-row-actions-only'
                }
              >
                {hasMobileMoreControls ? (
                  <button
                    type="button"
                    className="page-function-zone-disclosure-summary page-function-zone-mobile-more-button"
                    aria-expanded={isMobileExpanded}
                    onClick={() => setIsMobileExpanded(current => !current)}
                  >
                    <span className="page-function-zone-mobile-more-left">
                      <SlidersHorizontal className="page-function-zone-mobile-more-icon" aria-hidden="true" />
                      <span>More Tools</span>
                    </span>
                    <span className="page-function-zone-disclosure-summary-state">
                      {isMobileExpanded ? 'Close' : 'Open'}
                    </span>
                  </button>
                ) : null}
                {actions.map(action => (
                  <ActionButton key={action.id} action={action} variant="mobile" />
                ))}
              </div>

              {isMobileExpanded ? (
                <div className="page-function-zone-mobile-sheet-layer" aria-hidden="false">
                  <div
                    className="page-function-zone-mobile-sheet-backdrop"
                    onPointerDown={handleMobileBackdropPointerDown}
                    onPointerMove={handleMobileBackdropPointerMove}
                    onPointerUp={handleMobileBackdropPointerUp}
                    onPointerCancel={() => {
                      mobileBackdropDragRef.current = null
                    }}
                    onWheel={handleMobileBackdropWheel}
                  />
                  <div
                    className="page-function-zone-mobile-sheet"
                    role="dialog"
                    aria-modal="true"
                    aria-label="More Tools"
                    ref={mobileSheetRef}
                  >
                    <div className="page-function-zone-mobile-sheet-header">
                      <div>
                        <div className="page-function-zone-mobile-sheet-kicker">More Tools</div>
                        <div className="page-function-zone-mobile-sheet-title">
                          Display and playback settings
                        </div>
                      </div>
                      <button
                        type="button"
                        className="page-function-zone-mobile-sheet-close"
                        aria-label="Close more tools"
                        onClick={() => setIsMobileExpanded(false)}
                      >
                        <ChevronDown aria-hidden="true" />
                      </button>
                    </div>
                    <div className="page-function-zone-mobile-sheet-content">
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
                                    navigateWithinMobileSheet(selected.href)
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
                              <SwitchToggleGroup
                                key={control.id}
                                control={control}
                                onNavigate={navigateWithinMobileSheet}
                              />
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
                                      onClick={() => navigateWithinMobileSheet(option.href)}
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
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
      </div>

      <div className="page-function-zone-desktop">
        <div className="page-function-zone-desktop-bar">
          <div className="page-function-zone-grid page-function-zone-grid-desktop-primary">
            {desktopPrimarySelects.map(control => (
              <SelectField key={control.id} control={control} onNavigate={navigate} />
            ))}
          </div>

          {hasDesktopMoreControls ? (
            <div className="page-function-zone-desktop-more" ref={desktopMoreRef}>
              <button
                type="button"
                className="page-function-zone-desktop-more-button"
                aria-expanded={isDesktopExpanded}
                aria-controls="song-page-more-controls"
                onClick={() => setIsDesktopExpanded(current => !current)}
              >
                <SlidersHorizontal className="page-function-zone-desktop-more-icon" aria-hidden="true" />
                <span>More Tools</span>
                {isDesktopExpanded ? (
                  <ChevronUp className="page-function-zone-desktop-more-chevron" aria-hidden="true" />
                ) : (
                  <ChevronDown
                    className="page-function-zone-desktop-more-chevron"
                    aria-hidden="true"
                  />
                )}
              </button>

              {isDesktopExpanded ? (
                <div
                  id="song-page-more-controls"
                  className="page-function-zone-desktop-more-panel"
                >
                  {desktopSecondarySelects.length > 0 ? (
                    <div className="page-function-zone-grid page-function-zone-grid-desktop-secondary">
                      {desktopSecondarySelects.map(control => (
                        <SelectField
                          key={control.id}
                          control={control}
                          onNavigate={navigateWithinDesktopPanel}
                        />
                      ))}
                    </div>
                  ) : null}

                  {toggles.length > 0 ? (
                    <div className="page-function-zone-toggle-row page-function-zone-toggle-row-desktop-more">
                      {toggles.map(control => (
                        control.variant === 'switch' && control.options.length === 2 ? (
                          <SwitchToggleGroup
                            key={control.id}
                            control={control}
                            onNavigate={navigateWithinDesktopPanel}
                          />
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
                                  onClick={() => navigateWithinDesktopPanel(option.href)}
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

          {actions.length > 0 ? (
            <div
              className={
                hasDesktopMoreControls
                  ? 'page-function-zone-desktop-actions'
                  : 'page-function-zone-desktop-actions page-function-zone-desktop-actions-only'
              }
            >
              {actions.map(action => (
                <ActionButton key={action.id} action={action} variant="desktop" />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function ActionButton({
  action,
  variant
}: {
  action: SongPageFunctionZoneActionControl
  variant: 'desktop' | 'mobile'
}) {
  const icon =
    action.icon === 'stop' ? (
      <Square className="page-function-zone-action-icon" aria-hidden="true" />
    ) : action.icon === 'loading' ? (
      <LoaderCircle
        className="page-function-zone-action-icon page-function-zone-action-icon-spinning"
        aria-hidden="true"
      />
    ) : (
      <PlayCircle className="page-function-zone-action-icon" aria-hidden="true" />
    )

  return (
    <button
      type="button"
      className={`page-function-zone-action page-function-zone-action-${variant}`}
      aria-label={action.ariaLabel}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {icon}
      <span>{action.label}</span>
    </button>
  )
}

function SelectField({
  control,
  onNavigate
}: {
  control: SongPageFunctionZoneSelectControl
  onNavigate: (href: string) => void
}) {
  return (
    <label className="page-function-zone-field">
      <span className="page-function-zone-label">{control.label}</span>
      <select
        aria-label={control.label}
        className="page-function-zone-select"
        value={control.value}
        onChange={event => {
          const selected = control.options.find(option => option.value === event.target.value)
          if (selected) {
            onNavigate(selected.href)
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
