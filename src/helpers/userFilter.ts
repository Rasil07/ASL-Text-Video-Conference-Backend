import { UserDocument, UserJwtPayload } from "../models/user";

export class UserFilter {
  /**
   * Filter sensitive data from a single user document
   * @param user - The user document from database
   * @returns User object without sensitive data
   */
  static filterUser(user: UserDocument): UserJwtPayload {
    if (!user) return null as any;

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };
  }

  /**
   * Filter sensitive data from an array of user documents
   * @param users - Array of user documents from database
   * @returns Array of user objects without sensitive data
   */
  static filterUsers(users: UserDocument[]): UserJwtPayload[] {
    if (!users || !Array.isArray(users)) return [];

    return users.map((user) => this.filterUser(user));
  }

  /**
   * Filter sensitive data and include additional fields
   * @param user - The user document from database
   * @param additionalFields - Additional fields to include (e.g., timestamps)
   * @returns User object with specified fields
   */
  static filterUserWithFields(
    user: UserDocument,
    additionalFields: (keyof UserDocument)[] = []
  ): Partial<UserJwtPayload> & Record<string, any> {
    if (!user) return null as any;

    const filteredUser: any = this.filterUser(user);

    // Add additional fields if they exist
    additionalFields.forEach((field) => {
      if (user[field] !== undefined) {
        filteredUser[field] = user[field];
      }
    });

    return filteredUser;
  }

  /**
   * Filter sensitive data and include timestamps
   * @param user - The user document from database
   * @returns User object with timestamps
   */
  static filterUserWithTimestamps(user: UserDocument): UserJwtPayload & {
    created_at: Date;
    updated_at: Date;
  } {
    if (!user) return null as any;

    return {
      ...this.filterUser(user),
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  /**
   * Filter sensitive data and include only specified fields
   * @param user - The user document from database
   * @param fields - Array of field names to include
   * @returns User object with only specified fields
   */
  static filterUserFields(
    user: UserDocument,
    fields: (keyof UserJwtPayload)[]
  ): Partial<UserJwtPayload> {
    if (!user) return null as any;

    const filteredUser: Partial<UserJwtPayload> = {};

    fields.forEach((field) => {
      if (field === "id") {
        filteredUser.id = user._id.toString();
      } else if (user[field] !== undefined) {
        filteredUser[field] = user[field];
      }
    });

    return filteredUser;
  }

  /**
   * Check if a field is sensitive and should be filtered
   * @param field - Field name to check
   * @returns True if field is sensitive
   */
  static isSensitiveField(field: string): boolean {
    const sensitiveFields = [
      "password",
      "passwordHash",
      "resetPasswordToken",
      "resetPasswordExpires",
      "emailVerificationToken",
      "emailVerificationExpires",
      "twoFactorSecret",
      "refreshToken",
      "apiKey",
      "secretKey",
    ];

    return sensitiveFields.includes(field);
  }

  /**
   * Get a safe user object for public display (minimal info)
   * @param user - The user document from database
   * @returns Minimal user object for public display
   */
  static getPublicUser(user: UserDocument): { id: string; name: string } {
    if (!user) return null as any;

    return {
      id: user._id.toString(),
      name: user.name,
    };
  }
}
