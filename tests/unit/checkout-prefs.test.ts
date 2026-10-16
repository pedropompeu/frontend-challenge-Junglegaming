// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  getCheckoutPrefs,
  moveGuestCoupon,
  setCheckoutPrefs,
} from '@/features/quote/checkout-prefs'

describe('moveGuestCoupon', () => {
  beforeEach(() => localStorage.clear())

  it('hands the coupon applied as guest to the user and keeps the user network', () => {
    setCheckoutPrefs('guest:gst_1', { couponCode: 'KURIO10' })
    setCheckoutPrefs('user:usr_ana', { couponCode: 'LAUNCH20', network: 'polygon' })
    moveGuestCoupon('guest:gst_1', 'user:usr_ana')
    expect(getCheckoutPrefs('user:usr_ana')).toEqual({ couponCode: 'KURIO10', network: 'polygon' })
    expect(localStorage.getItem('kurio:checkout:guest:gst_1')).toBeNull()
  })

  it('keeps the user coupon when the guest applied none', () => {
    setCheckoutPrefs('user:usr_ana', { couponCode: 'LAUNCH20' })
    moveGuestCoupon('guest:gst_1', 'user:usr_ana')
    setCheckoutPrefs('guest:gst_2', { couponCode: null })
    moveGuestCoupon('guest:gst_2', 'user:usr_ana')
    expect(getCheckoutPrefs('user:usr_ana').couponCode).toBe('LAUNCH20')
  })
})
