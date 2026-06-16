'use client'

import { useEffect, useLayoutEffect } from 'react'
import { canUseBrowserDOM } from './browserEnvironment'

export const useBrowserLayoutEffect = canUseBrowserDOM() ? useLayoutEffect : useEffect
