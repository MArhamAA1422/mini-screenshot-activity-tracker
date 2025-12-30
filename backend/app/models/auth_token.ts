import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, beforeCreate } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from './user.js'

export default class AuthToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare tokenHash: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime()
  declare rotatedAt?: DateTime

  @column()
  declare isRevoked: boolean

  @column()
  declare ipAddress?: string

  @column()
  declare userAgent?: string

  @column.dateTime()
  declare lastUsedAt?: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  // Hooks
  @beforeCreate()
  static async setDefaults(token: AuthToken) {
    if (!token.isRevoked) {
      token.isRevoked = false
    }
  }

  // Helper methods
  isExpired(): boolean {
    return this.expiresAt < DateTime.now()
  }

  isValid(): boolean {
    return !this.isRevoked && !this.isExpired()
  }

  needsRotation(): boolean {
    if (this.isRevoked) {
      return false
    }

    const rotationInterval = 24 // hours
    const lastRotation = this.rotatedAt || this.createdAt
    const hoursSinceRotation = DateTime.now().diff(lastRotation, 'hours').hours

    return hoursSinceRotation >= rotationInterval
  }

  isInGracePeriod(): boolean {
    if (!this.rotatedAt) {
      return false
    }

    const gracePeriodMinutes = 15
    const minutesSinceRotation = DateTime.now().diff(this.rotatedAt, 'minutes').minutes

    return minutesSinceRotation <= gracePeriodMinutes
  }

  async updateLastUsed(ipAddress?: string, userAgent?: string): Promise<void> {
    this.lastUsedAt = DateTime.now()
    if (ipAddress) this.ipAddress = ipAddress
    if (userAgent) this.userAgent = userAgent
    await this.save()
  }

  async revoke(): Promise<void> {
    this.isRevoked = true
    await this.save()
  }

  async markAsRotated(): Promise<void> {
    this.rotatedAt = DateTime.now()
    await this.save()
  }

  // Static helper methods
  static async cleanupExpiredTokens(): Promise<number> {
    const result = await AuthToken.query()
      .where('expires_at', '<', DateTime.now().toSQL())
      .orWhere('is_revoked', true)
      .delete()

    return Number(result)
  }

  static async revokeUserTokens(userId: number): Promise<void> {
    await AuthToken.query().where('user_id', userId).update({ is_revoked: true })
  }

  static async getUserActiveTokenCount(userId: number): Promise<number> {
    const result = await AuthToken.query()
      .where('user_id', userId)
      .where('is_revoked', false)
      .where('expires_at', '>', DateTime.now().toSQL())
      .count('* as total')

    return Number(result[0].$extras.total)
  }

  // Serialization
  serializeExtras() {
    return {
      is_expired: this.isExpired(),
      needs_rotation: this.needsRotation(),
      is_in_grace_period: this.isInGracePeriod(),
    }
  }
}
