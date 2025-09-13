import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, Upload, FileText, Image } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InsertDocument } from "@shared/schema";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  objectPath: string;
  documentId?: number; // Database ID if record was created
}

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  acceptedFileTypes?: string[];
  onFilesUploaded?: (files: UploadedFile[]) => void;
  buttonClassName?: string;
  children: ReactNode;
  uploadType?: "image" | "document";
  documentType?: string; // Required for database record creation
  description?: string; // Optional description for all uploaded files
  expiryDate?: string; // Optional expiry date for all uploaded files
  createDatabaseRecord?: boolean; // Whether to create database records (default: true)
}

/**
 * A file upload component that handles direct uploads to object storage
 * 
 * Features:
 * - Drag and drop file selection
 * - Progress tracking for uploads
 * - File type validation
 * - File size validation
 * - Multiple file support
 * 
 * @param props - Component props
 * @param props.maxNumberOfFiles - Maximum number of files allowed (default: 5)
 * @param props.maxFileSize - Maximum file size in bytes (default: 10MB)
 * @param props.acceptedFileTypes - Array of accepted MIME types
 * @param props.onFilesUploaded - Callback when files are uploaded successfully
 * @param props.buttonClassName - Optional CSS class for the button
 * @param props.children - Content rendered inside the button
 * @param props.uploadType - Type of upload for default file type filtering
 * @param props.documentType - Document type for database record (required if createDatabaseRecord is true)
 * @param props.description - Optional description for uploaded files
 * @param props.expiryDate - Optional expiry date for uploaded files
 * @param props.createDatabaseRecord - Whether to create database records (default: true)
 */
export function ObjectUploader({
  maxNumberOfFiles = 5,
  maxFileSize = 10485760, // 10MB default
  acceptedFileTypes,
  onFilesUploaded,
  buttonClassName,
  children,
  uploadType = "document",
  documentType,
  description,
  expiryDate,
  createDatabaseRecord = true,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Default file types based on upload type
  const defaultImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const defaultDocumentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/jpeg",
    "image/png"
  ];

  const allowedTypes = acceptedFileTypes || 
    (uploadType === "image" ? defaultImageTypes : defaultDocumentTypes);

  const handleFileSelection = useCallback((files: FileList | null) => {
    if (!files) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];

    for (const file of fileArray) {
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not an accepted file type.`,
          variant: "destructive",
        });
        continue;
      }

      // Check file size
      if (file.size > maxFileSize) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than ${Math.round(maxFileSize / 1024 / 1024)}MB.`,
          variant: "destructive",
        });
        continue;
      }

      validFiles.push(file);
    }

    // Check total number of files
    if (selectedFiles.length + validFiles.length > maxNumberOfFiles) {
      toast({
        title: "Too many files",
        description: `You can only upload up to ${maxNumberOfFiles} files.`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles(prev => [...prev, ...validFiles]);
  }, [allowedTypes, maxFileSize, maxNumberOfFiles, selectedFiles.length]);

  const removeFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  const uploadFiles = useCallback(async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploaded: UploadedFile[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        
        console.log(`[OBJECT_UPLOADER] Starting server-side upload for ${file.name}`);
        
        // Create FormData for server-side upload  
        const formData = new FormData();
        formData.append('file', file);
        
        console.log('[OBJECT_UPLOADER] Uploading via server...');
        const uploadResponse = await fetch('/api/objects/upload', {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (!uploadResponse.ok) {
          console.error('[OBJECT_UPLOADER] Server upload failed:', uploadResponse.status, uploadResponse.statusText);
          const errorText = await uploadResponse.text();
          console.error('[OBJECT_UPLOADER] Server response:', errorText);
          throw new Error(`Failed to upload ${file.name}: ${uploadResponse.status} ${uploadResponse.statusText}`);
        }
        
        const uploadResult = await uploadResponse.json();
        console.log('[OBJECT_UPLOADER] Server upload successful:', uploadResult);
        
        const { objectPath, objectURL } = uploadResult;

        let documentId: number | undefined;

        // Create database record if requested
        if (createDatabaseRecord) {
          if (!documentType) {
            throw new Error('documentType is required when createDatabaseRecord is true');
          }

          try {
            const documentData: InsertDocument = {
              fileName: file.name,
              originalName: file.name,
              fileSize: file.size,
              mimeType: file.type,
              objectPath: objectPath,
              documentType: documentType,
              description: description || undefined,
              expiryDate: expiryDate ? new Date(expiryDate) : undefined,
            };

            console.log(`[OBJECT_UPLOADER] Creating database record for ${file.name}:`, documentData);
            const dbResponse = await apiRequest("POST", "/api/documents", documentData);
            const dbResult = await dbResponse.json();
            documentId = dbResult.id;
            console.log(`[OBJECT_UPLOADER] Database record created with ID: ${documentId}`);
          } catch (dbError) {
            console.error(`[OBJECT_UPLOADER] Failed to create database record for ${file.name}:`, dbError);
            toast({
              title: "Warning: File uploaded but not recorded",
              description: `${file.name} was uploaded to storage but failed to create database record. You may need to re-upload.`,
              variant: "destructive",
            });
            // Continue with the upload process, but don't include this file in the success list
            setUploadProgress(((i + 1) / selectedFiles.length) * 100);
            continue;
          }
        }

        uploaded.push({
          id: crypto.randomUUID(),
          name: file.name,
          size: file.size,
          type: file.type,
          url: uploadURL.split('?')[0],
          objectPath,
          documentId,
        });

        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }

      setUploadedFiles(prev => [...prev, ...uploaded]);
      setSelectedFiles([]);
      onFilesUploaded?.(uploaded);

      // Invalidate queries to refresh document lists
      if (createDatabaseRecord && uploaded.length > 0) {
        queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      }

      toast({
        title: "Upload successful",
        description: createDatabaseRecord 
          ? `${uploaded.length} file(s) uploaded and recorded successfully.`
          : `${uploaded.length} file(s) uploaded successfully.`,
      });

    } catch (error) {
      console.error('[OBJECT_UPLOADER] Upload error details:', error);
      console.error('[OBJECT_UPLOADER] Error type:', typeof error);
      console.error('[OBJECT_UPLOADER] Error constructor:', error?.constructor?.name);
      
      if (error instanceof Error) {
        console.error('[OBJECT_UPLOADER] Error message:', error.message);
        console.error('[OBJECT_UPLOADER] Error stack:', error.stack);
      }
      
      // Check for common fetch errors
      let errorMessage = "Failed to upload files";
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = "Network request failed. This could be a CORS issue or connectivity problem.";
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Upload failed", 
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [selectedFiles, onFilesUploaded, createDatabaseRecord, documentType, description, expiryDate]);

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <Image className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <input
          type="file"
          multiple
          accept={allowedTypes.join(',')}
          onChange={(e) => handleFileSelection(e.target.files)}
          className="hidden"
          id="file-upload"
        />
        
        <label htmlFor="file-upload">
          <Button
            type="button"
            variant="outline"
            className={buttonClassName}
            disabled={isUploading}
            asChild
          >
            <div className="cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {children}
            </div>
          </Button>
        </label>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selected Files:</h4>
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 border rounded">
                <div className="flex items-center gap-2">
                  {getFileIcon(file.type)}
                  <span className="text-sm truncate">{file.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(file.size / 1024)}KB
                  </Badge>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index)}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            
            <Button
              type="button"
              onClick={uploadFiles}
              disabled={isUploading}
              className="w-full"
            >
              {isUploading ? "Uploading..." : `Upload ${selectedFiles.length} file(s)`}
            </Button>
            
            {isUploading && (
              <Progress value={uploadProgress} className="w-full" />
            )}
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Uploaded Files:</h4>
            {uploadedFiles.map((file) => (
              <div key={file.id} className="flex items-center gap-2 p-2 border rounded bg-green-50">
                {getFileIcon(file.type)}
                <span className="text-sm truncate">{file.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {Math.round(file.size / 1024)}KB
                </Badge>
                <Badge variant="default" className="text-xs ml-auto">
                  Uploaded
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}