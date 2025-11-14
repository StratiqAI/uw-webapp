  // src/lib/types/auth.ts

  // Represents the authenticated user and their claims
  export type CurrentUser = {
      isAuthenticated: boolean;         // Whether the user is authenticated
      idToken?: string;                 // Cognito ID token for API authentication
      sub: string;                      // Cognito user unique identifier (subject) - REQUIRED
      username?: string;                // Username (may be Cognito or preferred username)
      email?: string;                   // User's email address
      emailVerified?: boolean;          // Whether the email is verified
      phoneNumber?: string;             // User's phone number
      phoneNumberVerified?: boolean;    // Whether the phone number is verified
      givenName?: string;               // User's given (first) name
      familyName?: string;              // User's family (last) name
      name?: string;                    // User's full name
      preferredUsername?: string;       // User's preferred username
      pictureUrl?: string;              // URL to user's profile picture
      groups?: string[];                // Cognito groups the user belongs to
      tenant: string;                   // Tenant ID (multi-tenancy) - REQUIRED, defaults to 'default'
      locale?: string;                  // User's locale (language/country)
      timezone?: string;                // User's timezone
      amr?: string[];                   // Authentication Methods References
      exp?: number;                     // Token expiration time (epoch seconds)
      iat?: number;                     // Token issued at time (epoch seconds)
  };