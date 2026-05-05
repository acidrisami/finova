/**
 * Custom hook for form handling with validation
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface FormField {
  value: string;
  error?: string;
  touched: boolean;
}

interface FormState<T extends Record<string, any>> {
  fields: Record<keyof T, FormField>;
  isValid: boolean;
  isSubmitting: boolean;
}

interface UseFormOptions<T extends Record<string, any>> {
  initialValues: T;
  validators?: Partial<Record<keyof T, (value: any) => { isValid: boolean; error?: string }>>;
  onSubmit: (values: T) => Promise<void> | void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validators = {},
  onSubmit,
  onSuccess,
  onError
}: UseFormOptions<T>) {
  const { toast } = useToast();

  const [formState, setFormState] = useState<FormState<T>>({
    fields: Object.keys(initialValues).reduce((acc, key) => {
      acc[key as keyof T] = {
        value: initialValues[key as keyof T],
        touched: false
      };
      return acc;
    }, {} as Record<keyof T, FormField>),
    isValid: true,
    isSubmitting: false
  });

  const validateField = useCallback((field: keyof T, value: any): string | undefined => {
    const validator = validators[field];
    if (!validator) return undefined;

    const result = validator(value);
    return result.isValid ? undefined : result.error;
  }, [validators]);

  const validateForm = useCallback((fields: Record<keyof T, FormField>): boolean => {
    let isValid = true;
    const newFields = { ...fields };

    // Validate all fields
    for (const [key, field] of Object.entries(newFields)) {
      const error = validateField(key as keyof T, field.value);
      if (error) {
        newFields[key as keyof T] = { ...field, error };
        isValid = false;
      }
    }

    setFormState(prev => ({ ...prev, fields: newFields, isValid }));
    return isValid;
  }, [validateField]);

  const setFieldValue = useCallback((field: keyof T, value: T[keyof T]) => {
    const error = validateField(field, value);

    setFormState(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [field]: {
          value,
          error,
          touched: true
        }
      }
    }));
  }, [validateField]);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setFormState(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [field]: {
          ...prev.fields[field],
          error
        }
      }
    }));
  }, []);

  const touchField = useCallback((field: keyof T) => {
    setFormState(prev => ({
      ...prev,
      fields: {
        ...prev.fields,
        [field]: {
          ...prev.fields[field],
          touched: true
        }
      }
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState({
      fields: Object.keys(initialValues).reduce((acc, key) => {
        acc[key as keyof T] = {
          value: initialValues[key as keyof T],
          touched: false
        };
        return acc;
      }, {} as Record<keyof T, FormField>),
      isValid: true,
      isSubmitting: false
    });
  }, [initialValues]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    // Validate form
    const isValid = validateForm(formState.fields);
    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form",
        variant: "destructive"
      });
      return;
    }

    // Extract values from form state
    const values = Object.keys(formState.fields).reduce((acc, key) => {
      acc[key as keyof T] = formState.fields[key as keyof T].value;
      return acc;
    }, {} as T);

    setFormState(prev => ({ ...prev, isSubmitting: true }));

    try {
      await onSubmit(values);
      onSuccess?.();
      resetForm();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      onError?.(error instanceof Error ? error : new Error(errorMessage));
    } finally {
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [formState.fields, validateForm, onSubmit, onSuccess, onError, toast, resetForm]);

  const getFieldProps = useCallback((field: keyof T) => ({
    value: formState.fields[field].value,
    onChange: (value: any) => setFieldValue(field, value),
    onBlur: () => touchField(field),
    error: formState.fields[field].touched ? formState.fields[field].error : undefined,
    touched: formState.fields[field].touched
  }), [formState.fields, setFieldValue, touchField]);

  const values = Object.keys(formState.fields).reduce((acc, key) => {
    acc[key as keyof T] = formState.fields[key as keyof T].value;
    return acc;
  }, {} as T);

  const errors = Object.keys(formState.fields).reduce((acc, key) => {
    const error = formState.fields[key as keyof T].error;
    if (error) {
      acc[key as keyof T] = error;
    }
    return acc;
  }, {} as Partial<Record<keyof T, string>>);

  const isDirty = Object.keys(formState.fields).some(
    key => formState.fields[key as keyof T].touched
  );

  return {
    values,
    errors,
    isDirty,
    isValid: formState.isValid,
    isSubmitting: formState.isSubmitting,
    setFieldValue,
    setFieldError,
    touchField,
    resetForm,
    handleSubmit,
    getFieldProps
  };
}
