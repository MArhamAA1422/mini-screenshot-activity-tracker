import { DateTime } from 'luxon'

/**
 * The default timezone for your application.
 * Use 'UTC' for storage in DB, 'Asia/Dhaka' for local display.
 */
export const APP_TIMEZONE = 'Asia/Dhaka'
export const DB_TIMEZONE = 'UTC'

/**
 * Get current time in app timezone (Dhaka)
 */
export const nowInAppZone = () => DateTime.now().setZone(APP_TIMEZONE)

/**
 * Get current UTC time for DB storage / comparison
 */
export const nowInUTC = () => DateTime.now().setZone(DB_TIMEZONE)

/**
 * Convert a Luxon DateTime to app timezone
 */
export const toAppZone = (dt: DateTime) => dt.setZone(APP_TIMEZONE)

/**
 * Convert a Luxon DateTime to UTC
 */
export const toUTC = (dt: DateTime) => dt.setZone(DB_TIMEZONE)
