/**
 * Validation utilities for the Finova application
 */

import { ALLOWED_DOMAINS, VALIDATION, ERROR_MESSAGES } from '@/constants';

/**
 * Validate email format and domain
 */
export function validateEmail(email: string): { isValid: boolean; error?: string } {
  if (!email) {
    return { isValid: false, error: ERROR_MESSAGES.FORM.REQUIRED_FIELD };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: ERROR_MESSAGES.FORM.INVALID_EMAIL };
  }

  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain || !ALLOWED_DOMAINS.includes(domain as any)) {
    return { isValid: false, error: ERROR_MESSAGES.AUTH.INVALID_DOMAIN };
  }

  return { isValid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password) {
    return { isValid: false, error: ERROR_MESSAGES.FORM.REQUIRED_FIELD };
  }

  if (password.length < 6) {
    return { isValid: false, error: ERROR_MESSAGES.AUTH.WEAK_PASSWORD };
  }

  return { isValid: true };
}

/**
 * Validate amount input
 */
export function validateAmount(amount: string): { isValid: boolean; error?: string; value?: number } {
  if (!amount) {
    return { isValid: false, error: ERROR_MESSAGES.FORM.REQUIRED_FIELD };
  }

  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return { isValid: false, error: ERROR_MESSAGES.FORM.INVALID_AMOUNT };
  }

  if (numAmount < VALIDATION.MIN_AMOUNT) {
    return { isValid: false, error: ERROR_MESSAGES.FORM.INVALID_AMOUNT };
  }

  if (numAmount > VALIDATION.MAX_AMOUNT) {
    return { isValid: false, error: ERROR_MESSAGES.FORM.INVALID_AMOUNT };
  }

  return { isValid: true, value: numAmount };
}

/**
 * Validate text input with length constraints
 */
export function validateTextInput(
  text: string, 
  minLength: number, 
  maxLength: number,
  fieldName: string
): { isValid: boolean; error?: string } {
  if (!text) {
    return { isValid: false, error: ERROR_MESSAGES.FORM.REQUIRED_FIELD };
  }

  if (text.length < minLength) {
    return { 
      isValid: false, 
      error: `${fieldName} ${ERROR_MESSAGES.FORM.MIN_LENGTH(minLength)}` 
    };
  }

  if (text.length > maxLength) {
    return { 
      isValid: false, 
      error: `${fieldName} ${ERROR_MESSAGES.FORM.MAX_LENGTH(maxLength)}` 
    };
  }

  return { isValid: true };
}

/**
 * Validate income source
 */
export function validateIncomeSource(source: string): { isValid: boolean; error?: string } {
  return validateTextInput(
    source, 
    VALIDATION.MIN_SOURCE_LENGTH, 
    VALIDATION.MAX_SOURCE_LENGTH,
    'Income source'
  );
}

/**
 * Validate transaction description
 */
export function validateDescription(description: string): { isValid: boolean; error?: string } {
  return validateTextInput(
    description, 
    VALIDATION.MIN_DESCRIPTION_LENGTH, 
    VALIDATION.MAX_DESCRIPTION_LENGTH,
    'Description'
  );
}

/**
 * Validate client name for invoices
 */
export function validateClientName(clientName: string): { isValid: boolean; error?: string } {
  return validateTextInput(
    clientName, 
    VALIDATION.MIN_DESCRIPTION_LENGTH, 
    VALIDATION.MAX_DESCRIPTION_LENGTH,
    'Client name'
  );
}

/**
 * Validate form data object
 */
export function validateFormData<T extends Record<string, any>>(
  data: T,
  validators: Record<keyof T, (value: any) => { isValid: boolean; error?: string }>
): { isValid: boolean; errors: Partial<Record<keyof T, string>> } {
  const errors: Partial<Record<keyof T, string>> = {};
  let isValid = true;

  for (const [field, validator] of Object.entries(validators)) {
    const result = validator(data[field]);
    if (!result.isValid) {
      errors[field as keyof T] = result.error;
      isValid = false;
    }
  }

  return { isValid, errors };
}
