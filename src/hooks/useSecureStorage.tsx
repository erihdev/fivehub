import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Default expiration time for signed URLs (1 hour)
const DEFAULT_EXPIRY_SECONDS = 3600;

export interface SecureStorageHook {
  uploadFile: (bucket: string, path: string, file: File | Blob, options?: { upsert?: boolean }) => Promise<{ path: string; error: Error | null }>;
  getSignedUrl: (bucket: string, path: string, expirySeconds?: number) => Promise<string | null>;
  getSignedUrls: (bucket: string, paths: string[], expirySeconds?: number) => Promise<(string | null)[]>;
  deleteFile: (bucket: string, path: string) => Promise<{ error: Error | null }>;
}

/**
 * Hook for secure storage operations using signed URLs instead of public URLs.
 * This prevents direct public access to storage files and requires authentication.
 */
export const useSecureStorage = (): SecureStorageHook => {
  /**
   * Upload a file to storage and return the file path (not public URL)
   */
  const uploadFile = useCallback(async (
    bucket: string,
    path: string,
    file: File | Blob,
    options?: { upsert?: boolean }
  ): Promise<{ path: string; error: Error | null }> => {
    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, options);

      if (uploadError) {
        return { path: '', error: uploadError };
      }

      return { path, error: null };
    } catch (error) {
      return { path: '', error: error as Error };
    }
  }, []);

  /**
   * Get a signed URL for a file with expiration
   */
  const getSignedUrl = useCallback(async (
    bucket: string,
    path: string,
    expirySeconds: number = DEFAULT_EXPIRY_SECONDS
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, expirySeconds);

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error creating signed URL:', error);
      return null;
    }
  }, []);

  /**
   * Get multiple signed URLs at once
   */
  const getSignedUrls = useCallback(async (
    bucket: string,
    paths: string[],
    expirySeconds: number = DEFAULT_EXPIRY_SECONDS
  ): Promise<(string | null)[]> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(paths, expirySeconds);

      if (error) {
        console.error('Error creating signed URLs:', error);
        return paths.map(() => null);
      }

      return data.map(item => item.signedUrl);
    } catch (error) {
      console.error('Error creating signed URLs:', error);
      return paths.map(() => null);
    }
  }, []);

  /**
   * Delete a file from storage
   */
  const deleteFile = useCallback(async (
    bucket: string,
    path: string
  ): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  }, []);

  return {
    uploadFile,
    getSignedUrl,
    getSignedUrls,
    deleteFile
  };
};

/**
 * Extract the file path from a public URL
 * This is useful for migrating from public URLs to signed URLs
 */
export const extractPathFromPublicUrl = (publicUrl: string, bucket: string): string | null => {
  try {
    // Public URLs typically look like: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
    const regex = new RegExp(`/storage/v1/object/public/${bucket}/(.+)$`);
    const match = publicUrl.match(regex);
    return match ? match[1] : null;
  } catch {
    return null;
  }
};

/**
 * Check if a URL is a public Supabase storage URL
 */
export const isPublicStorageUrl = (url: string): boolean => {
  return url.includes('/storage/v1/object/public/');
};

/**
 * Check if a URL is a signed Supabase storage URL
 */
export const isSignedStorageUrl = (url: string): boolean => {
  return url.includes('/storage/v1/object/sign/') || url.includes('token=');
};
