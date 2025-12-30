export const hashConfig = {
   driver: 'argon2' as const,

   argon2: {
      version: 0x13,
      variant: 'id' as const,
      iterations: 3,
      memory: 65536,
      parallelism: 4,
      saltSize: 16,
   },
}

export default hashConfig
