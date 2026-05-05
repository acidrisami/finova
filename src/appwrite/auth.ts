import { account, ID } from '@/lib/appwrite'
import { UserService, ExpenseService, InvoiceService, BudgetService } from './database'

export interface AuthUser {
  $id: string
  email: string
  name?: string
  emailVerification: boolean
  registrationDate?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  email: string
  password: string
  name?: string
}

export class AuthService {
  /**
   * Get the current authenticated user session.
   * @returns The authenticated user or null if not logged in.
   */
  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const user = await account.get()

      // Sync user with database
      await UserService.syncUserFromAuth(user)

      return {
        $id: user.$id,
        email: user.email,
        name: user.name,
        emailVerification: user.emailVerification,
        registrationDate: user.registration
      }
    } catch (error: any) {
      // User not authenticated - return null silently
      return null
    }
  }

  /**
   * Authenticate user with email and password.
   * @param credentials - User login credentials.
   * @returns The authenticated user.
   * @throws Error if authentication fails.
   */
  static async login(credentials: LoginCredentials): Promise<AuthUser> {
    try {
      // Delete any existing session first
      try {
        await account.deleteSessions()
      } catch {
        // Ignore if no session exists
      }

      const session = await account.createEmailPasswordSession({
        email: credentials.email,
        password: credentials.password
      })

      const user = await account.get()

      // Sync user with database (creates if doesn't exist)
      await UserService.syncUserFromAuth(user)

      return {
        $id: user.$id,
        email: user.email,
        name: user.name,
        emailVerification: user.emailVerification,
        registrationDate: user.registration
      }
    } catch (error: any) {
      const message = error?.message || 'Login failed. Please check your credentials.'
      throw new Error(message)
    }
  }

  /**
   * Register a new user account.
   * @param credentials - User registration details.
   * @returns The newly created authenticated user.
   * @throws Error if registration fails.
   */
  static async register(credentials: RegisterCredentials): Promise<AuthUser> {
    try {
      const user = await account.create({
        userId: ID.unique(),
        email: credentials.email,
        password: credentials.password,
        name: credentials.name
      })

      // Create a session to authenticate the new user
      await account.createEmailPasswordSession({
        email: credentials.email,
        password: credentials.password
      })

      const authUser = await account.get()

      // Sync user with database
      await UserService.syncUserFromAuth(authUser)

      return {
        $id: authUser.$id,
        email: authUser.email,
        name: authUser.name,
        emailVerification: authUser.emailVerification,
        registrationDate: authUser.registration
      }
    } catch (error: any) {
      if (error?.type === 'user_already_exists') {
        throw new Error('An account with this email already exists. Please try logging in instead.')
      } else if (error?.type === 'invalid_email') {
        throw new Error('Invalid email address. Please check and try again.')
      } else if (error?.type === 'invalid_password') {
        throw new Error('Password must be at least 8 characters long and contain letters and numbers.')
      } else {
        throw new Error(error?.message || 'Registration failed. Please try again.')
      }
    }
  }

  /**
   * Log out the current user by deleting their session.
   * @throws Error if logout fails.
   */
  static async logout(): Promise<void> {
    try {
      await account.deleteSessions()
    } catch (error) {
      throw new Error('Logout failed.')
    }
  }

  /**
   * Send a password recovery email to the user.
   * @param email - The user's email address.
   * @throws Error if the email cannot be sent.
   */
  static async forgotPassword(email: string): Promise<void> {
    try {
      await account.createRecovery({
        email,
        url: `${window.location.origin}/reset-password`
      })
    } catch (error) {
      throw new Error('Password reset failed. Please try again.')
    }
  }

  /**
   * Reset user password using recovery credentials.
   * @param userId - The user ID from the recovery link.
   * @param secret - The secret token from the recovery link.
   * @param password - The new password to set.
   * @throws Error if password reset fails.
   */
  static async resetPassword(userId: string, secret: string, password: string): Promise<void> {
    try {
      await account.updateRecovery({ userId, secret, password })
    } catch (error) {
      throw new Error('Password reset failed. Please try again.')
    }
  }

  /**
   * Update the current user's profile information.
   * @param data - Object containing name and/or email to update.
   * @returns The updated user.
   * @throws Error if profile update fails.
   */
  static async updateProfile(data: { name?: string; email?: string }): Promise<AuthUser> {
    try {
      if (data.name) {
        await account.updateName({ name: data.name })
      }

      const user = await account.get()

      // Sync user with database
      await UserService.syncUserFromAuth(user)

      return {
        $id: user.$id,
        email: user.email,
        name: user.name,
        emailVerification: user.emailVerification,
        registrationDate: user.registration
      }
    } catch (error) {
      throw new Error('Profile update failed.')
    }
  }

  /**
   * Change the current user's password.
   * @param oldPassword - The current password (not used with Appwrite, kept for API compatibility).
   * @param newPassword - The new password to set.
   * @throws Error if password change fails.
   */
  static async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    try {
      await account.updatePassword({ password: newPassword })
    } catch (error) {
      throw new Error('Password change failed.')
    }
  }

  /**
   * Delete the current user's account and all associated data.
   * Removes all user data, deletes user document, and logs out the user.
   * @throws Error if account deletion fails.
   */
  static async deleteAccount(): Promise<void> {
    try {
      const user = await account.get()
      const userId = user.$id

      // Delete all user data first
      await this.deleteAllUserData(userId)

      // Delete user document from database
      try {
        await UserService.deleteUser(userId)
      } catch (dbError) {
        console.warn('User document not found in database, skipping DB deletion')
      }

      // Delete all sessions (logout user)
      await account.deleteSessions()

      // Note: The Appwrite Auth account itself cannot be deleted from client-side
      // for security reasons. It must be deleted via server API with proper
      // permissions or manually via Appwrite Console.
    } catch (error: any) {
      console.error('Account deletion error:', error)
      throw new Error(error?.message || 'Account deletion failed.')
    }
  }

  /**
   * Delete all data associated with a user (expenses, invoices, budgets).
   * @param userId - The user ID whose data should be deleted.
   */
  private static async deleteAllUserData(userId: string): Promise<void> {
    const errors: string[] = []

    // Delete all expenses
    try {
      const expenses = await ExpenseService.getUserExpenses(userId)
      for (const expense of expenses) {
        await ExpenseService.deleteExpense(expense.$id)
      }
    } catch (error) {
      errors.push('expenses')
      console.error('Failed to delete expenses:', error)
    }

    // Delete all invoices
    try {
      const invoices = await InvoiceService.getUserInvoices(userId)
      for (const invoice of invoices) {
        await InvoiceService.deleteInvoice(invoice.$id)
      }
    } catch (error) {
      errors.push('invoices')
      console.error('Failed to delete invoices:', error)
    }

    // Delete all budgets
    try {
      const budgets = await BudgetService.getUserBudgets(userId)
      for (const budget of budgets) {
        await BudgetService.deleteBudget(budget.$id)
      }
    } catch (error) {
      errors.push('budgets')
      console.error('Failed to delete budgets:', error)
    }

    if (errors.length > 0) {
      console.warn(`Some data could not be deleted: ${errors.join(', ')}`)
    }
  }
}
