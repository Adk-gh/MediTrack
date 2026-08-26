import { useState, useRef, useCallback } from 'react';
import { supabase } from '../supabase';

export const DOCUMENTS_BUCKET = 'health-documents';

export const ALLOWED_DOC_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

export const MAX_DOC_SIZE = 5 * 1024 * 1024; // 5MB

// Always resolve uid from the live Supabase session.
export const getActiveUid = async () => {
  try {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      console.error(
        '[Documents] Failed to get session:',
        sessionError.message
      );
      return null;
    }

    if (session?.user?.id) {
      return session.user.id;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.error(
        '[Documents] Failed to get user:',
        userError.message
      );
    }

    return user?.id || null;
  } catch (error) {
    console.error(
      '[Documents] getActiveUid error:',
      error
    );
    return null;
  }
};

/**
 * Shared Health Documents upload, delete, and view logic.
 *
 * @param {Array} documents
 * @param {(newDocuments: Array) => void} onDocumentsChange
 * @param {(message: string, type?: 'success'|'error') => void} notify
 */
export function useDocumentManager(
  documents,
  onDocumentsChange,
  notify
) {
  const [uploadingDocs, setUploadingDocs] =
    useState(false);

  const [docToDelete, setDocToDelete] =
    useState(null);

  const [isDeletingDoc, setIsDeletingDoc] =
    useState(false);

  const documentsInputRef = useRef(null);

  const say = useCallback(
    (message, type = 'success') => {
      if (notify) {
        notify(message, type);
      } else if (type === 'error') {
        alert(message);
      }
    },
    [notify]
  );

  /**
   * Accepts:
   * - File[]
   * - FileList
   * - file-input change event
   */
  const normalizeFiles = useCallback((source) => {
    if (!source) {
      return [];
    }

    if (Array.isArray(source)) {
      return source.filter(
        (item) => item instanceof File
      );
    }

    if (
      typeof FileList !== 'undefined' &&
      source instanceof FileList
    ) {
      return Array.from(source);
    }

    if (source?.target?.files) {
      return Array.from(source.target.files);
    }

    return [];
  }, []);

  const validateDocuments = useCallback((files) => {
    const invalid = files.find(
      (file) =>
        !ALLOWED_DOC_TYPES.includes(file.type) ||
        file.size > MAX_DOC_SIZE
    );

    if (!invalid) {
      return null;
    }

    if (
      !ALLOWED_DOC_TYPES.includes(invalid.type)
    ) {
      return `"${invalid.name}" has an unsupported file type. PDF, JPG, JPEG, and PNG only.`;
    }

    return `"${invalid.name}" exceeds the 5MB file-size limit.`;
  }, []);

  /**
   * Performs the actual Supabase upload.
   *
   * The modal should call this only after the user
   * clicks Save and confirms the upload.
   */
  const uploadDocuments = useCallback(
    async (source) => {
      const files = normalizeFiles(source);

      if (!files.length) {
        return false;
      }

      const validationMessage =
        validateDocuments(files);

      if (validationMessage) {
        say(validationMessage, 'error');
        return false;
      }

      setUploadingDocs(true);

      const uploadedPaths = [];

      try {
        const uid = await getActiveUid();

        if (!uid) {
          throw new Error('Not authenticated');
        }

        const uploadedDocs = [];

        for (const file of files) {
          const extension =
            file.name
              .split('.')
              .pop()
              ?.toLowerCase() || 'file';

          const storagePath =
            `${uid}/${crypto.randomUUID()}.${extension}`;

          const { error: uploadError } =
            await supabase.storage
              .from(DOCUMENTS_BUCKET)
              .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type,
              });

          if (uploadError) {
            throw uploadError;
          }

          uploadedPaths.push(storagePath);

          uploadedDocs.push({
            id: crypto.randomUUID(),
            name: file.name,
            path: storagePath,
            type: file.type,
            size: file.size,
            uploadedAt:
              new Date().toISOString(),
          });
        }

        const newDocuments = [
          ...(Array.isArray(documents)
            ? documents
            : []),
          ...uploadedDocs,
        ];

        const { error: updateError } =
          await supabase
            .from('users')
            .update({
              documents: newDocuments,
            })
            .eq('uid', uid);

        if (updateError) {
          throw updateError;
        }

        if (
          typeof onDocumentsChange ===
          'function'
        ) {
          onDocumentsChange(newDocuments);
        }

        say(
          'Document(s) uploaded successfully.'
        );

        return true;
      } catch (error) {
        console.error(
          '[Documents] Upload error:',
          error
        );

        // Remove partially uploaded files when
        // one upload or database update fails.
        if (uploadedPaths.length > 0) {
          const { error: cleanupError } =
            await supabase.storage
              .from(DOCUMENTS_BUCKET)
              .remove(uploadedPaths);

          if (cleanupError) {
            console.error(
              '[Documents] Upload cleanup failed:',
              cleanupError
            );
          }
        }

        say(
          error?.message ||
            'Failed to upload document(s).',
          'error'
        );

        return false;
      } finally {
        setUploadingDocs(false);
      }
    },
    [
      documents,
      normalizeFiles,
      onDocumentsChange,
      say,
      validateDocuments,
    ]
  );

  /**
   * Backward-compatible direct file-input handler.
   *
   * Do not use this inside the new modal because it
   * immediately uploads after file selection.
   */
  const handleDocumentUpload = useCallback(
    async (event) => {
      const files = Array.from(
        event?.target?.files || []
      );

      if (event?.target) {
        event.target.value = '';
      }

      return uploadDocuments(files);
    },
    [uploadDocuments]
  );

  const confirmDeleteDocument =
    useCallback(async () => {
      if (!docToDelete) {
        return;
      }

      setIsDeletingDoc(true);

      try {
        const uid = await getActiveUid();

        if (!uid) {
          throw new Error(
            'Not authenticated'
          );
        }

        if (docToDelete.path) {
          const { error: storageError } =
            await supabase.storage
              .from(DOCUMENTS_BUCKET)
              .remove([docToDelete.path]);

          if (storageError) {
            throw storageError;
          }
        }

        const newDocuments = (
          Array.isArray(documents)
            ? documents
            : []
        ).filter(
          (document) =>
            document.id !== docToDelete.id
        );

        const { error: updateError } =
          await supabase
            .from('users')
            .update({
              documents: newDocuments,
            })
            .eq('uid', uid);

        if (updateError) {
          throw updateError;
        }

        if (
          typeof onDocumentsChange ===
          'function'
        ) {
          onDocumentsChange(newDocuments);
        }

        say('Document removed.');

        setDocToDelete(null);
      } catch (error) {
        console.error(
          '[Documents] Delete error:',
          error
        );

        say(
          error?.message ||
            'Failed to remove document.',
          'error'
        );
      } finally {
        setIsDeletingDoc(false);
      }
    }, [
      docToDelete,
      documents,
      onDocumentsChange,
      say,
    ]);

  /**
   * Generates a temporary URL for an already-uploaded
   * private Supabase Storage document.
   */
  const getSignedUrl = useCallback(
    async (document, expiresIn = 300) => {
      if (
        document?.url &&
        !document?.path
      ) {
        return document.url;
      }

      if (!document?.path) {
        throw new Error(
          'Document path is missing.'
        );
      }

      const { data, error } =
        await supabase.storage
          .from(DOCUMENTS_BUCKET)
          .createSignedUrl(
            document.path,
            expiresIn
          );

      if (error) {
        console.error(
          '[Documents] Failed to create signed URL:',
          error
        );

        throw error;
      }

      if (!data?.signedUrl) {
        throw new Error(
          'No signed URL was returned.'
        );
      }

      return data.signedUrl;
    },
    []
  );

  return {
    uploadingDocs,

    docToDelete,
    setDocToDelete,
    isDeletingDoc,

    documentsInputRef,

    uploadDocuments,

    // Keep this only for older components.
    handleDocumentUpload,

    confirmDeleteDocument,
    getSignedUrl,
  };
}