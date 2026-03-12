import keytar from 'keytar'

const SERVICE_NAME = 'AI Compare'

export interface PasswordManager {
  getPassword: (account: string) => Promise<string | null>
  setPassword: (account: string, password: string) => Promise<void>
  deletePassword: (account: string) => Promise<boolean>
}

export function createPasswordManager(): PasswordManager {
  return {
    async getPassword(account: string): Promise<string | null> {
      try {
        return await keytar.getPassword(SERVICE_NAME, account)
      } catch (error) {
        console.error('[PasswordManager] Failed to get password:', error)
        return null
      }
    },

    async setPassword(account: string, password: string): Promise<void> {
      try {
        await keytar.setPassword(SERVICE_NAME, account, password)
        console.log('[PasswordManager] Password saved for:', account)
      } catch (error) {
        console.error('[PasswordManager] Failed to set password:', error)
        throw error
      }
    },

    async deletePassword(account: string): Promise<boolean> {
      try {
        return await keytar.deletePassword(SERVICE_NAME, account)
      } catch (error) {
        console.error('[PasswordManager] Failed to delete password:', error)
        return false
      }
    },
  }
}
